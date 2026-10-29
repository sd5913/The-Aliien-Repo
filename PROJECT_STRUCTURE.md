# BothPls 项目结构与职责

## 当前阶段说明

本文描述当前工作区中实际存在的文件，并说明后续文件的归属约定。本阶段只整理项目结构和文档，没有开发或修改页面功能、投票规则、数据存储或视觉效果。

当前前端已有六个路由和相应页面组件，属于本地前端原型；这里记录它们的职责和建议归属，不代表已经具备生产级服务端能力。

## 当前目录树

下列目录树列出项目源码、配置和文档。`node_modules/` 和 `dist/` 是依赖安装与构建产生的目录，未展开；`tsconfig.app.tsbuildinfo` 是 TypeScript 构建状态文件。

```text
.
├── .github/
│   └── workflows/
│       └── check.yml
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── PROCESS.md
├── PROJECT_STRUCTURE.md
├── README.md
├── tsconfig.app.json
├── tsconfig.app.tsbuildinfo
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── app/
    │   ├── App.tsx
    │   └── router.tsx
    ├── components/
    │   ├── layout/
    │   │   ├── BottomNav.tsx
    │   │   └── PageShell.tsx
    │   └── ui/
    │       └── StatusPill.tsx
    ├── features/
    │   ├── home/
    │   │   └── HomePage.tsx
    │   └── polls/
    │       ├── create/
    │       │   └── CreatePollPage.tsx
    │       ├── management/
    │       │   └── ManagementPages.tsx
    │       ├── results/
    │       │   └── ResultsPage.tsx
    │       └── voting/
    │           └── VotingPage.tsx
    ├── hooks/
    │   └── usePolls.ts
    ├── lib/
    │   ├── storage/
    │   │   ├── localStorage.ts
    │   │   └── polls.ts
    │   └── voting.ts
    ├── types/
    │   └── poll.ts
    ├── main.tsx
    └── styles.css
```

当前没有 `sources/`、`src/data/`、`src/styles/`、`src/components/navigation/`、`src/features/polls/list/` 或 `src/lib/polls/` 目录；不为尚无独立文件职责的目录预建空目录。新增参考资料目录时，`sources/` 下的文件应保持只读，不编辑、移动、重命名或删除。

## 目录和文件职责

### 应用入口与路由：`src/app/`

- `App.tsx`：应用根组件，挂载路由。
- `router.tsx`：把 URL 路径映射到页面组件；不放投票业务规则。
- `src/main.tsx`：浏览器入口，挂载 React 应用并加载全局样式。
- 根目录 `index.html`：网页 HTML 入口，提供应用挂载节点和页面元信息。

### 页面：`src/features/`

按产品页面组织页面及其专属组件。页面需要调用共享组件、状态 Hook 和无界面业务逻辑，但页面专属逻辑应留在所属功能目录。

- `home/HomePage.tsx`：首页。
- `polls/create/CreatePollPage.tsx`：创建投票。
- `polls/voting/VotingPage.tsx`：公开投票。
- `polls/results/ResultsPage.tsx`：结果与评论。
- `polls/management/ManagementPages.tsx`：当前同时包含“我的投票”列表页和投票管理页。
- 当前没有独立的 `polls/list/`。为避免无必要搬动，列表页暂留在 `ManagementPages.tsx`；若后续列表逻辑需要独立开发，可届时将列表页归入 `polls/list/`。

### 共用界面：`src/components/`

- `layout/PageShell.tsx`：多个页面共用的页面框架。
- `layout/BottomNav.tsx`：首页、创建和我的投票的底部导航。当前放在 `layout/`；不为单个导航组件另建目录。
- `ui/StatusPill.tsx`：显示投票状态的共用界面组件。

`components/` 放可复用的界面，不负责某一个页面完整的业务流程。

### 状态逻辑：`src/hooks/`

- `usePolls.ts`：当前页面间共用的投票状态读取与更新入口。跨页面复用的 React 状态逻辑放在这里；单个页面局部状态仍属于页面组件。

### 无界面逻辑与数据访问：`src/lib/`

- `lib/voting.ts`：当前集中放置投票模式、状态、排序计分和昵称辅助逻辑。
- `lib/storage/localStorage.ts`：浏览器 LocalStorage 的通用 JSON 读写工具。
- `lib/storage/polls.ts`：投票数据专用的 LocalStorage 读取、校验和写入。

职责边界上，`lib/` 放不依赖界面的规则和数据处理。当前 `polls.ts` 仍在 `lib/storage/`；只有当投票数据访问逻辑需要独立于存储实现时，才考虑新增 `lib/polls/`，不为目录形式而迁移现有代码。

### 类型与样式

- `src/types/poll.ts`：跨模块共用的投票、选项、投票记录、评论和投票者类型。仅单个功能使用的类型可留在该功能目录。
- `src/styles.css`：当前全局样式文件，放在 `src/` 根目录。项目现阶段没有 `src/styles/`；如全局样式文件明显增多，再考虑整理目录。功能专属样式后续优先放在对应 `features/` 目录。

### 根目录配置与说明

- `package.json`：前端依赖和命令；目前包含 `dev`、`build`、`preview`。
- `package-lock.json`：npm 依赖锁定文件。
- `vite.config.ts`：Vite 与 React 插件配置。
- `tsconfig.json`、`tsconfig.app.json`：TypeScript 项目引用和应用编译配置。
- `tsconfig.app.tsbuildinfo`：TypeScript 增量构建状态文件，不是业务源码。
- `.gitignore`：Git 忽略规则，包括依赖和构建产物目录。
- `README.md`：项目概述和团队说明；当前文件仍含有模板占位内容。
- `PROCESS.md`：项目过程记录模板。
- `.github/workflows/check.yml`：GitHub Actions 自动化检查配置，调用仓库外的作业模板；它不是 BothPls 页面或产品功能。

## 页面路由和建议代码归属

路由定义集中在 `src/app/router.tsx`；页面组件按产品职责放在 `src/features/`。

| 页面 | 路由 | 建议归属 | 当前实现位置 |
|---|---|---|---|
| 首页 | `/` | `src/features/home/` | `HomePage.tsx` |
| 创建投票 | `/polls/new` | `src/features/polls/create/` | `CreatePollPage.tsx` |
| 我的投票 | `/polls` | `src/features/polls/list/` | 暂在 `src/features/polls/management/ManagementPages.tsx` |
| 公开投票 | `/polls/:pollId/vote` | `src/features/polls/voting/` | `VotingPage.tsx` |
| 结果与评论 | `/polls/:pollId/results` | `src/features/polls/results/` | `ResultsPage.tsx` |
| 投票管理 | `/polls/:pollId/manage` | `src/features/polls/management/` | `ManagementPages.tsx` |

“建议归属”描述按职责整理后的目标位置；“当前实现位置”反映当前代码，不表示本阶段要搬动文件。

## 前端与 Python 示例的边界

BothPls 前端使用 React、TypeScript、Vite 和 React Router。Python 数据获取与绘图流程与网页应用独立，不属于 `src/`，不由前端路由或构建配置调用。

当前工作区中没有 `fetch.py`、`plot.py`、`data/` 或 `out/`。Git 历史显示 `fetch.py` 和 `plot.py` 已由现有提交删除；本阶段没有恢复、移动或改动这些示例。若之后需要保留或恢复它们，应继续放在仓库根目录，并让 Python 流程与 BothPls 前端保持独立。

## 后续文件归属规则

1. 应用组装和路由映射放 `src/app/`；不要把投票规则写进路由配置。
2. 页面及页面专属组件按产品页面放 `src/features/`；当前页面先沿用现有位置。
3. 多个页面复用的界面放 `src/components/`；某个页面专用的界面留在对应功能目录。
4. 跨组件复用的 React 状态逻辑放 `src/hooks/`；组件自己的局部状态不必抽成 Hook。
5. 不依赖 UI 的规则和数据处理放 `src/lib/`，按实际职责扩展现有模块。
6. 跨功能共用类型放 `src/types/`；局部类型放使用它的功能目录。
7. 全局样式沿用 `src/styles.css`；功能专属样式优先与所属页面放在一起。
8. 只有确实需要共享的原型静态数据时才新增 `src/data/`；不要预建没有内容用途的目录。
9. `sources/` 若作为参考资料目录出现，其中内容保持只读；Python 示例继续独立于前端目录。

## 尚未实现或尚待整理的范围

- 六个页面组件和当前路由均已存在；它们不是空白规划项，但仍属于本地前端原型，不能据此推断已有生产级后端或跨设备服务。
- “我的投票”尚未拆到建议的 `features/polls/list/`，目前与管理页共置于 `ManagementPages.tsx`。
- 当前没有 `lib/polls/`、`components/navigation/`、`src/data/`、`src/styles/` 或 `sources/`，也不需要为此阶段创建空目录。
- 当前工作区没有 Python 示例文件；它们在 Git 历史中有删除记录。本阶段只记录这一现状，没有恢复它们。
- 本文只说明结构和文件职责，不增加或改变任何页面功能、数据逻辑、交互和视觉表现。
