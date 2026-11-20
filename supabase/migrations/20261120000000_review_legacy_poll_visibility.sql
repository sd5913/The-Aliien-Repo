-- Existing polls need an explicit owner decision before entering the square.
alter table public.polls add column if not exists visibility_reviewed_at timestamptz default now();

-- 2026-11-20 00:00 Asia/Shanghai. Keep link access through get_poll_by_link.
update public.polls set is_public = false, visibility_reviewed_at = null
where created_at < timestamptz '2026-11-20 00:00:00+08';

create or replace function private.set_poll_visibility(p_poll_id uuid, p_public boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null or not exists(select 1 from auth.users where id = actor and not is_anonymous) then
    raise exception 'ACCOUNT_REQUIRED' using errcode = '42501';
  end if;
  if p_public is null then raise exception 'INVALID_VISIBILITY' using errcode = '22023'; end if;
  update public.polls set is_public = p_public, visibility_reviewed_at = clock_timestamp()
  where id = p_poll_id and owner_id = actor;
  if not found then raise exception 'NOT_POLL_OWNER' using errcode = '42501'; end if;
end $$;

create or replace function public.set_poll_visibility(p_poll_id uuid, p_public boolean) returns void
language sql security invoker set search_path = '' as $$ select private.set_poll_visibility(p_poll_id,p_public) $$;

revoke all on function private.set_poll_visibility(uuid,boolean),public.set_poll_visibility(uuid,boolean) from public,anon,authenticated;
grant execute on function private.set_poll_visibility(uuid,boolean),public.set_poll_visibility(uuid,boolean) to authenticated;
notify pgrst, 'reload schema';
