create or replace function private.submit_vote(p_poll_id uuid,p_voter_id uuid,p_token text,p_ranking jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare target public.polls%rowtype;
begin
  if not private.is_account_voter(p_voter_id) then raise exception 'ACCOUNT_REQUIRED' using errcode='42501'; end if;
  select * into target from public.polls where id = p_poll_id for update;
  if not found then raise exception 'POLL_NOT_FOUND' using errcode = '22023'; end if;
  if target.owner_id = auth.uid() then raise exception 'POLL_OWNER_CANNOT_VOTE' using errcode = '42501'; end if;
  if target.status <> 'open' or (target.closed_at is not null and target.closed_at <= clock_timestamp()) then
    raise exception 'POLL_CLOSED' using errcode = '22023'; end if;
  if coalesce(jsonb_typeof(p_ranking),'') <> 'array' then raise exception 'SINGLE_OPTION_REQUIRED' using errcode = '22023'; end if;
  if jsonb_array_length(p_ranking) <> 1 or not exists(
    select 1 from public.poll_options where poll_id = p_poll_id and id::text = p_ranking->>0
  ) then raise exception 'INVALID_OPTION' using errcode = '22023'; end if;
  insert into public.votes(poll_id,voter_id,ranking) values(p_poll_id,p_voter_id::text,p_ranking)
    on conflict(poll_id,voter_id) do update set ranking = excluded.ranking,created_at = clock_timestamp();
end $$;
