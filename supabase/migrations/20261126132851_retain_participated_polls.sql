-- Participation history stays available after manual closure or expiry.
-- Keep identity checks; do not filter by publication/status or cap history at five.
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
    order by latest_votes.last_voted_at desc,p.id desc;
end $$;

notify pgrst,'reload schema';
