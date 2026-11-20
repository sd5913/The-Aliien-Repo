create or replace function private.delete_account() returns void
language plpgsql security definer set search_path = ''
as $$
declare actor uuid := auth.uid();
begin
  if actor is null or not exists (
    select 1 from auth.users where id = actor and not is_anonymous
  ) then
    raise exception 'ACCOUNT_REQUIRED' using errcode = '42501';
  end if;
  delete from auth.users where id = actor;
end;
$$;

create or replace function public.delete_account() returns void
language sql security invoker set search_path = ''
as $$ select private.delete_account() $$;

revoke all on function private.delete_account(), public.delete_account() from public, anon, authenticated;
grant execute on function public.delete_account() to authenticated;
