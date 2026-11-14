# BothPls 上线测试手册：Vercel + Supabase

## 0. 先看现状（决定了步骤顺序）

| 项 | 现状 | 对上线的含义 |
|---|---|---|
| 前端 | React 18 + Vite 7 + React Router 7（`createBrowserRouter`） | 纯静态站点，Vercel 必须配 SPA 回退，否则 `/poll/:id` 刷新 404 |
| 数据 | 全部在 localStorage，key `bothpls:polls:v1`，读写集中在 `src/features/polls/services/polls.ts` | 直接部署后每人各自一份数据，分享链接投票无效，这是必须接 Supabase 的原因 |
| 仓库 | `github.com/sd5913/The-Aliien-Repo`，当前分支 `feat/#2` 领先远端 1 个提交 | 先 push，否则 Vercel 构建的是旧代码 |
| 构建 | 本机 `npm run build` 已验证通过（tsc -b + vite build，dist JS 285 KB / gzip 91 KB） | 构建链路没问题，可以直接部署 |

结论：分两个阶段，不要合并。

- 阶段 A：只验证 Vercel 部署链路能不能跑通，约 20–30 分钟。此时数据仍在本机。
- 阶段 B：接 Supabase，让「把链接发给朋友、朋友投票、你这边看到票数」真实成立，约 1.5–2 小时。

先做 A 的理由：静态部署先跑通，后面接后端出问题时，能立刻判断是 Vercel 的问题还是 Supabase 的问题。

---

## 阶段 A：Vercel 静态部署

### A1. 本地复核构建

```powershell
cd E:\xyt\bothpls\The-Aliien-Repo
npm run build
npm run preview
```

打开 `http://localhost:4173`，逐个点一遍并直接刷新：

- `/`
- `/create`
- `/poll/seed-coat`
- `/poll/seed-coat/results`
- `/settings`

记下这里就坏掉的页面，别带去 Vercel。

### A2. 加 SPA 回退（关键一步）

在仓库根目录新建 `vercel.json`：

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

原因：Vercel 对不存在的路径默认返回 404，而 `/poll/xxx` 这类路径只存在于浏览器端路由。没有这条规则，从微信/聊天里点开的投票链接会直接 404。

如果部署后发现 `/assets/*.js` 也 404，把 source 改成 `"/((?!assets/).*)"`。

### A3. 推送代码

```powershell
cd E:\xyt\bothpls\The-Aliien-Repo
git add vercel.json
git commit -m "chore: add vercel SPA rewrite for client routes"
git push origin feat/#2
```

本地 `feat/#2` 领先远端 1 个提交，这次 push 会一起推上去。推完在 GitHub 上确认文件已经出现。

### A4. Vercel 建项目

1. 打开 `vercel.com`，用 GitHub 账号登录（Hobby 免费版够测试用）。
2. Add New → Project → Import Git Repository → 授权并选中 `sd5913/The-Aliien-Repo`。
3. 配置按下表填，其余保持默认：

| 配置项 | 值 |
|---|---|
| Framework Preset | Vite |
| Root Directory | `./`（`package.json` 就在仓库根） |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Node.js Version | 22.x（与本机验证环境一致） |

4. 点 Deploy，等 1–2 分钟，拿到 `https://xxx.vercel.app`。

### A5. 阶段 A 验收

- [ ] 生产域名首页能打开
- [ ] 直接粘贴 `/poll/seed-coat` 到地址栏回车，刷新不 404
- [ ] 手机浏览器能打开，底部导航不被安全区遮住
- [ ] 创建一条投票后刷新，数据还在

此阶段分享给别人的效果：对方看到的是他自己浏览器里的 seed 数据，你新建的投票他看不到。这不是 bug，是 localStorage 的必然结果，进入阶段 B 解决。

---

## 阶段 B：接 Supabase

### B1. 建 Supabase 项目

1. `supabase.com` → Continue with GitHub。
2. New project：
   - Name：`bothpls`
   - Region：`Southeast Asia (Singapore)` / `ap-southeast-1`（深圳访问延迟最低）
   - Database Password：生成并保存到本地密码管理器
   - Plan：Free
3. 等待约 2 分钟初始化完成。
4. Project Settings → API：复制两个值
   - Project URL：`https://xxxx.supabase.co`
   - anon public key：`eyJ...`

两个必须记住的点：

- anon key 打进前端包是正常的，它的权限完全由 RLS 决定，不要试图隐藏它。
- `service_role` key 绝对不能出现在前端代码或 Vercel 环境变量里，它会绕过 RLS。

### B2. 建表

SQL Editor → New query → 把 `supabase/schema.sql` 全文粘进去 → Run。

表结构：`polls(id text 主键, doc jsonb, created_at, updated_at)`。

为什么用单表 JSONB 而不是规范 4 张表：现在的 `Poll` 是 `options` / `votes` / `comments` 三层嵌套，所有页面都直接读 `poll.votes`、`poll.comments`。拆成 4 张表要把每个页面都改一遍，上线测试阶段没必要。jsonb 让 service 层几乎不动，先把链路跑通。

必须知道的风险：jsonb 更新是「读出整个对象 → 改 → 整体写回」，两个人同时投同一个投票时可能后写覆盖前写，丢 1 票。课程演示级别可接受；要做多人同时投票，用附录 A 的 `votes` 独立表方案。

### B3. 装依赖与环境变量

```powershell
cd E:\xyt\bothpls\The-Aliien-Repo
npm i @supabase/supabase-js
```

新建 `.env.local`（只放本地，不提交）：

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

在 `.gitignore` 末尾追加（当前文件没有忽略 env，不加会把 key 推上 GitHub）：

```
.env
.env.local
.env.*.local
```

### B4. 新建 client

`src/lib/supabase/client.ts`：

```ts
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(url, anonKey);
```

`src/vite-env.d.ts`（不存在就新建）：

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### B5. 改数据层（3 个文件）

**1. `src/features/polls/services/polls.ts`**

保留原来的 localStorage 函数（本地开发和离线兜底还能用），把 `seedPolls` 改成导出，并追加：

```ts
import { supabase } from "../../../lib/supabase/client";

function toRow(poll: Poll) {
  return { id: poll.id, doc: poll };
}

export async function fetchPolls(): Promise<Poll[]> {
  const { data, error } = await supabase
    .from("polls")
    .select("doc")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const rows = data ?? [];
  if (rows.length === 0) {
    const { error: seedError } = await supabase
      .from("polls")
      .upsert(seedPolls.map(toRow), { onConflict: "id" });
    if (seedError) throw seedError;
    return seedPolls;
  }

  return rows.map((row) => row.doc as Poll);
}

export async function upsertPoll(poll: Poll): Promise<void> {
  const { error } = await supabase
    .from("polls")
    .upsert(toRow(poll), { onConflict: "id" });
  if (error) throw error;
}

export async function deletePollRemote(pollId: string): Promise<void> {
  const { error } = await supabase.from("polls").delete().eq("id", pollId);
  if (error) throw error;
}
```

注意：`seedPolls` 目前是 `const seedPolls`，改成 `export const seedPolls`。

**2. `src/features/polls/hooks/usePolls.ts`**

改成异步加载，同时保留原来的同步写本地作为兜底：

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { Poll } from "../../../types/poll";
import {
  deletePollRemote,
  fetchPolls,
  upsertPoll,
} from "../services/polls";

export function usePolls() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const pollsRef = useRef<Poll[]>([]);

  useEffect(() => {
    pollsRef.current = polls;
  }, [polls]);

  useEffect(() => {
    let alive = true;
    fetchPolls()
      .then((data) => {
        if (alive) setPolls(data);
      })
      .catch((error) => console.error("BothPls: 加载投票失败", error))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const savePoll = useCallback(async (poll: Poll) => {
    const next = [poll, ...pollsRef.current.filter((item) => item.id !== poll.id)];
    pollsRef.current = next;
    setPolls(next);
    await upsertPoll(poll);
  }, []);

  const updatePoll = useCallback(
    async (pollId: string, update: (poll: Poll) => Poll) => {
      let changed: Poll | undefined;
      const next = pollsRef.current.map((poll) => {
        if (poll.id !== pollId) return poll;
        changed = update(poll);
        return changed;
      });
      if (!changed) return;
      pollsRef.current = next;
      setPolls(next);
      await upsertPoll(changed);
    },
    [],
  );

  const removePoll = useCallback(async (pollId: string) => {
    const next = pollsRef.current.filter((poll) => poll.id !== pollId);
    pollsRef.current = next;
    setPolls(next);
    await deletePollRemote(pollId);
  }, []);

  return { polls, loading, savePoll, updatePoll, removePoll };
}
```

**3. 三个调用点加 `await`**

| 文件 | 现有调用 | 改成 |
|---|---|---|
| `src/features/polls/pages/CreatePollPage.tsx` | `savePoll(poll);` | `await savePoll(poll);` |
| `src/features/polls/pages/VotingPage.tsx` | `updatePoll(poll.id, (current) => { ... });` | `await updatePoll(...)`，回调需改成 `async` |
| `src/features/polls/pages/MyPollsPage.tsx` | `removePoll(deleting.id);` / `updatePoll(poll.id, ...)` | 加 `await`，或 `void removePoll(...).catch(...)` 避免未捕获 Promise |

页面对应函数如果还不是 `async`，先把 handler 改成 `async`。`voting.ts` 里的纯计算不用动。

### B6. 本地联调（改完立刻验，不要先部署）

```powershell
npm run dev
```

用两个浏览器 Profile（Chrome 正常窗口 + Edge/无痕），不要用同一 Profile 的两个标签：

1. A 窗口创建投票，复制 `/poll/:id` 链接
2. B 窗口打开链接，投一票并留评论
3. A 窗口刷新，票数应 +1，评论应出现
4. Supabase → Table Editor → `polls` 表，应能看到该行 `doc` 已更新

任何一步失败，先查第 4 节的对照表，不要带着问题继续部署。

### B7. Vercel 环境变量 + 重部署

1. Vercel Project → Settings → Environment Variables，新增两条：

| Name | Value | Environments |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | Production / Preview / Development 全勾 |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | 同上 |

2. 保存后必须手动 Redeploy：Deployments → 最新一条 → `⋯` → Redeploy。
   原因：Vite 的环境变量在 build 时静态替换进代码，改变量不重新构建不会生效，这条最容易踩。
3. 重新打开生产域名，把 B6 的四步再走一遍。

---

## 3. 上线测试清单

| # | 动作 | 预期 | 失败先查 |
|---|---|---|---|
| 1 | 生产域名打开首页 | 正常渲染，无白屏 | A2 的 rewrite / Output 是否 dist |
| 2 | 地址栏直接开 `/poll/seed-coat` 并刷新 | 正常显示投票页 | SPA 回退 |
| 3 | 手机用 4G 打开，创建投票 | 创建成功 | Build env 是否设置并 Redeploy |
| 4 | 把 `/poll/:id` 发给另一台设备投票 | 对方能看到同一投票 | 是否真的走了 `fetchPolls` |
| 5 | 回到创建者设备刷新 | 票数、评论同步 | `await` 是否加上 |
| 6 | MyPolls 里关闭一条投票 | 状态变 closed，他人刷新可见 | `updatePoll` 写库是否成功 |
| 7 | 删除一条投票后刷新 | 列表不再出现 | delete policy |
| 8 | 新设备首次打开（本地无缓存） | 显示 seed 或线上数据，不是空白 | seed upsert 是否成功 |
| 9 | 断网 → 恢复 → 刷新 | 恢复后能正常加载 | 网络与 Supabase 状态 |
| 10 | Supabase Logs → API 查看请求 | 有 `GET /rest/v1/polls` 200 | 401 说明 RLS/密钥问题 |

---

## 4. 常见问题对照

| 现象 | 原因 | 处理 |
|---|---|---|
| 白屏 / `/poll/xxx` 404 | 没配 `vercel.json`，或 Output Directory 不是 `dist` | 补 rewrite、改输出目录后 Redeploy |
| 首页正常但不共享数据 | service 还在走 localStorage，或页面没 `await` | 按 B5 三处改完，确认 Network 有 `rest/v1/polls` 请求 |
| 401 / `new row violates row-level security` | `schema.sql` 没执行完，或 policy 没建 | SQL Editor 重跑整段 |
| 改了环境变量线上仍报缺少变量 | 没有 Redeploy | Deployments → Redeploy |
| `Invalid API key` | 变量名少了 `VITE_` 前缀，或值里带了引号/空格 | 重新粘贴，不要带引号 |
| CORS 报错 | Project URL 填成了 dashboard 网址 | 用 `https://xxxx.supabase.co` |
| 第二台设备打开还是 seed | 请求没发出，走了 localStorage 兜底 | 检查 import 路径与 `fetchPolls` 调用 |
| 项目突然连不上 | 免费版 7 天无请求会 pause | dashboard 点 Restore，测试前先唤醒 |
| 国内访问 `*.vercel.app` 慢或超时 | 网络线路问题，不是代码问题 | 绑自定义域名，或演示前预热 |
| 投票票数偶尔少 1 | jsonb 并发覆盖 | 演示前改用附录 A 的 votes 独立表 |

---

## 5. 附录 A：规范化表结构（要做真实多人并发时切换）

```sql
create table public.polls (
  id text primary key,
  title text not null,
  description text not null default '',
  creator_id text,
  comments_public boolean not null default true,
  ends_at timestamptz,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table public.poll_options (
  id text primary key,
  poll_id text not null references public.polls (id) on delete cascade,
  name text not null,
  image_url text,
  position int not null default 0
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  poll_id text not null references public.polls (id) on delete cascade,
  voter_id text not null,
  voter_nickname text not null,
  selected_option_id text,
  ranking text[] not null default '{}',
  submitted_at timestamptz not null default now()
);

create table public.poll_comments (
  id uuid primary key default gen_random_uuid(),
  poll_id text not null references public.polls (id) on delete cascade,
  vote_id uuid references public.votes (id) on delete set null,
  voter_id text not null,
  voter_nickname text not null,
  text text not null,
  option_id text,
  created_at timestamptz not null default now()
);

create index votes_poll_idx on public.votes (poll_id);
create index comments_poll_idx on public.poll_comments (poll_id);
```

投票变成一条 insert，天然不会互相覆盖；读取时用 join 组装回 `Poll`。代价是 `polls.ts`、`usePolls.ts` 和所有读 `poll.votes` 的组件都要改，所以留到最后一步再做。

---

## 6. 附录 B：时间预算与验收

| 阶段 | 耗时 | 产出 | 卡住怎么办 |
|---|---|---|---|
| A 静态部署 | 20–30 分钟 | 一个可分享的 `*.vercel.app` | 先看构建日志，再看 rewrite |
| B1–B2 建库建表 | 20 分钟 | Supabase 项目 + 表 | SQL 报错通常是重复执行，加 `if not exists` 可重跑 |
| B3–B5 改代码 | 40–60 分钟 | 数据真正走线上 | 先跑通 `fetchPolls`，再改写操作 |
| B6 本地联调 | 20 分钟 | 双浏览器共享验证 | 先看 Network，再看 Table Editor |
| B7 线上复验 | 10 分钟 | 生产环境可用 | 90% 是没 Redeploy |

最终验收只有一条：手机流量打开生产链接 → 把投票分享给不在同一网络的人 → 他投票 → 你刷新能看到这一票。
