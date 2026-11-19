-- Make newly created polls private by default and persist the creator's visibility choice.
alter table public.polls alter column is_public set default false;

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
      is_public = coalesce((p_poll->>'isPublic')::boolean, previous.is_public),
      status = p_poll->>'status', closed_at = case when p_poll->>'status' = 'closed' then clock_timestamp() else new_deadline end
    where id = target_poll_id;
  else
    if p_poll->>'status' <> 'open' or (new_deadline is not null and new_deadline <= clock_timestamp()) then
      raise exception 'INVALID_DEADLINE' using errcode = '22023';
    end if;
    insert into public.polls(id,title,description,status,owner_id,author_name,is_public,closed_at)
    values(target_poll_id,btrim(p_poll->>'title'),p_poll->>'description','open',actor,actor::text,coalesce((p_poll->>'isPublic')::boolean,false),new_deadline);
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

-- A poll UUID is an unlisted link capability. The regular table policies still
-- hide unlisted polls from list queries; this narrowly scoped RPC opens one poll.
create or replace function private.get_poll_by_link(p_poll_id uuid, p_voter_id uuid default null, p_token text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare target public.polls%rowtype; own_voter uuid;
begin
  select * into target from public.polls where id = p_poll_id;
  if not found then return null; end if;
  if p_voter_id is not null and p_token ~ '^[a-f0-9]{64}$' and exists(
    select 1 from private.soft_participants where id = p_voter_id
      and token_hash = encode(extensions.digest(p_token,'sha256'),'hex')
  ) then own_voter := p_voter_id; end if;
  return jsonb_build_object(
    'poll', to_jsonb(target) || jsonb_build_object('poll_options',
      coalesce((select jsonb_agg(to_jsonb(o) order by o.position) from public.poll_options o where o.poll_id=p_poll_id),'[]'::jsonb)),
    'votes', coalesce((select jsonb_agg(to_jsonb(v)) from public.votes v where v.poll_id=p_poll_id),'[]'::jsonb),
    'comments', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at) from public.poll_comments c
      where c.poll_id=p_poll_id and (target.owner_id=auth.uid() or target.status='closed'
        or (target.closed_at is not null and target.closed_at <= clock_timestamp()) or c.voter_id=own_voter)),'[]'::jsonb)
  );
end $$;
create or replace function public.get_poll_by_link(p_poll_id uuid, p_voter_id uuid default null, p_token text default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.get_poll_by_link(p_poll_id,p_voter_id,p_token)
$$;
revoke all on function private.get_poll_by_link(uuid,uuid,text),public.get_poll_by_link(uuid,uuid,text) from public,anon,authenticated;
grant execute on function private.get_poll_by_link(uuid,uuid,text),public.get_poll_by_link(uuid,uuid,text) to anon,authenticated;

create or replace function private.my_voted_polls(p_voter_id uuid,p_token text) returns setof jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' or not exists(
    select 1 from private.soft_participants where id=p_voter_id
      and token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
  ) then raise exception 'PARTICIPANT_REQUIRED' using errcode='42501'; end if;
  return query select to_jsonb(p) || jsonb_build_object(
    'poll_options',coalesce((select jsonb_agg(to_jsonb(o) order by o.position) from public.poll_options o where o.poll_id=p.id),'[]'::jsonb),
    'votes',jsonb_build_array(jsonb_build_object('count',(select count(*) from public.votes all_votes where all_votes.poll_id=p.id)))
  ) from public.votes v join public.polls p on p.id=v.poll_id
    where v.voter_id=p_voter_id::text order by v.created_at desc limit 5;
end $$;
create or replace function public.my_voted_polls(p_voter_id uuid,p_token text) returns setof jsonb
language sql security invoker set search_path = '' as $$ select * from private.my_voted_polls(p_voter_id,p_token) $$;
revoke all on function private.my_voted_polls(uuid,text),public.my_voted_polls(uuid,text) from public,anon,authenticated;
grant execute on function private.my_voted_polls(uuid,text),public.my_voted_polls(uuid,text) to anon,authenticated;

create or replace function private.submit_vote(p_poll_id uuid,p_voter_id uuid,p_token text,p_ranking jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare target public.polls%rowtype;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' or not exists(
    select 1 from private.soft_participants where id = p_voter_id
      and token_hash = encode(extensions.digest(p_token,'sha256'),'hex')
  ) then raise exception 'PARTICIPANT_REQUIRED' using errcode = '42501'; end if;
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
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' or not exists(
    select 1 from private.soft_participants where id=p_voter_id
      and token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
  ) then raise exception 'PARTICIPANT_REQUIRED' using errcode='42501'; end if;
  return query select c.* from public.poll_comments c where c.voter_id=p_voter_id;
end $$;
notify pgrst, 'reload schema';

