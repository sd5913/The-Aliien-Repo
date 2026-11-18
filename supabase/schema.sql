-- BothPls 线上表结构（规范化三表）
-- Project: zptfqvufzsvlzmkdcfeb
-- 在 Supabase Dashboard -> SQL Editor -> New query 中整段执行

-- 投票主表
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'closed')),
  author_name text default 'Picksy friend',
  is_public boolean not null default true,
  emoji text,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

-- 投票选项
create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  image_url text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- 投票记录；ranking 为选项 id 的有序数组，单选时只含一个元素
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  voter_id text not null,
  ranking jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (poll_id, voter_id)
);

create index if not exists idx_poll_options_poll on public.poll_options(poll_id);
create index if not exists idx_votes_poll on public.votes(poll_id);

-- Production permission definitions (kept identical to the migration).
-- Account ownership is authoritative. Legacy browser IDs are never claimed.
alter table public.polls add column if not exists owner_id uuid references auth.users(id) on delete set null;
update public.polls p set owner_id = u.id from auth.users u
where p.owner_id is null and p.author_name = u.id::text and not u.is_anonymous;
create index if not exists polls_owner_id_idx on public.polls(owner_id);

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
alter default privileges in schema private revoke execute on functions from public;

-- Capability credentials are separate from publicly readable vote IDs.
-- Only hashes are stored server-side. No role can read or write this table directly.
create table if not exists private.soft_participants (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  created_at timestamptz not null default now()
);
alter table private.soft_participants enable row level security;
revoke all on private.soft_participants from public, anon, authenticated;

-- Replace ALL old policies on these three tables, including permissive policies
-- which would otherwise be OR-ed together with restrictive owner policies.
do $$ declare p record; begin
  for p in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('polls','poll_options','votes')
  loop execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename); end loop;
end $$;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.votes enable row level security;

create policy "polls visible" on public.polls for select to anon, authenticated
using (is_public or owner_id = (select auth.uid()));
create policy "options visible" on public.poll_options for select to anon, authenticated
using (exists (select 1 from public.polls p where p.id = poll_id));
create policy "votes visible" on public.votes for select to anon, authenticated
using (exists (select 1 from public.polls p where p.id = poll_id));

-- Writes are only through narrow, checked RPCs. RLS has no direct write policies.
revoke all on public.polls, public.poll_options, public.votes from anon, authenticated;
grant select on public.polls, public.poll_options, public.votes to anon, authenticated;

-- SECURITY DEFINER implementations stay outside the exposed public schema.
-- Their public wrappers below are SECURITY INVOKER and have explicit grants.
create or replace function private.save_poll(p_poll jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  target_poll_id uuid := (p_poll->>'id')::uuid;
  previous public.polls%rowtype;
  existing boolean;
  option_count int;
  new_deadline timestamptz := (p_poll->>'endsAt')::timestamptz;
begin
  if actor is null or not exists(select 1 from auth.users where id = actor and not is_anonymous) then
    raise exception 'ACCOUNT_REQUIRED' using errcode = '42501';
  end if;
  if target_poll_id is null or coalesce(length(btrim(p_poll->>'title')),0) not between 1 and 100
     or coalesce(p_poll->>'status','') not in ('open','closed')
     or coalesce(jsonb_typeof(p_poll->'options'),'') <> 'array' then
    raise exception 'INVALID_POLL' using errcode = '22023';
  end if;
  option_count := jsonb_array_length(p_poll->'options');
  if option_count not between 2 and 5 or exists(
    select 1 from jsonb_array_elements(p_poll->'options') o
    where coalesce(length(btrim(o->>'name')),0) not between 1 and 60 or o->>'id' is null
  ) or (select count(distinct (o->>'id')::uuid) from jsonb_array_elements(p_poll->'options') o) <> option_count then
    raise exception 'INVALID_OPTIONS' using errcode = '22023';
  end if;
  select * into previous from public.polls where id = target_poll_id for update;
  existing := found;
  if existing then
    if previous.owner_id is distinct from actor then raise exception 'NOT_POLL_OWNER' using errcode = '42501'; end if;
    if previous.status <> 'open' or (previous.closed_at is not null and previous.closed_at <= clock_timestamp()) then
      raise exception 'POLL_CLOSED' using errcode = '22023';
    end if;
    -- Prevent moving an option from another poll or removing an option with votes.
    if exists(select 1 from public.votes v where v.poll_id = target_poll_id and not exists(
      select 1 from jsonb_array_elements(p_poll->'options') o where o->>'id' = v.ranking->>0
    )) then raise exception 'VOTED_OPTION_CANNOT_BE_REMOVED' using errcode = '22023'; end if;
    update public.polls set title = btrim(p_poll->>'title'), description = p_poll->>'description',
      status = p_poll->>'status', closed_at = case when p_poll->>'status' = 'closed' then clock_timestamp() else new_deadline end
    where id = target_poll_id;
  else
    if p_poll->>'status' <> 'open' or (new_deadline is not null and new_deadline <= clock_timestamp()) then
      raise exception 'INVALID_DEADLINE' using errcode = '22023';
    end if;
    insert into public.polls(id,title,description,status,owner_id,author_name,is_public,closed_at)
    values(target_poll_id,btrim(p_poll->>'title'),p_poll->>'description','open',actor,actor::text,true,new_deadline);
  end if;
  if exists(select 1 from public.poll_options po join jsonb_array_elements(p_poll->'options') o
    on po.id = (o->>'id')::uuid where po.poll_id <> target_poll_id) then
    raise exception 'OPTION_BELONGS_TO_ANOTHER_POLL' using errcode = '42501';
  end if;
  insert into public.poll_options(id,poll_id,label,image_url,position)
    select (o->>'id')::uuid,target_poll_id,btrim(o->>'name'),o->>'imageUrl',ord::int - 1
    from jsonb_array_elements(p_poll->'options') with ordinality as x(o,ord)
  on conflict(id) do update set label = excluded.label, image_url = excluded.image_url, position = excluded.position;
  delete from public.poll_options po where po.poll_id = target_poll_id
    and po.id not in(select (o->>'id')::uuid from jsonb_array_elements(p_poll->'options') o);
  return target_poll_id;
end $$;

create or replace function private.delete_poll(p_poll_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); previous public.polls%rowtype;
begin
  if actor is null or not exists(select 1 from auth.users where id = actor and not is_anonymous) then
    raise exception 'ACCOUNT_REQUIRED' using errcode = '42501'; end if;
  select * into previous from public.polls where id = p_poll_id for update;
  if not found or previous.owner_id is distinct from actor then
    raise exception 'NOT_POLL_OWNER' using errcode = '42501'; end if;
  delete from public.polls where id = p_poll_id;
end $$;

create or replace function private.close_poll(p_poll_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); previous public.polls%rowtype;
begin
  if actor is null or not exists(select 1 from auth.users where id = actor and not is_anonymous) then
    raise exception 'ACCOUNT_REQUIRED' using errcode = '42501'; end if;
  select * into previous from public.polls where id = p_poll_id for update;
  if not found or previous.owner_id is distinct from actor then
    raise exception 'NOT_POLL_OWNER' using errcode = '42501'; end if;
  update public.polls set status = 'closed', closed_at = least(coalesce(closed_at,clock_timestamp()),clock_timestamp())
    where id = p_poll_id;
end $$;

-- Soft login does not create an email account. A 256-bit browser capability
-- authorizes only that participant's votes; it confers no poll-management rights.
create or replace function private.register_participant(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare digest text; participant_id uuid;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_PARTICIPANT_TOKEN' using errcode = '22023'; end if;
  digest := encode(extensions.digest(p_token,'sha256'),'hex');
  insert into private.soft_participants(token_hash) values(digest)
    on conflict(token_hash) do update set token_hash = excluded.token_hash returning id into participant_id;
  return participant_id;
end $$;

create or replace function private.submit_vote(p_poll_id uuid,p_voter_id uuid,p_token text,p_ranking jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare target public.polls%rowtype;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' or not exists(
    select 1 from private.soft_participants where id = p_voter_id
      and token_hash = encode(extensions.digest(p_token,'sha256'),'hex')
  ) then raise exception 'PARTICIPANT_REQUIRED' using errcode = '42501'; end if;
  -- Same lock as close/edit/delete, so a stale browser cannot race an ended poll.
  select * into target from public.polls where id = p_poll_id for update;
  if not found or not target.is_public then raise exception 'POLL_NOT_FOUND' using errcode = '22023'; end if;
  if target.status <> 'open' or (target.closed_at is not null and target.closed_at <= clock_timestamp()) then
    raise exception 'POLL_CLOSED' using errcode = '22023'; end if;
  if coalesce(jsonb_typeof(p_ranking),'') <> 'array' then raise exception 'SINGLE_OPTION_REQUIRED' using errcode = '22023'; end if;
  if jsonb_array_length(p_ranking) <> 1 or not exists(
    select 1 from public.poll_options where poll_id = p_poll_id and id::text = p_ranking->>0
  ) then raise exception 'INVALID_OPTION' using errcode = '22023'; end if;
  insert into public.votes(poll_id,voter_id,ranking) values(p_poll_id,p_voter_id::text,p_ranking)
    on conflict(poll_id,voter_id) do update set ranking = excluded.ranking,created_at = clock_timestamp();
end $$;

create or replace function public.save_poll(p_poll jsonb) returns uuid
language sql security invoker set search_path = '' as $$ select private.save_poll(p_poll) $$;
create or replace function public.delete_poll(p_poll_id uuid) returns void
language sql security invoker set search_path = '' as $$ select private.delete_poll(p_poll_id) $$;
create or replace function public.close_poll(p_poll_id uuid) returns void
language sql security invoker set search_path = '' as $$ select private.close_poll(p_poll_id) $$;
create or replace function public.register_participant(p_token text) returns uuid
language sql security invoker set search_path = '' as $$ select private.register_participant(p_token) $$;
create or replace function public.submit_vote(p_poll_id uuid,p_voter_id uuid,p_token text,p_ranking jsonb) returns void
language sql security invoker set search_path = '' as $$ select private.submit_vote(p_poll_id,p_voter_id,p_token,p_ranking) $$;

revoke all on function private.save_poll(jsonb),private.delete_poll(uuid),private.close_poll(uuid),
  private.register_participant(text),private.submit_vote(uuid,uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.save_poll(jsonb),public.delete_poll(uuid),public.close_poll(uuid),
  public.register_participant(text),public.submit_vote(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function private.save_poll(jsonb),private.delete_poll(uuid),private.close_poll(uuid),
  public.save_poll(jsonb),public.delete_poll(uuid),public.close_poll(uuid) to authenticated;
grant execute on function private.register_participant(text),private.submit_vote(uuid,uuid,text,jsonb),
  public.register_participant(text),public.submit_vote(uuid,uuid,text,jsonb) to anon,authenticated;
notify pgrst, 'reload schema';

-- Server-side comment storage and visibility.
create table public.poll_comments (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  voter_id uuid not null references private.soft_participants(id) on delete cascade,
  nickname text not null check(char_length(btrim(nickname)) between 2 and 12),
  avatar text not null,
  body text not null check(char_length(btrim(body)) between 1 and 200),
  option_id uuid references public.poll_options(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(poll_id,voter_id)
);
create index poll_comments_voter_idx on public.poll_comments(voter_id);
alter table public.poll_comments enable row level security;
revoke all on public.poll_comments from public,anon,authenticated;
grant select on public.poll_comments to anon,authenticated;
create policy "comments visible after close or to owner" on public.poll_comments for select to anon,authenticated
using(exists(select 1 from public.polls p where p.id=poll_id and
  (p.owner_id=(select auth.uid()) or (p.is_public and
    (p.status='closed' or (p.closed_at is not null and p.closed_at <= statement_timestamp()))))));

-- An own-comment endpoint is separate from the result list: the participant may
-- restore their own text into the edit form without seeing anyone else's reasons.
create function private.own_comments(p_voter_id uuid,p_token text) returns setof public.poll_comments
language plpgsql security definer set search_path='' as $$
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' or not exists(
    select 1 from private.soft_participants where id=p_voter_id
      and token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
  ) then raise exception 'PARTICIPANT_REQUIRED' using errcode='42501'; end if;
  return query select c.* from public.poll_comments c join public.polls p on p.id=c.poll_id
    where c.voter_id=p_voter_id and p.is_public;
end $$;

create function private.submit_ballot(p_poll_id uuid,p_voter_id uuid,p_token text,p_ranking jsonb,
  p_comment text,p_nickname text,p_avatar text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if coalesce(char_length(btrim(p_nickname)),0) not between 2 and 12
    or char_length(coalesce(p_comment,'')) > 200
    or p_avatar is null or p_avatar not in ('🐱','🐰','🐻','🐼','🦊','🐨') then
    raise exception 'INVALID_COMMENT_PROFILE' using errcode='22023'; end if;
  -- Validation and the vote upsert share one transaction and one parent-row lock.
  perform private.submit_vote(p_poll_id,p_voter_id,p_token,p_ranking);
  if nullif(btrim(p_comment),'') is null then
    delete from public.poll_comments where poll_id=p_poll_id and voter_id=p_voter_id;
  else
    insert into public.poll_comments(poll_id,voter_id,nickname,avatar,body,option_id)
      values(p_poll_id,p_voter_id,btrim(p_nickname),p_avatar,btrim(p_comment),(p_ranking->>0)::uuid)
    on conflict(poll_id,voter_id) do update set nickname=excluded.nickname,avatar=excluded.avatar,
      body=excluded.body,option_id=excluded.option_id,updated_at=clock_timestamp();
  end if;
end $$;

create function public.own_comments(p_voter_id uuid,p_token text) returns setof public.poll_comments
language sql security invoker set search_path='' as $$ select * from private.own_comments(p_voter_id,p_token) $$;
create function public.submit_ballot(p_poll_id uuid,p_voter_id uuid,p_token text,p_ranking jsonb,
  p_comment text,p_nickname text,p_avatar text) returns void
language sql security invoker set search_path='' as $$
  select private.submit_ballot(p_poll_id,p_voter_id,p_token,p_ranking,p_comment,p_nickname,p_avatar)
$$;
revoke all on function private.own_comments(uuid,text),public.own_comments(uuid,text),
  private.submit_ballot(uuid,uuid,text,jsonb,text,text,text),public.submit_ballot(uuid,uuid,text,jsonb,text,text,text)
  from public,anon,authenticated;
grant execute on function private.own_comments(uuid,text),public.own_comments(uuid,text),
  private.submit_ballot(uuid,uuid,text,jsonb,text,text,text),public.submit_ballot(uuid,uuid,text,jsonb,text,text,text)
  to anon,authenticated;
notify pgrst,'reload schema';

-- Author and poll-owner comment management.
-- Comment changes are independent of ballots, including after the poll closes.
-- Parent-row locking uses the same order as ballot submission and poll deletion.
create function private.update_comment(p_comment_id uuid,p_voter_id uuid,p_token text,p_body text) returns void
language plpgsql security definer set search_path='' as $$
declare target_poll uuid; target public.poll_comments%rowtype;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' or not exists(select 1 from private.soft_participants
    where id=p_voter_id and token_hash=encode(extensions.digest(p_token,'sha256'),'hex')) then
    raise exception 'PARTICIPANT_REQUIRED' using errcode='42501'; end if;
  if coalesce(char_length(btrim(p_body)),0) not between 1 and 200 then
    raise exception 'INVALID_COMMENT' using errcode='22023'; end if;
  select poll_id into target_poll from public.poll_comments where id=p_comment_id;
  if not found then raise exception 'COMMENT_NOT_FOUND' using errcode='22023'; end if;
  perform 1 from public.polls where id=target_poll for update;
  select * into target from public.poll_comments where id=p_comment_id for update;
  if not found or target.voter_id is distinct from p_voter_id then
    raise exception 'NOT_COMMENT_AUTHOR' using errcode='42501'; end if;
  update public.poll_comments set body=btrim(p_body),updated_at=clock_timestamp() where id=p_comment_id;
end $$;

create function private.delete_comment(p_comment_id uuid,p_voter_id uuid,p_token text) returns void
language plpgsql security definer set search_path='' as $$
declare target_poll uuid; target public.poll_comments%rowtype; owner uuid; actor uuid:=auth.uid(); account_owner boolean;
begin
  select poll_id into target_poll from public.poll_comments where id=p_comment_id;
  if not found then raise exception 'COMMENT_NOT_FOUND' using errcode='22023'; end if;
  select owner_id into owner from public.polls where id=target_poll for update;
  select * into target from public.poll_comments where id=p_comment_id for update;
  if not found then raise exception 'COMMENT_NOT_FOUND' using errcode='22023'; end if;
  account_owner := actor is not null and owner=actor and exists(select 1 from auth.users where id=actor and not is_anonymous);
  if not coalesce(account_owner,false) and not coalesce((
    target.voter_id=p_voter_id and p_token is not null and p_token ~ '^[a-f0-9]{64}$' and exists(
      select 1 from private.soft_participants where id=p_voter_id
      and token_hash=encode(extensions.digest(p_token,'sha256'),'hex'))
  ),false) then raise exception 'COMMENT_DELETE_FORBIDDEN' using errcode='42501'; end if;
  delete from public.poll_comments where id=p_comment_id;
end $$;

create function public.update_comment(p_comment_id uuid,p_voter_id uuid,p_token text,p_body text) returns void
language sql security invoker set search_path='' as $$ select private.update_comment(p_comment_id,p_voter_id,p_token,p_body) $$;
create function public.delete_comment(p_comment_id uuid,p_voter_id uuid,p_token text) returns void
language sql security invoker set search_path='' as $$ select private.delete_comment(p_comment_id,p_voter_id,p_token) $$;
revoke all on function private.update_comment(uuid,uuid,text,text),public.update_comment(uuid,uuid,text,text),
  private.delete_comment(uuid,uuid,text),public.delete_comment(uuid,uuid,text) from public,anon,authenticated;
grant execute on function private.update_comment(uuid,uuid,text,text),public.update_comment(uuid,uuid,text,text),
  private.delete_comment(uuid,uuid,text),public.delete_comment(uuid,uuid,text) to anon,authenticated;
notify pgrst,'reload schema';

-- Public product images, account-scoped upload directories.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('poll-images','poll-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "account uploads own poll images" on storage.objects for insert to authenticated
with check(bucket_id='poll-images' and (storage.foldername(name))[1]=(select auth.uid())::text
  and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false));
create policy "account lists own poll images" on storage.objects for select to authenticated
using(bucket_id='poll-images' and (storage.foldername(name))[1]=(select auth.uid())::text
  and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false));
create policy "account removes own poll images" on storage.objects for delete to authenticated
using(bucket_id='poll-images' and (storage.foldername(name))[1]=(select auth.uid())::text
  and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false));
-- Bucket downloads are public so soft-login participants can see product images.
-- No UPDATE/upsert policy: published URLs are immutable and safe to reuse in copies.
