-- Rollback-only tests for account writes and legacy token revocation.
begin;
insert into auth.users(id,aud,role,email,is_anonymous) values
('10000000-0000-4000-8000-000000000001','authenticated','authenticated','one@example.invalid',false),
('10000000-0000-4000-8000-000000000002','authenticated','authenticated','two@example.invalid',false),
('10000000-0000-4000-8000-000000000003','authenticated','authenticated','anon@example.invalid',true),
('10000000-0000-4000-8000-000000000004','authenticated','authenticated','other@example.invalid',false);
insert into public.polls(id,title,is_public,owner_id) values
('20000000-0000-4000-8000-000000000001','Account only',false,'10000000-0000-4000-8000-000000000001');
insert into public.poll_options(id,poll_id,label) values
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','A');

set local role anon;
do $$ begin
  assert public.get_poll_by_link('20000000-0000-4000-8000-000000000001') is not null;
  begin perform public.register_participant(repeat('c',64)); raise exception 'guest registration allowed';
  exception when insufficient_privilege then null; end;
  begin perform public.submit_vote('20000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001',repeat('c',64),'["30000000-0000-4000-8000-000000000001"]'); raise exception 'guest vote allowed';
  exception when insufficient_privilege then null; end;
  assert not has_function_privilege('anon','public.submit_ballot(uuid,uuid,text,jsonb,text,text,text)','execute');
  assert not has_function_privilege('anon','public.update_comment(uuid,uuid,text,text)','execute');
  assert not has_function_privilege('anon','public.delete_comment(uuid,uuid,text)','execute');
end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin
    perform public.submit_ballot('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','','["30000000-0000-4000-8000-000000000001"]','Owner comment','Account user','🐱');
    raise exception 'poll owner ballot unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  assert (select count(*) from public.votes where poll_id='20000000-0000-4000-8000-000000000001')=0;
  assert (select count(*) from public.poll_comments where poll_id='20000000-0000-4000-8000-000000000001')=0;
  assert (select count(*) from public.my_voted_polls('10000000-0000-4000-8000-000000000001',''))=0;
end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select public.submit_ballot('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','','["30000000-0000-4000-8000-000000000001"]','Account comment','Account user','https://example.invalid/avatar.png');
select public.submit_ballot('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','','["30000000-0000-4000-8000-000000000001"]','Updated comment','Account user','🐱');
reset role;
-- Count the stored ballot as the test administrator. The poll is unlisted.
do $$ begin
  assert (select count(*) from public.votes where poll_id='20000000-0000-4000-8000-000000000001')=1;
end $$;
set local role authenticated;
do $$ begin
  assert (select count(*) from public.own_comments('10000000-0000-4000-8000-000000000002',''))=1;
  assert (select count(*) from public.my_voted_polls('10000000-0000-4000-8000-000000000002',''))=1;
  begin perform public.submit_vote('20000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001',repeat('c',64),'["30000000-0000-4000-8000-000000000001"]'); raise exception 'old token identity adopted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ declare comment_id uuid; begin
  assert jsonb_array_length(public.get_poll_by_link('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',repeat('c',64))->'comments')=1;
  begin perform * from public.own_comments('10000000-0000-4000-8000-000000000002',''); raise exception 'foreign comments readable';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Capture the test row before switching to an unrelated account.
select set_config('review.comment_id',(select id::text from public.poll_comments where poll_id='20000000-0000-4000-8000-000000000001'),true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
set local role authenticated;
do $$ declare comment_id uuid := current_setting('review.comment_id')::uuid; begin
  begin perform private.update_comment(comment_id,'10000000-0000-4000-8000-000000000002','','hijack'); raise exception 'foreign edit allowed';
  exception when insufficient_privilege then null; end;
  begin perform private.delete_comment(comment_id,'10000000-0000-4000-8000-000000000002',''); raise exception 'foreign delete allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":true}',true);
set local role authenticated;
do $$ begin
  begin perform public.submit_vote('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','','["30000000-0000-4000-8000-000000000001"]'); raise exception 'anonymous auth vote allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

update public.polls set status='closed' where id='20000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claims','{}',true);
set local role anon;
do $$ begin
  assert jsonb_array_length(public.get_poll_by_link('20000000-0000-4000-8000-000000000001')->'comments')=1;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$ declare comment_id uuid; begin
  begin perform public.submit_vote('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','','["30000000-0000-4000-8000-000000000001"]'); raise exception 'closed ballot allowed';
  exception when invalid_parameter_value then null; end;
  select id into comment_id from public.own_comments('10000000-0000-4000-8000-000000000002','');
  perform public.update_comment(comment_id,'10000000-0000-4000-8000-000000000002','','Edited after close');
  perform public.delete_comment(comment_id,'10000000-0000-4000-8000-000000000002','');
  assert (select count(*) from public.own_comments('10000000-0000-4000-8000-000000000002',''))=0;
end $$;
reset role;
rollback;
