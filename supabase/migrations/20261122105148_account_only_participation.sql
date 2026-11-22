-- Retain historical guest ballots/comments, but revoke every capability-token path.
-- RPC argument shapes remain compatible; p_token is ignored and never grants access.
alter table public.poll_comments drop constraint if exists poll_comments_voter_id_fkey;

create or replace function private.is_account_voter(p_voter_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce(auth.uid()=p_voter_id and exists(
    select 1 from auth.users where id=auth.uid() and not is_anonymous
  ),false)
$$;
revoke all on function private.is_account_voter(uuid) from public,anon,authenticated;
grant execute on function private.is_account_voter(uuid) to authenticated;

create or replace function private.register_participant(p_token text) returns uuid
language plpgsql security definer set search_path='' as $$
begin raise exception 'ACCOUNT_REQUIRED' using errcode='42501'; end $$;
revoke all on function private.register_participant(text),public.register_participant(text) from public,anon,authenticated;

create or replace function private.submit_vote(p_poll_id uuid,p_voter_id uuid,p_token text,p_ranking jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare target public.polls%rowtype;
begin
  if not private.is_account_voter(p_voter_id) then raise exception 'ACCOUNT_REQUIRED' using errcode='42501'; end if;
  select * into target from public.polls where id = p_poll_id for update;
  if not found then raise exception 'POLL_NOT_FOUND' using errcode = '22023'; end if;
  if target.status <> 'open' or (target.closed_at is not null and target.closed_at <= clock_timestamp()) then
    raise exception 'POLL_CLOSED' using errcode = '22023'; end if;
  if coalesce(jsonb_typeof(p_ranking),'') <> 'array' then raise exception 'SINGLE_OPTION_REQUIRED' using errcode = '22023'; end if;
  if jsonb_array_length(p_ranking) <> 1 or not exists(
    select 1 from public.poll_options where poll_id = p_poll_id and id::text = p_ranking->>0
  ) then raise exception 'INVALID_OPTION' using errcode = '22023'; end if;
  insert into public.votes(poll_id,voter_id,ranking) values(p_poll_id,p_voter_id::text,p_ranking)
    on conflict(poll_id,voter_id) do update set ranking = excluded.ranking,created_at = clock_timestamp();
end $$;

create or replace function private.own_comments(p_voter_id uuid,p_token text) returns setof public.poll_comments
language plpgsql security definer set search_path='' as $$
begin
  if not private.is_account_voter(p_voter_id) then raise exception 'ACCOUNT_REQUIRED' using errcode='42501'; end if;
  return query select c.* from public.poll_comments c where c.voter_id=p_voter_id;
end $$;

create or replace function private.my_voted_polls(p_voter_id uuid,p_token text) returns setof jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_account_voter(p_voter_id) then raise exception 'ACCOUNT_REQUIRED' using errcode='42501'; end if;
  return query with latest_votes as (
    select v.poll_id,max(v.created_at) as last_voted_at from public.votes v
      where v.voter_id=p_voter_id::text group by v.poll_id
  )
  select to_jsonb(p) || jsonb_build_object(
    'poll_options',coalesce((select jsonb_agg(to_jsonb(o) order by o.position) from public.poll_options o where o.poll_id=p.id),'[]'::jsonb),
    'votes',jsonb_build_array(jsonb_build_object('count',(select count(*) from public.votes all_votes where all_votes.poll_id=p.id))),
    'last_voted_at',latest_votes.last_voted_at
  ) from latest_votes join public.polls p on p.id=latest_votes.poll_id
    order by latest_votes.last_voted_at desc limit 5;
end $$;

create or replace function private.update_comment(p_comment_id uuid,p_voter_id uuid,p_token text,p_body text) returns void
language plpgsql security definer set search_path='' as $$
declare target_poll uuid; target public.poll_comments%rowtype;
begin
  if not private.is_account_voter(p_voter_id) then raise exception 'ACCOUNT_REQUIRED' using errcode='42501'; end if;
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

create or replace function private.delete_comment(p_comment_id uuid,p_voter_id uuid,p_token text) returns void
language plpgsql security definer set search_path='' as $$
declare target_poll uuid; target public.poll_comments%rowtype; owner uuid; actor uuid:=auth.uid(); account_owner boolean;
begin
  select poll_id into target_poll from public.poll_comments where id=p_comment_id;
  if not found then raise exception 'COMMENT_NOT_FOUND' using errcode='22023'; end if;
  select owner_id into owner from public.polls where id=target_poll for update;
  select * into target from public.poll_comments where id=p_comment_id for update;
  if not found then raise exception 'COMMENT_NOT_FOUND' using errcode='22023'; end if;
  account_owner := actor is not null and owner=actor and exists(select 1 from auth.users where id=actor and not is_anonymous);
  if not coalesce(account_owner,false) and not (target.voter_id=p_voter_id and private.is_account_voter(p_voter_id)) then raise exception 'COMMENT_DELETE_FORBIDDEN' using errcode='42501'; end if;
  delete from public.poll_comments where id=p_comment_id;
end $$;

create or replace function private.submit_ballot(p_poll_id uuid,p_voter_id uuid,p_token text,p_ranking jsonb,
  p_comment text,p_nickname text,p_avatar text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if coalesce(char_length(btrim(p_nickname)),0) not between 2 and 20
    or char_length(coalesce(p_comment,'')) > 200
    or p_avatar is null or char_length(p_avatar)>2048 then
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

create or replace function private.get_poll_by_link(p_poll_id uuid, p_voter_id uuid default null, p_token text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare target public.polls%rowtype; own_voter uuid;
begin
  select * into target from public.polls where id = p_poll_id;
  if not found then return null; end if;
  if auth.uid() is not null and exists(select 1 from auth.users where id=auth.uid() and not is_anonymous) then own_voter := auth.uid(); end if;
  return jsonb_build_object(
    'poll', to_jsonb(target) || jsonb_build_object('poll_options',
      coalesce((select jsonb_agg(to_jsonb(o) order by o.position) from public.poll_options o where o.poll_id=p_poll_id),'[]'::jsonb)),
    'votes', coalesce((select jsonb_agg(to_jsonb(v)) from public.votes v where v.poll_id=p_poll_id),'[]'::jsonb),
    'comments', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at) from public.poll_comments c
      where c.poll_id=p_poll_id and (target.owner_id=auth.uid() or target.status='closed'
        or (target.closed_at is not null and target.closed_at <= clock_timestamp()) or c.voter_id=own_voter)),'[]'::jsonb)
  );
end $$;

revoke all on function private.submit_vote(uuid,uuid,text,jsonb),public.submit_vote(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function private.submit_vote(uuid,uuid,text,jsonb),public.submit_vote(uuid,uuid,text,jsonb) to authenticated;
revoke all on function private.submit_ballot(uuid,uuid,text,jsonb,text,text,text),public.submit_ballot(uuid,uuid,text,jsonb,text,text,text) from public,anon,authenticated;
grant execute on function private.submit_ballot(uuid,uuid,text,jsonb,text,text,text),public.submit_ballot(uuid,uuid,text,jsonb,text,text,text) to authenticated;
revoke all on function private.update_comment(uuid,uuid,text,text),public.update_comment(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function private.update_comment(uuid,uuid,text,text),public.update_comment(uuid,uuid,text,text) to authenticated;
revoke all on function private.delete_comment(uuid,uuid,text),public.delete_comment(uuid,uuid,text) from public,anon,authenticated;
grant execute on function private.delete_comment(uuid,uuid,text),public.delete_comment(uuid,uuid,text) to authenticated;
revoke all on function private.own_comments(uuid,text),public.own_comments(uuid,text) from public,anon,authenticated;
grant execute on function private.own_comments(uuid,text),public.own_comments(uuid,text) to authenticated;
revoke all on function private.my_voted_polls(uuid,text),public.my_voted_polls(uuid,text) from public,anon,authenticated;
grant execute on function private.my_voted_polls(uuid,text),public.my_voted_polls(uuid,text) to authenticated;
notify pgrst,'reload schema';
