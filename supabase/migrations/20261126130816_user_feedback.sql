-- Feedback is an inbox: browsers may submit, but only trusted operators may read.
create table public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  page text not null check (char_length(btrim(page)) between 1 and 500),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  body text not null check (char_length(btrim(body)) between 1 and 3000),
  contact text check (contact is null or char_length(btrim(contact)) between 1 and 200),
  screenshot_path text check (screenshot_path is null or screenshot_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/screenshot\.(jpg|png|webp)$'),
  locale text not null check (locale in ('zh-CN', 'en-US', 'ko-KR')),
  app_version text not null check (char_length(app_version) between 1 and 32),
  created_at timestamptz not null default now()
);
alter table public.user_feedback enable row level security;
revoke all on public.user_feedback from public, anon, authenticated;
grant insert (page, title, body, contact, screenshot_path, locale, app_version)
  on public.user_feedback to anon, authenticated;
grant all on public.user_feedback to service_role;
create policy "visitors submit feedback" on public.user_feedback
  for insert to anon, authenticated with check (true);

-- Private screenshots can be viewed by the team in Storage, never via public URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback-screenshots', 'feedback-screenshots', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']);
create policy "visitors upload feedback screenshots" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'feedback-screenshots'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/screenshot\.(jpg|png|webp)$');
