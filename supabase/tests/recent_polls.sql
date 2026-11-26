-- Ended, expired and unlisted participation survives subsequent votes.
begin;
insert into auth.users(id,aud,role,email,is_anonymous) values
  ('11000000-0000-4000-8000-000000000001','authenticated','authenticated','recent-a@example.invalid',false),
  ('11000000-0000-4000-8000-000000000002','authenticated','authenticated','recent-b@example.invalid',false);
insert into public.polls(id,title,owner_id,status,is_public,closed_at)
select ('21000000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid,
  'Recent test ' || i, '11000000-0000-4000-8000-000000000002',
  case when i=1 then 'closed' else 'open' end, i<>1,
  case when i=2 then now()-interval '1 day' else null end
from generate_series(1,13) i;
insert into public.votes(poll_id,voter_id,created_at)
select ('21000000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid,
  '11000000-0000-4000-8000-000000000001', '2026-01-01'::timestamptz+i*interval '1 day'
from generate_series(1,12) i;
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ declare records jsonb[]; begin
  select array_agg(item) into records from public.my_voted_polls('11000000-0000-4000-8000-000000000001','') item;
  assert array_length(records,1)=12, 'participation must not be truncated to five polls';
  assert records[1]->>'id'='21000000-0000-4000-8000-000000000012', 'latest participation comes first';
  assert records[12]->>'id'='21000000-0000-4000-8000-000000000001', 'old ended unlisted poll remains accessible';
  assert records[12]->>'status'='closed';
  assert records[11]->>'closed_at' is not null, 'expired poll remains accessible';
  assert records[12]->'votes'->0->>'count'='1';
  begin
    perform public.my_voted_polls('11000000-0000-4000-8000-000000000002','');
    raise exception 'another account participation leaked';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  assert (select count(*) from public.my_voted_polls('11000000-0000-4000-8000-000000000002',''))=0, 'unvoted polls stay out';
end $$;
reset role;
delete from public.polls where id='21000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  assert (select count(*) from public.my_voted_polls('11000000-0000-4000-8000-000000000001',''))=11, 'deleted poll disappears';
end $$;
reset role;
rollback;
