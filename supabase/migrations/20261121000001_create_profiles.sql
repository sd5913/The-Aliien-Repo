create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  avatar_url text,
  bio text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles
for select to authenticated using (id = (select auth.uid()));

drop policy if exists "profiles write own" on public.profiles;
create policy "profiles write own" on public.profiles
for all to authenticated using (id = (select auth.uid()))
with check (id = (select auth.uid()));

grant select, insert, update on public.profiles to authenticated;
