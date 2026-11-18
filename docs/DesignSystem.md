# BothPls Design System — Complete Specification

> **BothPls（朋友帮选）** v1.2 MVP 设计规范系统  
> 美学方向：Playful / toy-like — 圆润形态、温暖珊瑚色系、友好的社交工具气质

---

## 目录

1. [Design Specification](#00-design-specification)
2. [Foundation Tokens](#01-foundation-tokens)
3. [Typography — Multilingual](#02-typography--multilingual)
4. [Components](#03-components)
5. [Interaction Patterns](#04-interaction-patterns)
6. [Page Templates](#05-page-templates)
7. [Motion Design](#06-motion-design)
8. [Design Tokens (CSS Variables)](#07-design-tokens-css-variables)

---

## 00 Design Specification

| Property | Value |
|---|---|
| **Product** | BothPls（朋友帮选）— v1.2 MVP |
| **Purpose** | 发起者创建单选投票收集朋友意见与评论，辅助购物决策。核心流程：注册登录 → 创建投票 → 分享 → 匿名参与 → 结果展示 → 管理投票 |
| **Target users** | **发起者**：选择困难的购物者，注册登录后创建/管理投票<br>**参与者**：发起者的朋友，零门槛匿名参与，追求 <1分钟完成投票 |
| **Aesthetic direction** | **Playful / toy-like** — 圆润形态、温暖珊瑚色系、友好的社交工具气质 |
| **Color palette** | Coral `#D85A30` (primary), Teal `#1D9E75` (secondary), Warm Gray `#F1EFE8` (neutral) |
| **Typography** | Multilingual: EN (Nunito + Nunito Sans) / 中文 (Noto Sans SC) / 한 (Pretendard) / 日 (M PLUS Rounded 1c + Noto Sans JP) + DM Mono (numeric, shared) |
| **Layout strategy** | 固定手机端 393 × 873px，单列纵向流，20px 左右内边距，底部固定操作区。不做 PC 适配。 |
| **Platform** | Android Chrome，固定视口渲染 |

---

## 01 Foundation Tokens

### Color System

三色系架构：Coral 传达友谊与活力，Teal 传递信任与清晰（用于选中态和结果），Warm Gray 作为中性基底。语义色用于状态反馈。

#### Primary — Coral

| Token | Hex | Usage |
|---|---|---|
| Coral 50 | `#FAECE7` | Surface fill |
| Coral 100 | `#F5C4B3` | Hover state |
| Coral 200 | `#F0997B` | Secondary btn |
| Coral 400 | `#D85A30` | Brand / CTA |
| Coral 600 | `#993C1D` | Text on light |
| Coral 800 | `#712B13` | Pressed |

#### Secondary — Teal

| Token | Hex | Usage |
|---|---|---|
| Teal 50 | `#E1F5EE` | Selected fill |
| Teal 200 | `#5DCAA5` | Progress bar |
| Teal 400 | `#1D9E75` | Selected border |
| Teal 600 | `#0F6E56` | Success |

#### Neutral — Warm Gray

| Token | Hex | Usage |
|---|---|---|
| White | `#FFFFFF` | Card surface |
| Gray 50 | `#F8F7F4` | Page bg |
| Gray 100 | `#F1EFE8` | Subtle fill |
| Gray 200 | `#D3D1C7` | Borders |
| Gray 300 | `#B4B2A9` | — |
| Gray 400 | `#888780` | Placeholder |
| Gray 500 | `#5F5E5A` | Secondary text |
| Gray 700 | `#444441` | Body text |
| Gray 900 | `#2C2C2A` | Heading |

#### Semantic Colors

| Semantic | Light | Base | Dark | Usage |
|---|---|---|---|---|
| Danger | `#FCEBEB` | `#E24B4A` | `#A32D2D` | 删除确认、表单错误 |
| Success | `#EAF3DE` | `#639922` | `#3B6D11` | 提交成功、链接已复制 |
| Warning | `#FAEEDA` | `#EF9F27` | `#854F0B` | 截止时间临近 |
| Info | `#E6F1FB` | `#378ADD` | `#185FA5` | 评论可见性提示 |

---

### Spacing Scale

4px 基础单位，10 档间距 token。手机端以 16px / 20px 为主要节奏。

| Token | Value | Usage |
|---|---|---|
| `sp-1` | 4px | 图标与文字间距 |
| `sp-2` | 8px | 组件内部紧凑间距 |
| `sp-3` | 12px | 表单字段间距 |
| `sp-4` | 16px | 卡片内边距、段落间距 |
| `sp-5` | 20px | 页面左右内边距（核心） |
| `sp-6` | 24px | 区块间距 |
| `sp-8` | 32px | 大区块间距 |
| `sp-10` | 40px | 空状态内边距 |
| `sp-12` | 48px | 首屏标题顶部间距 |
| `sp-16` | 64px | 页面底部安全留白 |

---

### Border Radius

| Token | Value | Usage |
|---|---|---|
| `r-sm` | 6px | 小元素、tag |
| `r-md` | 10px | 按钮、输入框 |
| `r-lg` | 14px | 卡片、投票项 |
| `r-xl` | 20px | 弹窗、大容器 |
| `r-full` | 999px | 头像、badge |

---

### Elevation Shadows

| Token | Value | Usage |
|---|---|---|
| `shadow-1` | `0 1px 2px rgba(44,44,42,0.06)` | 卡片默认 |
| `shadow-2` | `0 2px 8px rgba(44,44,42,0.08)` | 悬浮、弹窗 |
| `shadow-3` | `0 8px 24px rgba(44,44,42,0.12)` | 模态弹窗 |

---

### Icon System

统一使用 **Font Awesome 6** 图标库，禁止使用 emoji 作为功能图标。图标尺寸三档：16px / 20px / 24px。

| 场景 | FA class | 尺寸 |
|---|---|---|
| 创建投票 | `fa-plus` | 20px |
| 分享链接 | `fa-share-nodes` | 20px |
| 删除 | `fa-trash-can` | 20px |
| 编辑 | `fa-pen` | 20px |
| 查看信息 | `fa-circle-info` | 20px |
| 结果图表 | `fa-chart-bar` | 20px |
| 单选选中 | `fa-circle-check` | 20px |
| 评论 | `fa-comment` | 16px |
| 上传图片 | `fa-image` | 24px |
| 设置 | `fa-gear` | 20px |
| 返回 | `fa-arrow-left` | 20px |
| 关闭 | `fa-xmark` | 20px |

---

## 02 Typography — Multilingual

### Multilingual Font Strategy

BothPls 支持四种语言：English / 中文 / 한국어 / 日本語。所有语言共享同一套 Type Scale 和 Pairing Rules，仅 font-family 按语言切换。字体选择遵循 **Playful / toy-like** 美学方向 — 优先圆润、友好、现代的无衬线字体，与英文 Nunito 家族视觉协调。

> **核心原则：** 拉丁字母（英文、数字）始终使用 Nunito / Nunito Sans / DM Mono；CJK 字符（中文、日文汉字、韩文）使用各自语言专属字体。CSS font-family 栈自动降级 — 拉丁字符命中 Nunito，CJK 字符命中对应 CJK 字体，无需手动切换。

| Language | Code | Display Font | Body Font | Numeric | Mood Match |
|---|---|---|---|---|---|
| English | `en` | Nunito | Nunito Sans | DM Mono | 圆润友好，品牌基线 |
| 简体中文 | `zh-CN` | Noto Sans SC | Noto Sans SC | DM Mono | 现代清晰，字重齐全 |
| 한국어 | `ko` | Pretendard | Pretendard | DM Mono | 韩国 UI 标准，跨平台一致 |
| 日本語 | `ja` | M PLUS Rounded 1c | Noto Sans JP | DM Mono | 圆润标题 + 高可读正文 |

---

### Font Families — Per Language

#### EN — English: Nunito Family

| Role | Font | Sample | Weights | Source |
|---|---|---|---|---|
| Display | Nunito | Create your vote | 400, 600, 700, 800 | Google Fonts |
| Body | Nunito Sans | Help your friends decide | 400, 500, 600, 700 | Google Fonts |
| Numeric | DM Mono | 68% · 12 votes | 400, 500 | Google Fonts |

---

#### 中 — 简体中文: Noto Sans SC（思源黑体）

| Role | Font | Sample | Weights | Source |
|---|---|---|---|---|
| Display + Body | Noto Sans SC | 创建你的投票 | 100, 300, 400, 500, 600, 700, 900 | Google Fonts |
| Body sample | Noto Sans SC | 让朋友帮你做决定，选择不再纠结 | 400, 500, 600 | Google Fonts |
| Numeric | DM Mono | 68% · 12 票 | 400, 500 | Google Fonts |

> **选择理由：** Adobe 与 Google 联合开发的开源简体中文无衬线字体，即"思源黑体"Google 版。7 档字重覆盖全部排版需求，字形现代简洁，与 Nunito 搭配视觉协调。OFL 协议免费商用。

---

#### 한 — 한국어: Pretendard

| Role | Font | Sample | Weights | Source |
|---|---|---|---|---|
| Display + Body | Pretendard | 투표 만들기 | 400, 500, 600, 700, 800, 900 | CDN (jsDelivr) |
| Body sample | Pretendard | 친구들에게 도움을 요청하세요 | 400, 500, 600 | CDN (jsDelivr) |
| Numeric | DM Mono | 68% · 12표 | 400, 500 | Google Fonts |

> **选择理由：** 韩国最流行的跨平台 UI 字体，基于 Apple SD Gothic Neo + Inter + 思源黑体优化。在所有平台呈现一致的视觉表现，9 档字重，支持可变字体。比 Noto Sans KR 更现代、更贴近系统原生体验。MIT 协议开源。

---

#### 日 — 日本語: M PLUS Rounded 1c + Noto Sans JP

| Role | Font | Sample | Weights | Source |
|---|---|---|---|---|
| Display | M PLUS Rounded 1c | 投票を作成 | 400, 500, 700, 800 | Google Fonts |
| Body | Noto Sans JP | 友達に手伝ってもらいましょう | 100, 300, 400, 500, 700, 900 | Google Fonts |
| Numeric | DM Mono | 68% · 12票 | 400, 500 | Google Fonts |

> **选择理由：** 标题使用 M PLUS Rounded 1c — 唯一一款在 Google Fonts 上的圆润风格日文字体，与 Nunito 的 Playful 气质完美呼应。正文使用 Noto Sans JP（思源黑体日文版）保证大段文字的可读性，7 档字重。两字体均 OFL 协议开源。

---

### Cross-Language Type Scale

四种语言共享同一套字号阶梯。以下为各语言同尺寸对比：

| Level | Size / Weight / Line-height | EN | 中文 | 한국어 | 日本語 |
|---|---|---|---|---|---|
| H1 | 32px / 800 / 1.2 | BothPls | 朋友帮选 | 보스플리즈 | ボスプルズ |
| H2 | 24px / 700 / 1.3 | Create your vote | 创建你的投票 | 투표 만들기 | 投票を作成 |
| H3 | 20px / 700 / 1.35 | — | — | — | — |
| H4 | 17px / 600 / 1.4 | Product option | 商品选项标题 | 상품 옵션 제목 | 商品オプション |
| Body L | 16px / 400 / 1.6 | Help your friends decide what to buy. | 让朋友帮你做决定，选择不再纠结。 | 친구들에게 도움을 요청하세요. | 友達に手伝ってもらいましょう。 |
| Body M | 14px / 400 / 1.5 | Comments will be shown after voting ends. | 评论将在投票结束后公开。 | 댓글은 투표 종료 후 공개됩니다. | コメントは投票終了後に公開されます。 |
| Label | 13px / 600 / 1.4 | — | — | — | — |
| Caption | 12px / 500 / 1.4 | — | — | — | — |
| Stat XL | 48px / 500 | 68% | — | — | — |
| Stat L | 32px / 500 | 12 votes | 12 票 | 12표 | 12票 |
| Stat M | 20px / 500 | 3 / 5 | — | — | — |

> **Note:** 数字与百分比始终使用 DM Mono 等宽字体，四种语言共享。CJK 语言的"票"字单位（票 / 표 / 票）由各语言 body 字体渲染，数字部分由 DM Mono 渲染，font-family 栈自动分配。

---

### Pairing Rules

| 场景 | EN | 中 | 한 | 日 |
|---|---|---|---|---|
| 页面标题 + 正文 | Nunito H2 + Nunito Sans Body | Noto Sans SC 700 + 400 | Pretendard 700 + 400 | M PLUS Rounded 1c 700 + Noto Sans JP 400 |
| 选项卡 + 票数 | Nunito H4 + DM Mono | Noto Sans SC 600 + DM Mono | Pretendard 600 + DM Mono | M PLUS Rounded 1c 600 + DM Mono |
| 按钮文字 | Nunito 17px / 700 | Noto Sans SC 17px / 700 | Pretendard 17px / 700 | M PLUS Rounded 1c 17px / 700 |
| 评论项 | Nunito Sans Body M + Caption | Noto Sans SC 400 + Caption | Pretendard 400 + Caption | Noto Sans JP 400 + Caption |
| 结果比例 | DM Mono Stat XL + 各语言 Body 字体（数字共享） | — | — | — |

---

### CSS Implementation Guide

推荐使用 CSS font-family 栈自动降级方案 — 拉丁字符命中英文字体，CJK 字符命中对应语言字体，无需 JavaScript 切换。

```css
/* 1. Global font stacks (auto fallback) */
:root {
  /* Display: EN > ZH > KO > JP */
  --font-display: 'Nunito', 'Noto Sans SC',
    'Pretendard', 'M PLUS Rounded 1c',
    'Noto Sans JP', sans-serif;

  /* Body: EN > ZH > KO > JP */
  --font-body: 'Nunito Sans', 'Noto Sans SC',
    'Pretendard', 'Noto Sans JP', sans-serif;

  /* Numeric: shared across all languages */
  --font-mono: 'DM Mono', 'Noto Sans SC',
    'Pretendard', monospace;
}

/* 2. Per-language override (if needed) */
html[lang="en"] {
  --font-display: 'Nunito', sans-serif;
  --font-body: 'Nunito Sans', sans-serif;
}
html[lang="zh-CN"] {
  --font-display: 'Noto Sans SC', 'Nunito', sans-serif;
  --font-body: 'Noto Sans SC', 'Nunito Sans', sans-serif;
}
html[lang="ko"] {
  --font-display: 'Pretendard', 'Nunito', sans-serif;
  --font-body: 'Pretendard', 'Nunito Sans', sans-serif;
}
html[lang="ja"] {
  --font-display: 'M PLUS Rounded 1c',
    'Noto Sans JP', 'Nunito', sans-serif;
  --font-body: 'Noto Sans JP',
    'M PLUS Rounded 1c', 'Nunito Sans', sans-serif;
}
```

```html
<!-- 3. Google Fonts import (one link) -->
<link href="https://fonts.googleapis.com/css2?
  family=Nunito:wght@400;600;700;800
  &family=Nunito+Sans:wght@400;500;600;700
  &family=DM+Mono:wght@400;500
  &family=Noto+Sans+SC:wght@400;500;600;700;900
  &family=Noto+Sans+JP:wght@400;500;700;900
  &family=M+PLUS+Rounded+1c:wght@400;500;700;800
  &display=swap" rel="stylesheet">

<!-- Pretendard via CDN (Korean) -->
<link rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/
  orioncactus/pretendard@v1.3.9/
  dist/web/static/pretendard.css">
```

> **性能提示：** Google Fonts CJK 字体体积较大（Noto Sans SC 完整约 8MB）。建议使用 `unicode-range` 子集化加载，或使用 `font-display: swap` 确保文字先以系统字体渲染。Pretendard 推荐使用 jsDelivr CDN 的动态子集化版本。

---

### Font Loading Sources

| Font | Provider | URL / Method | License |
|---|---|---|---|
| Nunito | Google Fonts | `fonts.googleapis.com` | OFL 1.1 |
| Nunito Sans | Google Fonts | `fonts.googleapis.com` | OFL 1.1 |
| DM Mono | Google Fonts | `fonts.googleapis.com` | OFL 1.1 |
| Noto Sans SC | Google Fonts | `fonts.googleapis.com` | OFL 1.1 |
| Noto Sans JP | Google Fonts | `fonts.googleapis.com` | OFL 1.1 |
| M PLUS Rounded 1c | Google Fonts | `fonts.googleapis.com` | OFL 1.1 |
| Pretendard | jsDelivr CDN | `cdn.jsdelivr.net/gh/orioncactus/pretendard` | MIT |

---

## 03 Components

### Buttons

| Variant | Token | Usage |
|---|---|---|
| Primary | `coral-400` bg / white text | 主要操作：发布、提交、登录 |
| Secondary | white bg / `coral-400` border | 次要操作：编辑、取消 |
| Ghost | transparent / `gray-500` | 辅助操作：返回、关闭 |
| Danger | `danger-400` bg / white | 危险操作：确认删除 |
| Disabled | `gray-200` bg / `gray-400` | 表单未满足条件 |

**Spec：** 高度 48px（默认）/ 36px（sm）/ 52px（lg）；圆角 `r-md` (10px)；水平内边距 24px；图标与文字间距 8px；点击态透明度 0.8。

---

### Form Inputs

| Component | Spec |
|---|---|
| Input field | 高度 48px；圆角 `r-md` (10px)；边框 1.5px `gray-200`；focus 态边框 `coral-400`；placeholder 色 `gray-300` |
| Error state | 边框 `danger-400`；错误文案 12px `danger-400` + `fa-circle-exclamation` 图标 |
| Label | 13px / 600 / `gray-700`；必填标记 `*` 色 `coral-400` |
| Hint | 12px / `gray-400` |

表单字段类型覆盖：文本输入、文本域（textarea）、邮箱、日期时间选择器（datetime-local）。

---

### Vote Option Card

核心交互组件：单选商品选项。点击切换选中态，选中时使用 Teal 色系（区别于品牌 Coral），仅允许选中一个。

| State | Border | Background | Radio |
|---|---|---|---|
| Default | `gray-200` / 2px | white | `gray-300` ring |
| Hover | `coral-200` / 2px | white | `gray-300` ring |
| Selected | `teal-400` / 2px | `teal-50` | `teal-400` fill + check |
| Disabled | `gray-200` / 2px | `gray-50` | `gray-200` ring |

**结构：** Radio 圆圈（22×22px） + 商品图片（56×56px, `coral-50` bg, `coral-400` icon） + 标题（15px / 600 / `gray-900`）+ 描述（13px / `gray-400`）

---

### Result Proportion Bar

水平进度条。领先选项使用 Coral 200 填充，其余 Gray 300。平票并列显示，不随机决胜。

**结构：**
- Header：选项名称（14px / 600 / `gray-700`）+ 百分比（DM Mono 14px / 500 / `gray-900`）
- Track：高度 28px，`gray-100` 底色，`r-sm` 圆角
- Fill：`coral-200`（领先）/ `gray-300`（普通），宽度动画 400ms ease-out
- Votes：DM Mono 12px / 500 / white，显示在 fill 内部

---

### Badges

| Badge | Style | Usage |
|---|---|---|
| Coral | `coral-50` bg / `coral-400` text | 进行中 |
| Gray | `gray-100` bg / `gray-500` text | 已结束 |
| Teal | `teal-50` bg / `teal-600` text | 参与人数 |
| Warning | `warning-50` bg / `warning-600` text | 即将截止 |
| Danger | `danger-50` bg / `danger-600` text | 评论未公开 |

**Spec：** `r-full` 圆角；padding 3px 8px；font-size 11px / 600；图标与文字间距 4px。

---

### Confirm Modal (Delete)

删除投票二次确认弹窗。遮罩层 `gray-900` / 60% 透明度，弹窗居中，圆角 `r-xl`。

**结构：**
- 警告图标：48×48px 圆形，`danger-50` bg，`fa-triangle-exclamation` 22px `danger-400`
- 标题：18px / 700 / `gray-900` — "确认删除投票？"
- 说明：14px / `gray-500` — "删除后无法恢复，所有投票数据和评论将永久丢失。"
- 按钮：取消（ghost sm）+ 确认删除（danger sm）

---

### Toast Notifications

| Type | Icon | Color | Duration | Sample |
|---|---|---|---|---|
| Success | `fa-circle-check` | `teal-200` | 3s | 投票提交成功！正在跳转结果页... |
| Info | `fa-circle-info` | `info-400` | 3s | 评论将在投票结束后公开 |
| Warning | `fa-hourglass-half` | `warning-400` | 4s | 投票即将结束，抓紧提交 |
| Error | `fa-circle-exclamation` | `danger-400` | 4s | 图片上传失败，请重试 |

**Spec：** 底部固定悬浮，距底部 80px；`gray-900` bg / white text；padding 12px 16px；`r-md` 圆角；font-size 13px；自动消失后左滑关闭。

---

### Comment Item

**结构：**
- 头像：32×32px 圆形，`coral-100` bg，首字母 `coral-600` / 13px / 700
- 昵称：14px / 600 / `gray-700`
- 时间：DM Mono 11px / `gray-400`
- 更多操作：`fa-ellipsis-vertical` 14px / `gray-400`
- 内容：14px / `gray-700` / line-height 1.5

---

### Empty State

**结构：**
- 图标容器：64×64px 圆形，`coral-50` bg，`fa-clipboard-list` 28px `coral-400`
- 标题：17px / 600 / `gray-700` — "还没有投票"
- 描述：14px / `gray-400` — "快去发起一个吧，让朋友帮你做决定"
- CTA 按钮：Primary sm + `fa-plus` — "创建投票"
- 容器：虚线边框 `gray-200` dashed，`r-lg` 圆角，padding 40px 16px

---

## 04 Interaction Patterns

### Single-Select Vote Flow

| Step | Trigger | Response | State change |
|---|---|---|---|
| 1. Enter | 打开公开链接 | 系统生成随机用户名，展示投票 info | 匿名身份绑定设备 |
| 2. Browse | 查看商品选项 | 卡片列表展示，default 态 | 无选中 |
| 3. Select | 点击选项卡片 | 卡片切换 selected 态，radio 填充 | 仅一个选中，自动取消前一个 |
| 4. Comment | 点击评论输入框 | 展开评论输入区域 | 评论可选 |
| 5. Submit | 点击"提交" | 按钮 loading → 跳转结果页 | 数据写入，不可撤回 |
| 6. Result | 跳转结果页 | 展示人数、比例、评论（结束后公开） | 进行中评论隐藏 |

---

### Delete Confirmation Pattern

**触发：** 发起者在"我的投票"点击删除按钮

**步骤：**
1. 弹出模态确认弹窗，展示警告图标 + "确认删除投票？"
2. 说明文案："删除后无法恢复，所有投票数据和评论将永久丢失。"
3. 两个按钮：**取消**（ghost）+ **确认删除**（danger）
4. 点击取消 → 弹窗关闭，投票保持不变
5. 点击确认删除 → 后端验证权限 → 删除成功 → Toast 提示 → 列表刷新

> **权限校验：** 仅发起者可删除；公开链接不能执行删除操作。后端二次验证权限。

---

### Comment Visibility Pattern

| 阶段 | 评论操作 | 评论展示 | 提示文案 |
|---|---|---|---|
| 投票进行中 | 可提交评论 | **不展示** | "评论将在投票结束后公开" |
| 投票结束后 | 不可新增 | **全部公开** | — |

> **规则：** 评论操作不影响票数。评论者可修改/删除自己的评论；发起者可删除任何评论。

---

### Vote Lifecycle States

| State | Badge | Trigger | UI behavior |
|---|---|---|---|
| 进行中 | `coral` 进行中 | 发布后默认 | 可投票、可修改、评论不公开 |
| 即将截止 | `warning` 即将截止 | 距截止 <1h | 仍可投票，Toast 提醒 |
| 已结束（手动） | `gray` 已结束 | 发起者手动结束 | 禁止投票/修改，评论公开 |
| 已结束（自动） | `gray` 已结束 | 截止时间到达 | 同上，后端时间判定 |
| 已删除 | — | 发起者确认删除 | 从列表移除，公开链接 404 |

---

### Anonymous Entry Pattern

1. 参与者打开公开链接 → 系统生成随机用户名（如 PurpleFox42）
2. 随机用户名与设备/浏览器绑定（localStorage）
3. 展示投票 info → 进入参与投票页面
4. 无需注册、无需登录，零门槛
5. 更换设备后匿名身份不可恢复（PRD 规定）

---

## 05 Page Templates

### Layout Spec

| Property | Value | Note |
|---|---|---|
| Viewport | `393 × 873px` (390×844) | 固定视口，Android Chrome |
| Horizontal padding | `20px` (sp-5) | 核心内容左右内边距 |
| Top safe area | `44px` | 状态栏区域 |
| Bottom safe area | `34px` | 导航条/手势区域 |
| Scroll behavior | vertical only | 禁止横向滚动 |

---

### Page Map

| # | Page | User | Core elements |
|---|---|---|---|
| 1 | 注册/登录页 | 发起者 | 品牌标识 + Tab + 邮箱/昵称表单 + CTA |
| 2 | 首页 | 发起者 | 产品介绍 + 快捷创建 + 步骤说明 + 最近投票 |
| 3 | 我的投票 | 发起者 | 投票列表(新→旧) + 操作(info/结果/编辑/分享/删除) |
| 4 | 投票编辑页 | 发起者 | 名称 + 背景 + 商品卡片(2-5) + 截止时间 + 发布 |
| 5 | 参与投票页 | 参与者 | 随机用户名 + 投票 info + 单选卡片 + 评论 + 提交 |
| 6 | 结果页 | 双方 | 人数公示 + 比例进度条 + 评论列表 |

---

### Template Mockups

#### 注册 / 登录页

```
┌─────────────────────────┐
│  9:41    📶 📡 🔋       │ Status bar
├─────────────────────────┤
│                         │
│       BothPls           │ Brand title (coral-400, 22px, 800)
│  朋友帮选，让选择不再纠结  │ Subtitle (12px, gray-400)
│                         │
│  ┌─────────┬─────────┐  │
│  │  注册   │  登录   │  │ Tab bar (active = coral-400)
│  └─────────┴─────────┘  │
│                         │
│  邮箱                    │
│  ┌───────────────────┐  │
│  │ your@email.com    │  │ Input field
│  └───────────────────┘  │
│                         │
│  昵称                    │
│  ┌───────────────────┐  │
│  │ 留空则随机生成     │  │ Input field
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │   注册并开始       │  │ Primary btn (block, lg)
│  └───────────────────┘  │
│                         │
│  邮箱验证码暂未启用       │ Hint (12px, gray-400)
│                         │
└─────────────────────────┘
```

#### 投票编辑页

```
┌─────────────────────────┐
│  9:41    📶 📡 🔋       │
├─────────────────────────┤
│  ← 创建投票              │ Header (arrow-left + title)
│                         │
│  投票名称 *              │ Label (12px)
│  ┌───────────────────┐  │
│  │ 周末买哪双球鞋？   │  │ Input (filled)
│  └───────────────────┘  │
│                         │
│  补充背景                │ Label
│  ┌───────────────────┐  │
│  │ 预算800以内，纠结  │  │ Textarea
│  │ 跑步和日常        │  │
│  └───────────────────┘  │
│                         │
│  商品选项（2-5个）       │ Section label
│  ┌───────────────────┐  │
│  │ 👟 Nike Pegasus 41│ ✕│ Option card (filled)
│  ├───────────────────┤  │
│  │ 👟 Adidas Ultraboost│✕│ Option card (filled)
│  ├───────────────────┤  │
│  │   + 添加商品       │  │ Add button (dashed)
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │  📤  发布投票      │  │ Primary btn (block)
│  └───────────────────┘  │
└─────────────────────────┘
```

#### 参与投票页

```
┌─────────────────────────┐
│  9:41    📶 📡 🔋       │
├─────────────────────────┤
│  (P) PurpleFox42 · 匿名 │ Avatar + username badge
│                         │
│  周末买哪双球鞋？        │ Vote title (18px, 700)
│  预算800以内，纠结跑步   │ Description (12px, gray-400)
│                         │
│  ○  👟 Nike Pegasus 41  │ Vote card (default)
│     日常跑步+出街        │
│                         │
│  ●  👟 Adidas Ultraboost│ Vote card (SELECTED)
│     舒适度高，颜值在线   │ (teal-50 bg, teal-400 border)
│                         │
│  ○  👟 Asics Nimbus 26  │ Vote card (default)
│     缓震最强             │
│                         │
│  ┌───────────────────┐  │
│  │ 留个评论（可选）...│  │ Comment textarea
│  └───────────────────┘  │
│                         │
│  ℹ 评论将在投票结束后公开│ Info box
│                         │
│  ┌───────────────────┐  │
│  │     提交投票       │  │ Primary btn (block)
│  └───────────────────┘  │
└─────────────────────────┘
```

#### 结果页

```
┌─────────────────────────┐
│  9:41    📶 📡 🔋       │
├─────────────────────────┤
│  ←              已结束   │ Back + status badge
│                         │
│  周末买哪双球鞋？        │ Vote title (18px, 700)
│                         │
│  👥 18 人参与            │ Participant count
│                         │
│  Adidas Ultraboost  68% │ Leading option
│  ████████████████░░░░   │ (coral-200 fill)
│  12 票                   │
│                         │
│  Nike Pegasus 41    17% │ Normal option
│  ███░░░░░░░░░░░░░░░░░   │ (gray-300 fill)
│  3 票                    │
│                         │
│  Asics Nimbus 26    17% │ Normal option (tied)
│  ███░░░░░░░░░░░░░░░░░   │ (gray-300 fill)
│  3 票                    │
│                         │
│  ─────────────────────  │ Divider
│  💬 评论 (5)             │ Comment section header
│                         │
│  ┌───────────────────┐  │
│  │PurpleFox42     2h │ │ Comment item
│  │Ultraboost 踩屎感好│ │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │BlueTiger88     5h │ │ Comment item
│  │Pegasus 偏专业跑步 │ │
│  └───────────────────┘  │
└─────────────────────────┘
```

---

## 06 Motion Design

### Motion Tokens

| Token | Duration | Easing | Usage |
|---|---|---|---|
| `motion-fast` | 150ms | ease-out | 按钮 hover、卡片选中态切换 |
| `motion-normal` | 250ms | ease-in-out | 弹窗弹出/关闭、页面过渡 |
| `motion-slow` | 400ms | ease-out | 结果进度条填充动画 |
| `motion-stagger` | 50ms delay/step | ease-out | 列表项依次出现 |

---

### Key Animations

| 场景 | 触发 | 动画 | 时长 |
|---|---|---|---|
| 投票选项选中 | 点击卡片 | radio 填充 + 卡片背景渐变 + 边框换色 | 150ms |
| 结果进度条 | 结果页加载 | width 0% → 目标百分比，依次延迟 100ms | 400ms + stagger |
| 删除确认弹窗 | 点击删除 | 遮罩淡入 + 弹窗 scale(0.9)→1 | 250ms |
| Toast 通知 | 操作完成 | 底部滑入 + 淡入 | 250ms in / 200ms out |
| 投票列表加载 | 进入我的投票 | 列表项下方偏移 + 淡入，延迟 50ms | 300ms + stagger |
| 提交按钮 loading | 点击提交 | 文字隐藏 + spinner 旋转 | 持续至响应 |

> **原则：** 动画服务于反馈，不做纯装饰动效。所有动画支持 `prefers-reduced-motion` 媒体查询降级。

---

## 07 Design Tokens (CSS Variables)

### Complete Token Export

以下为完整 CSS 变量定义，可直接复制到项目 `:root` 中使用。

```css
:root {
  /* Primary — Coral */
  --coral-50:  #FAECE7;
  --coral-100: #F5C4B3;
  --coral-200: #F0997B;
  --coral-400: #D85A30;
  --coral-600: #993C1D;
  --coral-800: #712B13;

  /* Secondary — Teal */
  --teal-50:  #E1F5EE;
  --teal-200: #5DCAA5;
  --teal-400: #1D9E75;
  --teal-600: #0F6E56;

  /* Neutral — Warm Gray */
  --gray-0:   #FFFFFF;
  --gray-50:  #F8F7F4;
  --gray-100: #F1EFE8;
  --gray-200: #D3D1C7;
  --gray-300: #B4B2A9;
  --gray-400: #888780;
  --gray-500: #5F5E5A;
  --gray-700: #444441;
  --gray-900: #2C2C2A;

  /* Semantic */
  --danger-50:  #FCEBEB;
  --danger-400: #E24B4A;
  --danger-600: #A32D2D;
  --success-50: #EAF3DE;
  --success-400: #639922;
  --success-600: #3B6D11;
  --warning-50: #FAEEDA;
  --warning-400: #EF9F27;
  --warning-600: #854F0B;
  --info-50: #E6F1FB;
  --info-400: #378ADD;
  --info-600: #185FA5;

  /* Typography — Multilingual */
  --font-display: 'Nunito', 'Noto Sans SC',
    'Pretendard', 'M PLUS Rounded 1c',
    'Noto Sans JP', sans-serif;
  --font-body: 'Nunito Sans', 'Noto Sans SC',
    'Pretendard', 'Noto Sans JP', sans-serif;
  --font-mono: 'DM Mono', 'Noto Sans SC',
    'Pretendard', monospace;

  /* Per-language stacks */
  --font-display-en: 'Nunito', sans-serif;
  --font-body-en: 'Nunito Sans', sans-serif;
  --font-display-zh: 'Noto Sans SC', 'Nunito', sans-serif;
  --font-body-zh: 'Noto Sans SC', 'Nunito Sans', sans-serif;
  --font-display-ko: 'Pretendard', 'Nunito', sans-serif;
  --font-body-ko: 'Pretendard', 'Nunito Sans', sans-serif;
  --font-display-ja: 'M PLUS Rounded 1c',
    'Noto Sans JP', 'Nunito', sans-serif;
  --font-body-ja: 'Noto Sans JP',
    'M PLUS Rounded 1c', 'Nunito Sans', sans-serif;

  /* Spacing — 4px base */
  --sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px;
  --sp-4: 16px; --sp-5: 20px; --sp-6: 24px;
  --sp-8: 32px; --sp-10: 40px; --sp-12: 48px; --sp-16: 64px;

  /* Radius */
  --r-sm: 6px;  --r-md: 10px; --r-lg: 14px;
  --r-xl: 20px; --r-full: 999px;

  /* Shadows */
  --shadow-1: 0 1px 2px rgba(44,44,42,0.06);
  --shadow-2: 0 2px 8px rgba(44,44,42,0.08);
  --shadow-3: 0 8px 24px rgba(44,44,42,0.12);

  /* Motion */
  --motion-fast: 150ms ease-out;
  --motion-normal: 250ms ease-in-out;
  --motion-slow: 400ms ease-out;

  /* Layout */
  --page-width: 393px;
  --page-height: 873px;
  --safe-top: 44px;
  --safe-bottom: 34px;
  --content-padding: 20px;
}
```

---

### Error & Edge Case Messages

| 场景 | 提示文案 | 类型 |
|---|---|---|
| 网络断开 | 当前网络不佳，草稿已暂存，恢复网络后重试 | Toast warning |
| 未登录尝试创建 | 跳转注册/登录页 | 路由跳转 |
| 邮箱格式无效 | 请输入有效邮箱 | Input error |
| 昵称留空 | 自动生成随机昵称（静默） | — |
| 名称为空 | 请填写投票名称 | Button disabled + hint |
| 选项不足 2 个 | 至少保留 2 个商品选项 | Button disabled + hint |
| 选项超过 5 个 | 最多添加 5 个选项 | Toast warning |
| 图片上传失败 | 图片上传失败，请重试 | Toast error |
| 查看进行中评论 | 评论将在投票结束后公开 | Info box |
| 结束后参与投票 | 投票已结束 | Result page lock |
| 截止时间到达提交 | 投票已结束 | Toast error |
| 我的投票为空 | 还没有投票，快去发起一个吧 | Empty state |

---

*BothPls Design System v1.2 — Generated from PRD v1.2*
