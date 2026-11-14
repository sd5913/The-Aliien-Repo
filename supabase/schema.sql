-- BothPls 线上表结构（规范化三表）
-- Project: zptfqvufzsvlzmkdcfeb
-- 在 Supabase Dashboard -> SQL Editor -> New query 中整段执行

-- 投票主表
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'closed')),
  author_name text default 'Picksy friend',
  is_public boolean not null default true,
  emoji text,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

-- 投票选项
create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  image_url text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- 投票记录；ranking 为选项 id 的有序数组，单选时只含一个元素
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  voter_id text not null,
  ranking jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (poll_id, voter_id)
);

create index if not exists idx_poll_options_poll on public.poll_options(poll_id);
create index if not exists idx_votes_poll on public.votes(poll_id);

-- Row Level Security：原型无登录鉴权，公开读、匿名读写
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.votes enable row level security;

-- 读
create policy "polls public read" on public.polls for select using (true);
create policy "options public read" on public.poll_options for select using (true);
create policy "votes public read" on public.votes for select using (true);

-- 写
create policy "polls anon insert" on public.polls for insert with check (true);
create policy "options anon insert" on public.poll_options for insert with check (true);
create policy "votes anon insert" on public.votes for insert with check (true);

-- 结束投票 / 编辑 / 改票(upsert) / 删除
create policy "polls anon update" on public.polls for update using (true) with check (true);
create policy "polls anon delete" on public.polls for delete using (true);
create policy "options anon update" on public.poll_options for update using (true) with check (true);
create policy "options anon delete" on public.poll_options for delete using (true);
create policy "votes anon update" on public.votes for update using (true) with check (true);
create policy "votes anon delete" on public.votes for delete using (true);

-- 说明：
-- 1) 评论与用户设置本期存在浏览器 localStorage，不建后端表。
-- 2) 匿名放开 update/delete 仅限测试原型；正式版应接 Supabase Auth 并按作者收窄写入权限。
