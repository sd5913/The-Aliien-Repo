alter table public.poll_options add column if not exists color_index smallint check (color_index between 0 and 4);

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
  insert into public.poll_options(id,poll_id,label,image_url,position,color_index)
    select (o->>'id')::uuid,target_poll_id,btrim(o->>'name'),o->>'imageUrl',ord::int - 1,(o->>'colorIndex')::smallint
    from jsonb_array_elements(p_poll->'options') with ordinality as x(o,ord)
  on conflict(id) do update set label = excluded.label, image_url = excluded.image_url, position = excluded.position,
    color_index = coalesce(excluded.color_index, public.poll_options.color_index);
  delete from public.poll_options po where po.poll_id = target_poll_id
    and po.id not in(select (o->>'id')::uuid from jsonb_array_elements(p_poll->'options') o);
  return target_poll_id;
end $$;
