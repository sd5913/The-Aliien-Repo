-- Run in one connection. All users, credentials, polls, and votes roll back.
begin;
create temporary table permission_test_state as
select gen_random_uuid() as owner_a, gen_random_uuid() as owner_b,
  gen_random_uuid() as poll_a, gen_random_uuid() as poll_b,
  gen_random_uuid() as option_a, gen_random_uuid() as option_b,
  gen_random_uuid() as option_c, gen_random_uuid() as option_d,
  null::uuid as participant_a, null::uuid as participant_b;
create temporary table permission_test_results(name text primary key);
grant select,update on permission_test_state to anon,authenticated;
grant select,insert on permission_test_results to anon,authenticated;
insert into auth.users(id,aud,role,email,is_anonymous)
  select owner_a,'authenticated','authenticated',owner_a::text||'@example.invalid',false from permission_test_state
  union all select owner_b,'authenticated','authenticated',owner_b::text||'@example.invalid',false from permission_test_state;

set local role anon;
do $$ begin
  begin perform public.save_poll('{}'); raise exception 'anonymous create unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  begin insert into public.polls(title) values('forbidden'); raise exception 'raw insert unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  begin perform count(*) from private.soft_participants; raise exception 'credential read unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  insert into pg_temp.permission_test_results values('anonymous_management_and_credential_read_denied');
end $$;
do $$ begin
  begin perform public.register_participant(repeat('a',64)); raise exception 'guest identity creation allowed';
  exception when insufficient_privilege then null; end;
  insert into pg_temp.permission_test_results values('guest_identity_registration_denied');
end $$;

reset role;
update pg_temp.permission_test_state set participant_a=owner_b,participant_b=owner_a;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_a,'role','authenticated','is_anonymous',false)::text,true) from permission_test_state;
set local role authenticated;
select public.save_poll(jsonb_build_object('id',poll_a,'title','Permission test A','status','open','isPublic',true,
  'creatorId',owner_b,'options',jsonb_build_array(jsonb_build_object('id',option_a,'name','A'),jsonb_build_object('id',option_b,'name','B'))))
  from pg_temp.permission_test_state;
select public.save_poll(jsonb_build_object('id',poll_b,'title','Permission test B','status','open',
  'options',jsonb_build_array(jsonb_build_object('id',option_c,'name','C'),jsonb_build_object('id',option_d,'name','D'))))
  from pg_temp.permission_test_state;
do $$ begin
  assert (select p.owner_id=s.owner_a from public.polls p cross join pg_temp.permission_test_state s where p.id=s.poll_a), 'owner must come from JWT, not payload';
  assert (select count(*) from public.poll_options where poll_id=(select poll_a from pg_temp.permission_test_state))=2;
  insert into pg_temp.permission_test_results values('account_creates_atomic_poll_with_server_assigned_owner');
end $$;

do $$ declare s record; begin
  select * into s from pg_temp.permission_test_state;
  begin perform public.submit_vote(s.poll_a,s.owner_a,'',jsonb_build_array(s.option_a));
    raise exception 'poll owner vote unexpectedly allowed'; exception when insufficient_privilege then null; end;
  insert into pg_temp.permission_test_results values('poll_owner_cannot_vote');
end $$;

reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_b,'role','authenticated','is_anonymous',false)::text,true) from permission_test_state;
set local role authenticated;
do $$ declare s record; begin
  select * into s from pg_temp.permission_test_state;
  begin perform public.delete_poll(s.poll_a); raise exception 'foreign delete unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  begin perform public.close_poll(s.poll_a); raise exception 'foreign close unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  begin perform public.save_poll(jsonb_build_object('id',s.poll_a,'title','hijack','status','open','options',
    jsonb_build_array(jsonb_build_object('id',s.option_a,'name','A'),jsonb_build_object('id',s.option_b,'name','B'))));
    raise exception 'foreign edit unexpectedly allowed'; exception when insufficient_privilege then null; end;
  begin update public.polls set owner_id=s.owner_b where id=s.poll_a; raise exception 'raw owner reassignment unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  insert into pg_temp.permission_test_results values('other_account_cannot_edit_close_delete_or_reassign_owner');
end $$;

reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_b,'role','authenticated')::text,true) from permission_test_state;
set local role authenticated;
select public.submit_vote(poll_a,participant_a,repeat('a',64),jsonb_build_array(option_a)) from pg_temp.permission_test_state;
select public.submit_vote(poll_a,participant_a,repeat('a',64),jsonb_build_array(option_b)) from pg_temp.permission_test_state;
do $$ declare s record; begin
  select * into s from pg_temp.permission_test_state;
  assert (select count(*) from public.votes where poll_id=s.poll_a and voter_id=s.participant_a::text)=1;
  assert (select ranking->>0 from public.votes where poll_id=s.poll_a and voter_id=s.participant_a::text)=s.option_b::text;
  begin perform public.submit_vote(s.poll_a,s.participant_b,repeat('b',64),jsonb_build_array(s.option_a));
    raise exception 'impersonation unexpectedly allowed'; exception when insufficient_privilege then null; end;
  begin insert into public.votes(poll_id,voter_id,ranking) values(s.poll_a,s.participant_a::text,jsonb_build_array(s.option_a));
    raise exception 'raw vote unexpectedly allowed'; exception when insufficient_privilege then null; end;
  begin perform public.submit_vote(s.poll_a,s.participant_a,repeat('a',64),jsonb_build_array(s.option_c));
    raise exception 'foreign option unexpectedly allowed'; exception when invalid_parameter_value then null; end;
  begin perform public.submit_vote(s.poll_a,s.participant_a,repeat('a',64),jsonb_build_array(s.option_a,s.option_b));
    raise exception 'multiple selection unexpectedly allowed'; exception when invalid_parameter_value then null; end;
  begin perform public.submit_vote(s.poll_a,s.participant_a,repeat('a',64),'[]');
    raise exception 'empty selection unexpectedly allowed'; exception when invalid_parameter_value then null; end;
  insert into pg_temp.permission_test_results values('own_vote_upsert_only_single_valid_option_and_account_required');
end $$;

reset role;
update public.polls set closed_at=clock_timestamp()-interval '1 second' where id=(select poll_b from permission_test_state);
set local role authenticated;
do $$ declare s record; begin
  select * into s from pg_temp.permission_test_state;
  begin perform public.submit_vote(s.poll_b,s.participant_a,repeat('a',64),jsonb_build_array(s.option_c));
    raise exception 'expired vote unexpectedly allowed'; exception when invalid_parameter_value then null; end;
  insert into pg_temp.permission_test_results values('server_rejects_expired_votes');
end $$;

reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_a,'role','authenticated','is_anonymous',false)::text,true) from permission_test_state;
set local role authenticated;
do $$ declare s record; begin
  select * into s from pg_temp.permission_test_state;
  -- A failed option substitution must roll back the title update too.
  begin perform public.save_poll(jsonb_build_object('id',s.poll_a,'title','must roll back','status','open','options',
    jsonb_build_array(jsonb_build_object('id',s.option_c,'name','stolen'),jsonb_build_object('id',s.option_b,'name','B'))));
    raise exception 'option theft unexpectedly allowed'; exception when insufficient_privilege then null; end;
  assert (select title from public.polls where id=s.poll_a)='Permission test A';
  perform public.close_poll(s.poll_a);
  begin perform public.save_poll(jsonb_build_object('id',s.poll_a,'title','reopen','status','open','options',
    jsonb_build_array(jsonb_build_object('id',s.option_a,'name','A'),jsonb_build_object('id',s.option_b,'name','B'))));
    raise exception 'closed edit unexpectedly allowed'; exception when invalid_parameter_value then null; end;
  insert into pg_temp.permission_test_results values('atomic_edit_rollback_owner_close_and_closed_edit_denial');
end $$;

reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_b,'role','authenticated')::text,true) from permission_test_state;
set local role authenticated;
do $$ declare s record; begin
  select * into s from pg_temp.permission_test_state;
  begin perform public.submit_vote(s.poll_a,s.participant_a,repeat('a',64),jsonb_build_array(s.option_a));
    raise exception 'closed vote unexpectedly allowed'; exception when invalid_parameter_value then null; end;
  assert (select count(*) from public.polls where id=s.poll_a)=1, 'public results must remain visible';
  assert (select count(*) from public.votes where poll_id=s.poll_a and voter_id=s.participant_a::text)=1;
  insert into pg_temp.permission_test_results values('closed_vote_updates_and_inserts_denied_results_still_visible');
end $$;

reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_a,'role','authenticated','is_anonymous',false)::text,true) from permission_test_state;
set local role authenticated;
select public.delete_poll(poll_a) from pg_temp.permission_test_state;
do $$ declare s record; begin
  select * into s from pg_temp.permission_test_state;
  assert not exists(select 1 from public.polls where id=s.poll_a);
  assert not exists(select 1 from public.poll_options where poll_id=s.poll_a);
  assert not exists(select 1 from public.votes where poll_id=s.poll_a);
  insert into pg_temp.permission_test_results values('owner_delete_cascades_options_and_votes');
end $$;
reset role;
-- Capture output before rollback when using psql. MCP may only return the last
-- result, so the test runner can wrap this file and select results after rollback.
select jsonb_agg(name order by name) as passed from permission_test_results;
rollback;
