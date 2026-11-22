begin;
create temporary table comment_test_state as select gen_random_uuid() as owner_id,
  gen_random_uuid() as poll_id,gen_random_uuid() as option_a,gen_random_uuid() as option_b,
  gen_random_uuid() as participant_a,gen_random_uuid() as participant_b;
grant select,update on comment_test_state to anon,authenticated;
insert into auth.users(id,aud,role,email,is_anonymous)
select id,'authenticated','authenticated',id::text||'@example.invalid',false from comment_test_state s cross join lateral unnest(array[s.owner_id,s.participant_a,s.participant_b]) id;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true) from comment_test_state;
set local role authenticated;
select public.save_poll(jsonb_build_object('id',poll_id,'title','Comment privacy test','status','open','isPublic',true,'options',
  jsonb_build_array(jsonb_build_object('id',option_a,'name','A'),jsonb_build_object('id',option_b,'name','B')))) from pg_temp.comment_test_state;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',participant_a,'role','authenticated')::text,true) from comment_test_state;
set local role authenticated;
select public.submit_ballot(poll_id,participant_a,repeat('c',64),jsonb_build_array(option_a),'理由 A','测试甲','🐱') from pg_temp.comment_test_state;
select set_config('request.jwt.claims',jsonb_build_object('sub',participant_b,'role','authenticated')::text,true) from comment_test_state;
select public.submit_ballot(poll_id,participant_b,repeat('d',64),jsonb_build_array(option_b),'理由 B','测试乙','🐰') from pg_temp.comment_test_state;
select set_config('request.jwt.claims',jsonb_build_object('sub',participant_a,'role','authenticated')::text,true) from comment_test_state;
do $$ declare s record; begin
  select * into s from pg_temp.comment_test_state;
  assert (select count(*) from public.poll_comments where poll_id=s.poll_id)=0,'Ongoing comments must not be publicly readable';
  assert (select count(*) from public.own_comments(s.participant_a,repeat('c',64)))=1;
  assert (select body from public.own_comments(s.participant_a,repeat('c',64)))='理由 A';
  begin perform * from public.own_comments(s.participant_b,repeat('d',64));
    raise exception 'Foreign own-comment read allowed'; exception when insufficient_privilege then null; end;
  begin insert into public.poll_comments(poll_id,voter_id,nickname,avatar,body) values(s.poll_id,s.participant_a,'冒名','🐱','forbidden');
    raise exception 'Raw comment insert allowed'; exception when insufficient_privilege then null; end;
  begin perform public.submit_ballot(s.poll_id,s.participant_a,repeat('c',64),jsonb_build_array(s.option_b),repeat('x',201),'测试甲','🐱');
    raise exception 'Oversized comment allowed'; exception when invalid_parameter_value then null; end;
  assert (select ranking->>0 from public.votes where poll_id=s.poll_id and voter_id=s.participant_a::text)=s.option_a::text,'Failed ballot must not alter vote';
  perform public.submit_ballot(s.poll_id,s.participant_a,repeat('c',64),jsonb_build_array(s.option_b),'更新理由','测试甲','🐱');
  assert (select count(*) from public.own_comments(s.participant_a,repeat('c',64)))=1,'One comment per participant';
  assert (select body from public.own_comments(s.participant_a,repeat('c',64)))='更新理由';
  perform public.submit_ballot(s.poll_id,s.participant_a,repeat('c',64),jsonb_build_array(s.option_b),'','测试甲','🐱');
  assert (select count(*) from public.own_comments(s.participant_a,repeat('c',64)))=0,'Clearing comment removes own comment only';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',s.participant_b,'role','authenticated')::text,true);
  assert (select count(*) from public.own_comments(s.participant_b,repeat('d',64)))=1;
  assert (select count(*) from public.votes where poll_id=s.poll_id)=2,'Comment deletion must not delete votes';
end $$;

-- A fresh browser has no participant token but sees the same public server data
-- after closing; no localStorage or author identity is involved in this read.
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true) from comment_test_state;
set local role authenticated;
do $$ declare s record; begin
  select * into s from pg_temp.comment_test_state;
  assert (select count(*) from public.poll_comments where poll_id=s.poll_id)=1,'Owner can moderate ongoing comments';
  perform public.close_poll(s.poll_id);
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',participant_b,'role','authenticated')::text,true) from comment_test_state;
set local role authenticated;
do $$ declare s record; begin
  select * into s from pg_temp.comment_test_state;
  assert (select count(*) from public.poll_comments where poll_id=s.poll_id)=1,'Ended comments public across browsers';
  assert (select avatar from public.poll_comments where poll_id=s.poll_id)='🐰';
  begin perform public.submit_ballot(s.poll_id,s.participant_b,repeat('d',64),jsonb_build_array(s.option_a),'改理由','测试乙','🐰');
    raise exception 'Closed ballot unexpectedly allowed'; exception when invalid_parameter_value then null; end;
end $$;
reset role;
alter table pg_temp.comment_test_state add column other_owner uuid default gen_random_uuid();
insert into auth.users(id,aud,role,email,is_anonymous)
select other_owner,'authenticated','authenticated',other_owner::text||'@example.invalid',false from pg_temp.comment_test_state;
select set_config('request.jwt.claims',jsonb_build_object('sub',participant_b,'role','authenticated')::text,true) from comment_test_state;
set local role authenticated;
do $$ declare s record; comment_id uuid; begin
  select * into s from pg_temp.comment_test_state;
  select id into comment_id from public.poll_comments where poll_id=s.poll_id;
  perform public.update_comment(comment_id,s.participant_b,repeat('d',64),'结束后修改自己的理由');
  assert (select body from public.poll_comments where id=comment_id)='结束后修改自己的理由';
  begin perform public.update_comment(comment_id,s.participant_a,repeat('c',64),'冒名修改');
    raise exception 'Non-author edit allowed'; exception when insufficient_privilege then null; end;
  begin perform public.update_comment(comment_id,s.participant_b,repeat('d',64),'');
    raise exception 'Empty edit allowed'; exception when invalid_parameter_value then null; end;
  begin perform public.delete_comment(comment_id,null,null);
    raise exception 'Null credentials deletion allowed'; exception when insufficient_privilege then null; end;
  begin perform public.delete_comment(comment_id,s.participant_a,repeat('c',64));
    raise exception 'Other participant deletion allowed'; exception when insufficient_privilege then null; end;
  -- Exercise successful author deletion in a subtransaction, then restore the
  -- comment so the owner's independent moderation path can be tested too.
  begin
    perform public.delete_comment(comment_id,s.participant_b,repeat('d',64));
    assert not exists(select 1 from public.poll_comments where id=comment_id);
    assert (select count(*) from public.votes where poll_id=s.poll_id)=2;
    raise exception 'rollback successful author delete' using errcode='P0002';
  exception when no_data_found then null; end;
  assert exists(select 1 from public.poll_comments where id=comment_id);
  assert (select count(*) from public.votes where poll_id=s.poll_id)=2;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',other_owner,'role','authenticated')::text,true) from comment_test_state;
set local role authenticated;
do $$ declare s record; comment_id uuid; begin
  select * into s from pg_temp.comment_test_state;
  select id into comment_id from public.poll_comments where poll_id=s.poll_id;
  begin perform public.delete_comment(comment_id,null,null);
    raise exception 'Other account moderation allowed'; exception when insufficient_privilege then null; end;
  begin update public.poll_comments set body='raw bypass' where id=comment_id;
    raise exception 'Raw comment update allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true) from comment_test_state;
set local role authenticated;
do $$ declare s record; comment_id uuid; begin
  select * into s from pg_temp.comment_test_state;
  select id into comment_id from public.poll_comments where poll_id=s.poll_id;
  begin perform public.update_comment(comment_id,null,null,'Owner cannot rewrite reasons');
    raise exception 'Owner rewrote somebody else comment'; exception when insufficient_privilege then null; end;
  perform public.delete_comment(comment_id,null,null);
  assert not exists(select 1 from public.poll_comments where id=comment_id);
  assert (select count(*) from public.votes where poll_id=s.poll_id)=2;
end $$;
reset role;
select jsonb_build_object('passed',array['ongoing_comments_hidden','own_comment_restoration','impersonation_denied','raw_write_denied','atomic_ballot_validation',
  'single_comment_upsert','clear_comment_preserves_vote','owner_moderation_read','closed_public_cross_device_read','closed_ballot_denied','author_edit_after_close','non_author_edit_denied','anonymous_delete_denied','author_delete','non_owner_delete_denied','owner_moderation_delete','comment_changes_preserve_votes']) as verification;
rollback;
