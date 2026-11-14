-- BothPls 上线测试用最小表结构（单表 + JSONB）
-- 在 Supabase Dashboard -> SQL Editor -> New query 中整段执行

create table if not exists public.polls (
  id          text primary key,
  doc         jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists polls_updated_at_idx on public.polls (updated_at desc);

-- 每次 update 自动刷新 updated_at，前端用它排序
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists polls_touch on public.polls;
create trigger polls_touch
before update on public.polls
for each row execute function public.touch_updated_at();

-- RLS：测试阶段允许匿名读写（anon key 会出现在前端，必须靠 RLS 兜住）
alter table public.polls enable row level security;

drop policy if exists "polls_select_anon" on public.polls;
create policy "polls_select_anon" on public.polls
for select to anon, authenticated using (true);

drop policy if exists "polls_insert_anon" on public.polls;
create policy "polls_insert_anon" on public.polls
for insert to anon, authenticated with check (true);

drop policy if exists "polls_update_anon" on public.polls;
create policy "polls_update_anon" on public.polls
for update to anon, authenticated using (true) with check (true);

drop policy if exists "polls_delete_anon" on public.polls;
create policy "polls_delete_anon" on public.polls
for delete to anon, authenticated using (true);

-- 说明：
-- 1) doc 列存完整的 Poll 对象（options / votes / comments 都在里面），
--    这样前端 service 层改动最小，先把上线链路跑通。
-- 2) 并发投票是「读出整个 doc -> 修改 -> 整体写回」，多人同时投同一投票
--    理论上可能后写覆盖前写。要彻底避免，改用 votes 独立表方案（见 docs/DEPLOYMENT_VERCEL_SUPABASE.md 附录 A）。
-- 3) 这套策略允许任何拿到 anon key 的人删投票，仅限上线测试期使用；
--    正式版应接 Supabase Auth（或匿名登录 + Edge Function）收窄写入权限。
