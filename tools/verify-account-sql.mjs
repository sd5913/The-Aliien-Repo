// Run with PGLITE_MODULE pointing at a temporary @electric-sql/pglite install.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated;
create schema auth; create schema storage; create schema extensions;
grant usage on schema auth,storage,public to anon,authenticated;
create table auth.users(id uuid primary key,aud text,role text,email text,is_anonymous boolean default false);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select current_setting('request.jwt.claims',true)::jsonb $$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
select set_config('request.jwt.claims','{}',false);
`);
const schema=fs.readFileSync('supabase/schema.sql','utf8');
await db.exec(schema.slice(0,schema.indexOf('-- Retain historical guest ballots/comments')));
// Seed pre-upgrade guest data to verify preservation and revocation together.
await db.exec(`insert into private.soft_participants(id,token_hash) values('70000000-0000-4000-8000-000000000001','archived');
insert into public.polls(id,title,status,is_public) values('90000000-0000-4000-8000-000000000001','Historical guest poll','closed',true);
insert into public.votes(poll_id,voter_id) values('90000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001');
insert into public.poll_comments(poll_id,voter_id,nickname,avatar,body) values('90000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','Historical guest','🐱','Preserved comment');`);
const migration=fs.readdirSync('supabase/migrations').find(f=>f.endsWith('_account_only_participation.sql'));
await db.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8'));
const ownerVotingMigration=fs.readdirSync('supabase/migrations').find(f=>f.endsWith('_prevent_poll_owner_voting.sql'));
await db.exec(fs.readFileSync('supabase/migrations/'+ownerVotingMigration,'utf8'));
await db.exec(`do $$ begin
  assert (select count(*) from public.votes where poll_id='90000000-0000-4000-8000-000000000001')=1;
  assert (select count(*) from public.poll_comments where poll_id='90000000-0000-4000-8000-000000000001')=1;
  assert not has_function_privilege('anon','private.submit_vote(uuid,uuid,text,jsonb)','execute');
  assert not has_function_privilege('anon','private.delete_comment(uuid,uuid,text)','execute');
end $$;`);

for (const file of ['account_only.sql', 'permissions.sql', 'comments.sql']) {
  try { await db.exec(fs.readFileSync('supabase/tests/'+file,'utf8')); }
  catch(e) { console.error(file, e.message, e.where, e.detail); process.exit(1); }
  console.log('Passed: '+file);
}
console.log('Passed: embedded PostgreSQL migration and account-only permission tests.');
await db.close();
