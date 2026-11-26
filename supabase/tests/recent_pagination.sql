begin;
insert into auth.users(id,aud,role,email,is_anonymous) values
  ('12000000-0000-4000-8000-000000000001','authenticated','authenticated','page-a@example.invalid',false),
  ('12000000-0000-4000-8000-000000000002','authenticated','authenticated','page-b@example.invalid',false);
insert into public.polls(id,title,owner_id,status,is_public,created_at,closed_at)
select ('22000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid, 'Page '||i,
  case when i<=12 then '12000000-0000-4000-8000-000000000001'::uuid else '12000000-0000-4000-8000-000000000002'::uuid end,
  case when i=13 then 'closed' else 'open' end,i<>13,
  '2026-01-01'::timestamptz+i*interval '1 second',case when i=14 then now()-interval '1 day' else null end
from generate_series(1,25) i;
insert into public.votes(poll_id,voter_id,created_at)
select ('22000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,
  '12000000-0000-4000-8000-000000000001','2026-01-01'::timestamptz+i*interval '1 second'
from generate_series(13,24) i;
-- A historical self-vote must not duplicate an owned card.
insert into public.votes(poll_id,voter_id,created_at) values
 ('22000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','2026-01-01');
select set_config('request.jwt.claims','{"sub":"12000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ declare a jsonb[]; b jsonb[]; c jsonb[]; begin
  select array_agg(item) into a from public.recent_polls(0) item;
  select array_agg(item) into b from public.recent_polls(1) item;
  select array_agg(item) into c from public.recent_polls(2) item;
  assert array_length(a,1)=11 and array_length(b,1)=11 and array_length(c,1)=4, 'ten cards and one next-page sentinel';
  assert a[1]->>'id'='22000000-0000-4000-8000-000000000024';
  assert a[11]->>'id'=b[1]->>'id', 'next page starts with previous sentinel';
  assert c[4]->>'id'='22000000-0000-4000-8000-000000000001', 'old owned card must not be truncated';
  assert c[4]->>'participated_by_current_identity'='true';
  assert b[2]->>'id'='22000000-0000-4000-8000-000000000013' and b[2]->>'status'='closed', 'ended unlisted participation retained';
  assert b[1]->>'closed_at' is not null, 'expired participation retained';
  assert (select count(*) from public.recent_polls(3))=0;
  begin perform public.recent_polls(-1); raise exception 'negative page accepted';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"12000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  assert (select count(*) from public.recent_polls(1))=3, 'other account sees only its thirteen owned polls';
end $$;
reset role;
do $$ begin
  assert not has_function_privilege('anon','public.recent_polls(integer)','execute');
  assert not has_function_privilege('anon','private.recent_polls(integer)','execute');
end $$;
rollback;
