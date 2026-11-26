-- Merge creation and participation before paging, so each request returns at most 11 cards.
create or replace function private.recent_polls(p_page integer default 0) returns setof jsonb
language plpgsql stable security definer set search_path='' as $$
declare account_id uuid := auth.uid();
begin
  if not private.is_account_voter(account_id) then raise exception 'ACCOUNT_REQUIRED' using errcode='42501'; end if;
  if p_page is null or p_page < 0 or p_page > 100000 then raise exception 'INVALID_PAGE' using errcode='22023'; end if;
  return query
  with activity as (
    select p.id as poll_id,p.created_at as activity_at,false as participated
      from public.polls p where p.owner_id=account_id
    union all
    select v.poll_id,v.created_at,true from public.votes v where v.voter_id=account_id::text
  ), combined as (
    select a.poll_id,max(a.activity_at) as activity_at,bool_or(a.participated) as participated
      from activity a group by a.poll_id
  ), page as (
    select c.* from combined c join public.polls p on p.id=c.poll_id
      order by c.activity_at desc,c.poll_id desc limit 11 offset (p_page*10)
  )
  select to_jsonb(p) || jsonb_build_object(
    'participated_by_current_identity',page.participated,
    'poll_options',coalesce((select jsonb_agg(to_jsonb(o) order by o.position) from public.poll_options o where o.poll_id=p.id),'[]'::jsonb),
    'votes',jsonb_build_array(jsonb_build_object('count',(select count(*) from public.votes v where v.poll_id=p.id)))
  ) from page join public.polls p on p.id=page.poll_id order by page.activity_at desc,page.poll_id desc;
end $$;

create or replace function public.recent_polls(p_page integer default 0) returns setof jsonb
language sql stable security invoker set search_path='' as $$
  select * from private.recent_polls(p_page);
$$;
grant usage on schema private to authenticated;
revoke all on function private.recent_polls(integer),public.recent_polls(integer) from public,anon,authenticated;
grant execute on function private.recent_polls(integer),public.recent_polls(integer) to authenticated;
notify pgrst,'reload schema';
