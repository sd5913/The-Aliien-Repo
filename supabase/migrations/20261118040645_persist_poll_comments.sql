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
