# BothPls 项目结构

## 技术栈

React 18 + React Router 7 + Vite + TypeScript。当前为前端原型，投票数据与用户偏好保存在浏览器 LocalStorage，尚未接入后端 API。

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
│       ├── Modal.tsx                     # 通用弹窗（删除确认、分享等）
│       ├── PurpleButton.tsx             # 主按钮
│       ├── StatusPill.tsx                # 投票状态标签（进行中 / 已结束）+ isPollOpen
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
│   │   │   └── usePolls.ts               # 投票列表状态与增删改，同步 LocalStorage
│   │   ├── pages/
│   │   │   ├── CreatePollPage.tsx        # 创建 / 编辑投票页
│   │   │   ├── ManagementPages.tsx       # 遗留未接线文件，见下文
│   │   │   ├── MyPollsPage.tsx           # 我的投票概览（含列表区块 MyPollsSection）
│   │   │   ├── ResultsPage.tsx           # 投票结果页
│   │   │   └── VotingPage.tsx            # 参与投票页
│   │   ├── services/
│   │   │   └── polls.ts                  # 投票数据读写、种子数据
│   │   └── utils/
│   │       └── voting.ts                 # 投票状态、模式、计分、昵称等工具
│   └── settings/
│       ├── components/
│       │   └── ProfileSettingsSection.tsx # 个人资料编辑区块（头像 / 昵称 / 邮箱）
│       ├── pages/
│       │   ├── SettingsPage.tsx          # 个人主页：资料摘要 + 我的投票列表
│       │   └── SettingsPreferencesPage.tsx # 设置页：资料编辑 + 相机 / 相册 / 隐私
│       └── services/
│           └── settings.ts                # 用户偏好读写与默认值
├── lib/
│   └── storage/
│       └── localStorage.ts                # 安全 JSON 读写与存储 key
├── types/
│   └── poll.ts                           # 投票、选项、投票记录、评论等核心类型
├── main.tsx                              # 浏览器入口，挂载 React 应用
└── styles.css                            # 全局样式
```

## 路由表（现行生效页面）

| 路径 | 页面组件 | 文件 | 说明 |
|---|---|---|---|
| `/` | HomePage | features/home/pages/HomePage.tsx | 首页 |
| `/my` | MyPollsPage | features/polls/pages/MyPollsPage.tsx | 我的投票概览，含状态筛选标签 |
| `/settings` | SettingsPage | features/settings/pages/SettingsPage.tsx | 个人主页，资料摘要 + 我的投票 |
| `/settings/preferences` | SettingsPreferencesPage | features/settings/pages/SettingsPreferencesPage.tsx | 设置页，资料编辑 + 权限 + 隐私 |
| `/create` | CreatePollPage | features/polls/pages/CreatePollPage.tsx | 创建投票；带 `?id=` 时复用为编辑页 |
| `/poll/:id` | VotingPage | features/polls/pages/VotingPage.tsx | 参与投票页 |
| `/poll/:id/results` | ResultsPage | features/polls/pages/ResultsPage.tsx | 投票结果页，含评论与分享弹窗 |

## 页面规划对照（对照 user flow）

### 已落地

- 首页
- 创建 / 编辑投票页（编辑复用创建页，通过 `?id=` 进入）
- 参与投票页
- 结果页
- 我的投票概览页
- 个人主页
- 设置页

### 不单独成页

- 介绍 / 步骤说明：内嵌在首页的三步说明卡片，不设独立引导页。

### 待定（登录手段与后端 API 确定后再定）

- 个人信息编辑形态：暂不新建独立页面。倾向在设置页内做下拉展开，默认查看态，点击后进入编辑态，可修改头像、昵称、邮箱、密码等信息。具体字段、校验规则和保存方式待登录方案与 API 确定后再细化。
- 登录 / 注册页：待登录手段确定后补充。

## 遗留未接线文件

以下文件当前不被任何模块 import，也未在路由表注册，不影响运行，后续确认后可清理：

- `features/polls/pages/ManagementPages.tsx`：内含旧版 `MyPollsPage` 与 `PollManagementPage`。文件内跳转的 `/polls`、`/polls/new`、`/polls/:id/manage`、`/polls/:id/results` 在现行路由表中均不存在。
- `features/polls/components/StatusPill.tsx`：重复组件，仅被上面的遗留文件引用；现行页面统一使用 `components/ui/StatusPill.tsx`。

## 待补缺口（流程图有、现行原型未落地，供后续排期）

- 投票详情 / 管理独立页：参与人数、关闭时间、评论、选项个数、编辑入口、结束投票、管理评论。现行相关信息分散在 VotingPage 与 ResultsPage。
- 结束投票二次确认弹窗：现行页面没有结束投票入口。
- 分享面板已在结果页弹窗内实现（复制链接）；列表卡片分享为复制链接 + Toast。

## 职责划分

- `app/`：应用根组件与路由定义，全局 provider 放在这里。
- `components/`：跨页面复用的布局与 UI 组件。
- `features/home/`：首页及其专用内容。
- `features/polls/`：投票相关页面、组件、hooks、数据操作与投票规则，状态与规则保持在本 feature 内。
- `features/settings/`：个人主页、设置与个人资料相关内容。
- `lib/`：跨 feature 的通用基础设施，如浏览器存储工具。
- `types/`：跨 feature 共享的类型定义。
- `styles.css`：全局样式；页面或 feature 专属样式随对应 feature 维护。

## 在哪里加代码

- 新页面放到对应 feature 的 `pages/` 目录，再在 `app/router.tsx` 注册 URL。
- 只被单个 feature 使用的组件放该 feature 的 `components/`；真正跨 feature 复用的布局或 UI 组件放 `components/`。
- feature 专属状态 hooks 留在该 feature 的 `hooks/`；跨 feature 共享的 hooks 再上移。
- 只有对应实现存在时再新建目录，避免空文件夹和多余层级。
