# BothPls 上线手册：Vercel + Supabase

## 0. 现状

| 项 | 现状 |
|---|---|
| 前端 | React 18 + Vite 7 + React Router 7（`createBrowserRouter`），纯静态 SPA |
| 后端 | Supabase Postgres，三表 `polls` / `poll_options` / `votes` |
| 本地存储 | 评论、评论可见性、个人设置、匿名 voter ID 存浏览器 LocalStorage，不入库 |
| 仓库 | `github.com/sd5913/The-Aliien-Repo`，部署分支 `main` |
| 构建 | `npm run build` = `tsc -b && vite build`，输出目录 `dist` |

环境变量前缀是 `VITE_`（Vite 在构建时静态替换），不是 Next.js 的 `NEXT_PUBLIC_`。

---

## 1. 本地开发

### 1.1 安装依赖

```powershell
cd E:\xyt\bothpls\The-Aliien-Repo
npm install
```

### 1.2 环境变量

复制 `.env.example` 为 `.env`，填入项目值：

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable 或 anon key>
```

`.env` 已在 `.gitignore` 中忽略，不会提交；`.env.example` 只放占位值。

### 1.3 本地运行与复核构建

```powershell
npm run dev      # 开发服务器，默认 http://localhost:5173
npm run build    # 类型检查 + 生产构建
npm run preview  # 预览 dist 产物，默认 http://localhost:4173
```

本地预览逐个打开并直接刷新：`/`、`/create`、`/poll/<现有投票 id>`、`/poll/<id>/results`、`/settings`。

---

## 2. Supabase 后端

### 2.1 表结构

在 Supabase Dashboard → SQL Editor → New query，把仓库 `supabase/schema.sql` 全文粘进去运行。三表：

- `polls`：标题、说明、状态、作者标识、是否公开、表情、创建时间、关闭时间。
- `poll_options`：所属投票、选项文案、图片、排序位置，随投票级联删除。
- `votes`：所属投票、投票者标识、`ranking` jsonb（单选时只含一个选项 id）、提交时间；`(poll_id, voter_id)` 唯一。

### 2.2 RLS 策略

原型无登录鉴权，策略放开匿名读与匿名写（与线上测试定位一致）：

- 三表 `select using (true)`。
- 三表 `insert with check (true)`。
- 三表 `update using (true) with check (true)`、`delete using (true)`，用于结束投票、编辑、改票（upsert 冲突走 update）、删除投票。

正式版应接 Supabase Auth，按作者收窄更新 / 删除权限。

> 如果线上库只执行过早期的 select/insert 脚本，需要补跑 `supabase/schema.sql` 中 update/delete 策略段，否则结束、编辑、改票、删除会被 RLS 拒绝。

---

## 3. SPA 回退

仓库根目录已有 `vercel.json`：

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Vercel 对不存在的路径默认 404，而 `/poll/:id` 这类路径只存在于浏览器端路由；没有这条规则，从聊天里点开的投票链接会直接 404。

---

## 4. 推送 GitHub

```powershell
cd E:\xyt\bothpls\The-Aliien-Repo
git add .
git commit -m "feat: connect polls to Supabase three-table schema"
git push origin main
```

本地 `feat/#2` 已通过 PR 合并进 `main`，Vercel 导入以 `main` 为准。

---

## 5. Vercel 新建项目

旧 v0 项目无法换绑 Git provider，GitHub 部署需要在 Vercel 新建项目导入仓库，不会挂到现有 v0 项目上。

1. Vercel → Add New → Project → Import Git Repository → 授权并选中 `sd5913/The-Aliien-Repo`。
2. 配置按下表填，其余保持默认：

| 配置项 | 值 |
|---|---|
| Framework Preset | Vite |
| Root Directory | `./`（`package.json` 在仓库根） |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Node.js Version | 22.x |

### 5.1 环境变量

Project → Settings → Environment Variables，新增两条，Production / Preview / Development 全勾：

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | publishable 或 anon key |

保存后必须手动 Redeploy：Vite 环境变量在构建时静态替换，改变量不重新构建不会生效。

### 5.2 域名切换（验证通过后再做）

新项目部署验证通过后，把 `bothpls.vercel.app` 从旧 v0 项目解绑，再绑到新项目；在此之前线上 v0 版本继续可用。

---

## 6. 验收清单

| # | 动作 | 预期 | 失败先查 |
|---|---|---|---|
| 1 | 生产域名打开首页 | 正常渲染，无白屏 | `vercel.json` rewrite / Output 是否 `dist` |
| 2 | 地址栏直接开 `/poll/<id>` 并刷新 | 正常显示，不 404 | SPA 回退规则 |
| 3 | 手机浏览器创建投票 | 主表与选项写入成功 | Build env 是否设置并 Redeploy |
| 4 | 把链接发给另一台设备投票 | 对方能看到同一投票 | Network 是否有 `rest/v1/polls` / `poll_options` / `votes` 请求 |
| 5 | 回到创建者设备刷新 | 票数同步 | `votes` upsert 是否成功 |
| 6 | 关闭一条投票 | 状态变 closed，他人刷新可见 | RLS update 策略 |
| 7 | 删除一条投票后刷新 | 列表不再出现 | RLS delete 策略与外键级联 |
| 8 | 新设备首次打开 | 显示线上已有数据，不是空白 | 环境变量与 Supabase 网络 |

---

## 7. 常见问题对照

| 现象 | 原因 | 处理 |
|---|---|---|
| 白屏 / `/poll/xxx` 404 | 没配 `vercel.json`，或 Output Directory 不是 `dist` | 补 rewrite、改输出目录后 Redeploy |
| 首页正常但不共享数据 | Supabase 环境变量、RLS 或请求配置错误 | 确认 Network 有 `rest/v1/polls` 请求并查看 Supabase API 日志 |
| 401 / `new row violates row-level security` | 策略没建全或 SQL 没跑完 | SQL Editor 重跑 `supabase/schema.sql` |
| 改了环境变量线上仍报缺少变量 | 没有 Redeploy | Deployments → Redeploy |
| `Invalid API key` | 变量名少了 `VITE_` 前缀，或值带引号 / 空格 | 重新粘贴，不要带引号 |
| CORS 报错 | Project URL 填成了 dashboard 网址 | 用 `https://<ref>.supabase.co` |
| 免费版 7 天无请求项目被 pause | Supabase Nano 休眠 | dashboard 点 Restore，演示前先唤醒 |
| 国内访问 `*.vercel.app` 慢或超时 | 网络线路问题 | 绑自定义域名，或演示前预热 |

---

## 8. 数据模型备注

- 投票是固定单选：`votes.ranking` 存单元素选项 id 数组；结果按 `ranking[0]` 统计。
- 评论挂在投票下，本期存本地；个人昵称随本地 voter 标识保存，不落 `votes` 表。
- 多人并发投票是各写各的 `votes` 行，`(poll_id, voter_id)` 唯一约束保证同一人重复投票只保留最新一条，不存在单文档整体覆盖问题。
