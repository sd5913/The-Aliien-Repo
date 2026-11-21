alter table public.poll_comments
  drop constraint if exists poll_comments_nickname_check;

alter table public.poll_comments
  add constraint poll_comments_nickname_check
  check (char_length(btrim(nickname)) between 2 and 20);
