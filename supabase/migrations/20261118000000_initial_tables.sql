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
