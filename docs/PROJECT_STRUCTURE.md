# BothPls 项目结构

## 技术栈

React 18 + React Router 7 + Vite 7 + TypeScript。投票主链路（投票、选项、票数）保存在 Supabase Postgres 三表；评论、评论可见性与个人设置本期留在浏览器 LocalStorage，尚未落库。

## 源码目录（实际现状）

```text
src/
├── app/
│   ├── App.tsx                          # 根组件，挂载 RouterProvider
│   └── router.tsx                       # 路由表，注册全部生效页面
├── components/
│   ├── layout/
│   │   ├── BottomNav.tsx                # 底部主导航：首页 / 发起投票 / 个人
│   │   └── PageShell.tsx                # 页面框架：顶栏、返回键、底部导航、footer
│   └── ui/
│       ├── Modal.tsx                    # 通用弹窗（删除确认、分享等）
│       ├── PurpleButton.tsx             # 主按钮
│       ├── StatusPill.tsx               # 投票状态标签（进行中 / 已结束）+ isPollOpen
│       └── Toast.tsx                     # 轻提示
├── features/
│   ├── home/
│   │   └── pages/
│   │       └── HomePage.tsx              # 首页：欢迎区、三步说明、最近投票
│   ├── polls/
│   │   ├── components/
│   │   │   ├── CommentList.tsx           # 评论列表
│   │   │   ├── OptionCarousel.tsx        # 投票选项轮播
│   │   │   ├── PollCard.tsx              # 投票卡片（首页最近列表）
│   │   │   ├── ResultBubbles.tsx         # 结果气泡占比
│   │   │   └── StatusPill.tsx            # 遗留重复组件，仅 ManagementPages 引用
│   │   ├── hooks/
│   │   │   └── usePolls.ts               # 投票列表状态与增删改；按字段分流到三表或本地
│   │   ├── pages/
│   │   │   ├── CreatePollPage.tsx         # 创建 / 编辑投票页
│   │   │   ├── ManagementPages.tsx        # 投票管理页 PollManagementPage（结束投票、评论管理）
│   │   │   ├── MyPollsPage.tsx           # 我的投票概览（含列表区块 MyPollsSection）
│   │   │   ├── ResultsPage.tsx           # 投票结果页
│   │   │   └── VotingPage.tsx             # 参与投票页
│   │   ├── services/
│   │   │   └── polls.ts                   # 三表读写：polls / poll_options / votes
│   │   └── utils/
│   │       └── voting.ts                  # 投票状态、模式、计分、昵称等工具
│   └── settings/
│       ├── components/
│       │   └── ProfileSettingsSection.tsx # 个人资料编辑区块（头像 / 昵称 / 邮箱）
│       ├── hooks/
│       │   └── useUserSettings.ts         # 用户设置状态，读写本地存储
│       ├── pages/
│       │   ├── SettingsPage.tsx           # 个人主页：资料摘要 + 我的投票列表
│       │   └── SettingsPreferencesPage.tsx # 设置页：资料编辑 + 相机 / 相册 / 隐私
│       └── services/
│           └── settings.ts                # 用户偏好本地读写与默认值
├── lib/
│   ├── storage/
│   │   ├── localStorage.ts                # 安全 JSON 读写与存储 key
│   │   └── pollLocal.ts                   # 评论与评论可见性的本地存储
│   └── supabase/
│       └── client.ts                      # Supabase 浏览器客户端（读 VITE_ 环境变量）
├── types/
│   └── poll.ts                           # 投票、选项、投票记录、评论等核心类型
├── main.tsx                              # 浏览器入口，挂载 React 应用
├── vite-env.d.ts                         # import.meta.env 类型声明
└── styles.css                            # 全局样式
```

## 页面总数（产品口径）

当前产品页面总数更新为 **14 个**。其中登录 / 注册共用 1 个页面；编辑投票复用创建投票页；最近投票概览、商品选择与评论区等均属于页面内模块，不重复计数。

1. Login 登录页（未登录投票入口）
2. 参与投票页
3. 结果页
4. Login / Sign in 登录注册页（与第 1 项合并实现）
5. 首页
6. 个人主页
7. 个人信息页
8. 设置页
9. 全部投票概览页
10. 介绍 / 快捷键说明页
11. 步骤说明页
12. 创建投票页（编辑投票复用）
13. 投票详情页
14. 分享详情页（分享卡片预览、标题、图片、选项个数、时间）

确认弹窗共 **2 个**：删除投票二次确认、结束投票二次确认（仅限发起者）。

## 路由表（当前已实现的路由入口）

| 路径 | 页面组件 | 文件 | 说明 |
|---|---|---|---|
| `/` | HomePage | features/home/pages/HomePage.tsx | 首页 |
| `/settings` | SettingsPage | features/settings/pages/SettingsPage.tsx | 个人主页，资料摘要 + 我的投票 |
| `/settings/preferences` | SettingsPreferencesPage | features/settings/pages/SettingsPreferencesPage.tsx | 设置页，资料编辑 + 权限 + 隐私 |
| `/create` | CreatePollPage | features/polls/pages/CreatePollPage.tsx | 创建投票；带 `?id=` 时复用为编辑页 |
| `/poll/:id` | VotingPage | features/polls/pages/VotingPage.tsx | 参与投票页 |
| `/poll/:id/manage` | PollManagementPage | features/polls/pages/ManagementPages.tsx | 投票管理页：参与人数、结束投票、评论管理 |
| `/poll/:id/results` | ResultsPage | features/polls/pages/ResultsPage.tsx | 投票结果页，含评论与分享弹窗 |
| `/poll/:id/share` | SharePage | features/polls/pages/SharePage.tsx | 分享详情页，含分享卡片预览与公开链接 |

## 数据划分

- 落 Supabase 三表：
  - `polls`：标题、说明、状态、作者标识、截止/关闭时间。
  - `poll_options`：选项文案、图片、排序位置。
  - `votes`：投票者标识、排序（单选时只含一个选项 id）、提交时间；`(poll_id, voter_id)` 唯一。
- 留浏览器本地：评论、评论是否公开、个人资料与偏好；匿名 voter ID 也存本地。

## 页面规划对照（对照 user flow）

### 已落地

- 首页
- 创建 / 编辑投票页（编辑复用创建页，通过 `?id=` 进入）
- 参与投票页
- 结果页
- 我的投票概览页
- 个人主页
- 设置页
- 投票管理页（结束投票、评论编辑/删除、评论可见性开关）
- 分享详情页（长页面，展示标题、图片、选项个数、时间与分享操作）

### 不单独成页

- 介绍 / 快捷键说明、步骤说明：当前内嵌在首页的说明卡片，不额外拆分独立实现页。

### 待定（登录手段与后端 API 确定后再定）

- 登录 / 注册页：当前无账号体系，参与者用本地生成的匿名标识；待接 Supabase Auth 后补充。

## 遗留与已知缺口

- `features/polls/components/StatusPill.tsx` 是重复组件，仅被 ManagementPages 引用；现行其他页面统一使用 `components/ui/StatusPill.tsx`。
- 评论与个人设置本期未入库，换设备或清浏览器数据后丢失；后续按需补后端表。
- RLS 当前原型放开匿名读写，正式版应接 Auth 并按作者收窄更新 / 删除权限。

## 职责划分

- `app/`：应用根组件与路由定义，全局 provider 放在这里。
- `components/`：跨页面复用的布局与 UI 组件。
- `features/home/`：首页及其专用内容。
- `features/polls/`：投票相关页面、组件、hooks、数据操作与投票规则，状态与规则保持在本 feature 内。
- `features/settings/`：个人主页、设置与个人资料相关内容。
- `lib/`：跨 feature 的通用基础设施，如 Supabase 客户端与浏览器存储工具。
- `types/`：跨 feature 共享的类型定义。
- `styles.css`：全局样式；页面或 feature 专属样式随对应 feature 维护。

## 在哪里加代码

- 新页面放到对应 feature 的 `pages/` 目录，再在 `app/router.tsx` 注册 URL。
- 只被单个 feature 使用的组件放该 feature 的 `components/`；真正跨 feature 复用的布局或 UI 组件放 `components/`。
- feature 专属状态 hooks 留在该 feature 的 `hooks/`；跨 feature 共享的 hooks 再上移。
- 只有对应实现存在时再新建目录，避免空文件夹和多余层级。
