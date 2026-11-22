# BothPls 韩语（ko-KR）YiCAT 审校：导入与回并操作手册

- 日期：2026-11-22
- 仓库分支：`codex/bothpls-localization`
- 词条来源：`src/i18n/messages/zh-CN.ts`、`ko-KR.ts`（`en.ts` 仅用于对照）
- 本次范围：只做导入准备，未修改 `src/` 下任何文件

---

## 0. 结论速览

| 问题 | 结论 |
| --- | --- |
| 语言对 | 源语言「中文（简体）」→ 目标语言「韩语 / ko-KR」 |
| 最适合的导入格式 | **XLIFF 1.2**（key 放 `trans-unit/@resname`，占位符转成 `<ph>` 标记） |
| 次选格式 | **多语 Excel**（企业基础版及以上；源文列 B、译文列 C） |
| 不推荐 | CSV（无 key 结构）、iOS `.strings`（不是本项目格式）、直接上传 `.ts`（YiCAT 不支持） |
| 是否会自动写回仓库 | **不会自动写回本地工作区**。默认必须导出后在本地回并 |
| 有没有 Git 集成 | 有，但仅 **企业旗舰版**、仅 **GitHub / GitLab / 私有 GitLab**，且只做「拉原文 → 把译文推到 `l10n-*` 分支并发 PR」 |
| 能否直接改 `ko-KR.ts` | 不能。连接器也不认识 `.ts`；需要先生成 JSON/XLIFF，再把产物回并成 TS |
| 本次数据是否干净 | 379 条，占位符不匹配 0、空译文 0、与中文相同 0；但有 **8 组中文原文重复**，因此**必须按 key 回并** |

> 一句话：**YiCAT 是「平台内审校 + 导出文件」，不是「实时双向同步仓库」。** 无论用不用连接器，`ko-KR.ts` 的最终写入都要在本地完成。

---

## 1. 本次预检结果

对 `zh-CN.ts` / `ko-KR.ts` 做了逐 key 比对：

| 检查项 | 结果 |
| --- | --- |
| 词条总数 | 379（两边 key 完全一致，无缺失/多余） |
| 含占位符的词条 | 48 条 |
| 占位符集合不一致 | 0 |
| 空韩语译文 | 0 |
| 韩语与中文完全相同 | 0 |
| 首尾空格 / 换行 / 异常花括号 | 0 |
| 中文原文重复（同文不同 key） | 8 组 |
| 短标签长度提示（中文 ≤10 字且韩语多出 ≥4 字） | 56 条 |

8 组重复原文（**不能按原文匹配，必须按 key 回并**）：

| 中文原文 | 涉及 key |
| --- | --- |
| 取消 | `common.cancel`, `settings.cancel` |
| 请填写昵称和邮箱地址。 | `auth.nameAndEmailRequired`, `profile.needDetails` |
| 参与投票 | `guest.join`, `results.join` |
| 加入选项 | `home.stepOptions`, `poll.addOption` |
| {count} 票 | `poll.count`, `poll.countOne` |
| {count} 位朋友参与 | `vote.people`, `vote.person` |
| 个人资料 | `profile.heading`, `settings.profile` |
| 设置 | `profile.settings`, `settings.title` |

长度提示只是「字符数」启发式，不等于像素宽度；用于优先抽查按钮、标签、底部导航等短文案。审校表 I 列（长度比）对 ≥2.0 的行做了黄色条件格式。

---

## 2. 核实过的平台事实（截至 2026-11-22）

> 以下来自 Tmxmall / YiCAT 官方文档与官方发布文章；页面可能随版本调整，账号实际可见项以你的套餐为准。

### 2.1 版本与格式支持

| 事实 | 依据 |
| --- | --- |
| 新建项目在「基本信息」里配置源语言和目标语言 | [新建项目](https://docs.tmxmall.com/docs/yicat/start/new-project/) |
| 支持数百种语言，含韩语 | [简介](https://docs.tmxmall.com/docs/yicat/start/intro/) |
| 团队免费版支持 7 种：doc/ppt/xls/docx/pptx/xlsx/txt；团队加强版 8 种（多 pdf） | 同上 |
| 企业版 51 种，含 `json`、`xml`、`yaml/yml`、`properties`、`strings`、`csv`，双语文件含 `xliff/sdlxliff/txml/xlf/po` | 同上 |
| `.ts` 不在支持列表内 | 同上 |

**对本仓库的含义**：团队版只能传 `.xlsx`，而且没有「多语 Excel / XLIFF」这种按列或按 key 的解析能力，无法可靠保留 key 对应关系；要做 key 级回并，实际需要 **企业基础版及以上**。

### 2.2 多语 Excel

| 事实 | 依据 |
| --- | --- |
| 一个 Excel 同时放原文和多语言译文；在【文档设置】勾选「按照语言列识别原文和译文（多语 Excel）」，填列字母（如 B、C） | [特殊格式文档设置](https://docs.tmxmall.com/docs/yicat/project-manage/doc-config/) |
| 原文列需在左，译文列在右；第一行是表头时**不要**勾选「解析第一行」 | 同上 |
| 已有的译文会导入编辑器，作为**未确认译文**展示 | 同上 |
| 导出时保留原始 Excel 结构，把译文回填到对应语言列（官方措辞是「尽可能保留」） | 同上；[2026-07-24 官方发布](https://www.tmxmall.com/article/detail?articleId=9003245045181785218359536) |
| 适用版本：企业基础版及以上、高校版 | 官方发布文章 |

### 2.3 工作流、审校、QA、协作

| 事实 | 依据 |
| --- | --- |
| 新建项目可选工作流；创建后**不能**再改工作流，也不能改「译审同步」开关 | [选择工作流](https://docs.tmxmall.com/docs/yicat/project-manage/project-workflow/) |
| 开启译审同步：译员「确认句段」后审校即可实时审校；关闭：译员还要「交付句段」，审校才能开始 | 同上 |
| 编辑器左原文、右译文；Enter 确认句段；可「确认全部句段」 | [翻译和审校句段](https://docs.tmxmall.com/docs/yicat/translate/trans-edit/) |
| 句段状态：空译文、未确认、已确认、已交付、被退回；另有记忆库匹配率、锁定、机翻状态 | [句段状态](https://docs.tmxmall.com/docs/yicat/translate/segment-status/) |
| QA 设置 + 运行 QA；检查拼写、大小写、标点、术语、格式、不一致等，分轻微/一般/严重三级；项目级规则在编辑器内不能取消 | [QA 设置](https://docs.tmxmall.com/docs/yicat/translate/qa/) |
| 术语库可设为「QA 术语库」，勾选「术语不一致」后自动校验；译员不能改 QA 术语库 | [常见问题](https://docs.tmxmall.com/docs/yicat/faq/)、[语言质量保证](https://docs.tmxmall.com/docs/yicat/project-manage/lqa/) |
| 标记/占位符：点原文标记插入，或用「自动填充标记」；成对标记数字一致 | [标记和占位符](https://docs.tmxmall.com/docs/yicat/translate/tag/) |
| 多人可同时编辑同一文档；任务可按句段/字数拆分；译审同步下能看到彼此内容；他人句段灰色不可编辑 | [协同翻译](https://docs.tmxmall.com/docs/yicat/translate/co-trans/)、[任务分配](https://docs.tmxmall.com/docs/yicat/project-manage/task-assign/) |

### 2.4 导出

| 事实 | 依据 |
| --- | --- |
| 项目详情页「文件 ··· → 导出」可选：目标文件、双语文件、QA 报告、原文、TMX、工作流文档 | [导出译文](https://docs.tmxmall.com/docs/yicat/translate/export/) |
| 未翻译句段导出时会用原文填充 | 同上 |
| XLIFF 可单独导出（项目/任务维度），需选择导出流程 | [导出 XLIFF](https://docs.tmxmall.com/docs/yicat/translate/xliff-export/) |
| XLIFF 导入会覆盖原译文，不改原文；XLIFF 导入/导出适用企业基础版、企业高级版、企业旗舰版、高校版 | [导入 XLIFF](https://docs.tmxmall.com/docs/yicat/translate/xliff-import/) |

### 2.5 更新原文（迭代同步的关键）

| 事实 | 依据 |
| --- | --- |
| 「更新原文」会保留已有译文、句段状态、备注、参考信息、QA/LQA 信息、历史记录；只把新增/变化部分留给译员 | [更新原文](https://docs.tmxmall.com/docs/yicat/project-manage/reupload-file/) |
| 适用企业基础版及以上；不适用于远程下单/订单任务/作业模式项目 | 同上 |
| 若文件名不同或字数相差 10 倍以上，会弹警告确认 | 同上 |

这条很重要：以后 `zh-CN.ts` 新增 key 时，不需要重建项目，可以用「更新原文」上传新版导出文件，旧译文仍在。但它**不会**自动监听仓库变化。

### 2.6 Git / 自动同步（明确结论）

| 事实 | 依据 |
| --- | --- |
| 有 GitHub / GitLab / 私有 GitLab 连接器 | [GitHub、Gitlab 连接器](https://docs.tmxmall.com/docs/yicat/settings/connector/) |
| 仅 **企业旗舰版** 可用；项目经理/管理员/超级管理员操作 | 同上 |
| 支持手动或定时「自动拉取和推送」（可按分钟/小时，或某天某时，时间粒度为 30 分钟） | 同上 |
| 同步规则：**拉取仓库最新原文，推送 YiCAT 最新译文**；译文推到 `l10n-{分支}` 并发 PR | 同上 |
| **在 YiCAT 改原文、或在仓库改译文，都不会被同步**（官方 FAQ 第 2 条） | 同上 |
| 连接器只支持 GitHub/GitLab/私有 GitLab，不支持本地仓库、通用 Git 服务或 SVN | 同上 |
| 另有集成器 API（添加文件、更新文件、修改句段、导出文件、实时预览等），需要自行开发集成 | [YiCAT 集成器 API](https://docs.tmxmall.com/docs/yicat/api/connector-api/)、[API 参考](https://api-reference.tmxmall.com/) |

**结论**：

1. 默认流程是「导入 → 平台审校 → 导出 → 本地回并」，原文件不会被平台改动。
2. 连接器只能做到「把平台译文以 PR 形式推到仓库的本地化分支」，不是实时双向同步，也不会直接改 `ko-KR.ts`；而且要企业旗舰版 + GitHub/GitLab。
3. 即使启用连接器，仍然需要本地脚本把导出的 JSON/XLIFF 回并成 TS，并做占位符/key 校验。
4. 本地仓库（没有远端）没有任何自动同步能力。

---

## 3. 本次产物

目录：`2026-11-22/yicat-ko-review/outputs/`

| 文件 | 用途 |
| --- | --- |
| `bothpls-ko-review-2026-11-22.xlsx` | **主审校表**。13 列：key、中文原文、现有韩语、占位符、校验、字数、长度比、预检、状态、备注；单表 `Review`，可直接给人看，也可按多语 Excel 导入（源文 B、译文 C） |
| `yicat-import-minimal.xlsx` | **精简导入表**。只有 `key / zh-CN / ko-KR` 三列，避免平台对辅助列做额外解析；推荐先用它做小样验证 |
| `bothpls-ko-import.xliff` | **推荐的平台导入文件**。379 个 `trans-unit`，`resname` = key，`{name}` 等占位符转成 `<ph>` 标记 |
| `merge-ko.py` | 回并脚本。默认只预览；`--write` 才写入；只改 `ko-KR.ts`，强制校验 key 与占位符，保留行序/缩进/行尾符 |
| `README.md` | 本手册 |

已做过的自检：

- 审校表 379 行，与两个 TS 文件逐行一致（key/中文/韩语）。
- XLIFF 379 个 `trans-unit`，source/target 与 TS 完全一致，占位符 `<ph>` 可还原。
- `merge-ko.py` 用「未改动导出」测试：379 条全部识别、0 变更、0 错误。
- 用「改 1 条 + 清空 1 条 + 删 1 个占位符」的坏样本测试：正确识别 1 条可更新、2 条错误并跳过。
- XLIFF 去掉 `resname` 后测试：能按「顺序 + 原文」回退匹配，379 条全部识别。
- `--write` 在副本上测试：只改目标行，CRLF/LF 混排与无 BOM 均保持不变。

---

## 4. 导入前：新建项目

1. 登录 [YiCAT](https://www.yicat.vip/)，进入【项目管理】→【新建项目】。
2. 基本信息：
   - 项目名：`BothPls ko-KR 2026-11-22`
   - 源语言：中文（简体）`zh-CN`
   - 目标语言：韩语（如有 `ko-KR` 选项优先选 `ko-KR`）
   - 工作流：`翻译 → 审校`（两阶段即可；需要终审再加）
   - 译审同步：
     - 译员/审校同时在线，想边确认边审 → 开启
     - 想等译员整篇「交付」后再审 → 关闭
   - 注意：项目建好后**不能改工作流，也不能改这个开关**。
3. 翻译记忆库：新建 `BothPls-ko` 并启用「写入」；也可以先用空库。
4. 术语库：新建 `BothPls Terms`，建议先放：
   - 不译：`BothPls`、`Supabase`、`GitHub`、`Apple`
   - 统一译法（示例，需韩语审校确认）：投票 = 투표、选项 = 선택지、留言 = 댓글
   - 若希望 QA 强制术语一致，把该库设为「QA 术语库」并勾选「术语不一致」。
5. QA：建议启用术语不一致、格式/标记、标点、大小写、不一致、拼写（韩语）。项目级启用的规则在编辑器里不能取消，宁少勿多，先开最关键的。
6. 文档设置（仅走 Excel 路径时）：
   - 勾选「按照语言列识别原文和译文（多语 Excel）」
   - 原文列：`B`；目标语言列：`C`
   - 第一行是表头 → **不要**勾选「解析第一行」
   - 注意：原文列必须在译文列左侧；B/C 满足。
7. 点【完成】，进入项目详情，准备上传文件。

> 建议先建一个「Pilot」项目，只放 3–5 行，验证完整链路后再上 379 行。不要拿正式项目做第一次试验。

---

## 5. 导入：两条路径

### 路径 A（推荐，企业版）：XLIFF

1. 项目详情 →【上传文件】→ 选择 `bothpls-ko-import.xliff`。
2. 确认解析结果：
   - 文件被识别为双语/本地化文件；
   - 编辑器里能看到 379 个句段，原文是中文，译文是现有韩语；
   - `{name}` 等显示为标记/占位符，而不是普通文本。
3. 如果首次上传 XLIFF 没有带入现有韩语译文：改用路径 B 导入，或在文件上传后用「导入 XLIFF 文件」覆盖译文（见 5.3）。

> 说明：官方文档明确支持「XLIFF 导入覆盖译文」，也把 XLIFF 列为支持的双语文件格式；但「首次上传 XLIFF 是否预填 target」文档没有逐字说明，属于需要小样验证的点。

### 路径 B（企业基础版及以上）：多语 Excel

1. 项目详情 →【上传文件】→ 选择 `yicat-import-minimal.xlsx`（先不要用 13 列的完整表）。
2. 确认解析方式为「多语 Excel」，原文列 B、译文列 C，未解析第一行。
3. 导入后，现有韩语应作为「未确认译文」出现。审校确认即可；不需要重新翻译。
4. 小样验证通过后，再决定是否上传完整 13 列表格。完整表多出的 D–M 列是辅助列，平台理论上只读 B/C 并保留结构，但官方措辞是「尽可能保留」，**必须验证导出后辅助列是否还在、列顺序是否变化**。

### 路径 C（不推荐）：直接传 xlsx 当普通文档

团队版没有多语 Excel 解析时，xlsx 会按单元格/标点断句，key 列和译文列都会被当成普通内容，无法可靠回并。不要用这条路做正式审校。

### 后续更新已有项目

- 原文有新增/修改：项目详情 → 文件操作 →【更新原文】→ 上传新版导出文件。已有译文、状态、备注会保留（企业基础版及以上）。
- 只想用外部文件覆盖译文：文件 ··· →【导入 XLIFF 文件】。导入会覆盖译文，不改原文。

---

## 6. 在线审校：实际操作路径

1. 项目详情 → 点文件名进入编辑器（左原文、右译文）。
2. 逐条编辑：
   - 光标放右侧译文，修改后按 `Enter` = 确认句段，并自动跳到下一条。
   - 也可以点左上角【确认句段】；翻译/审校流程下可用下拉里的【确认全部句段】。
   - 确认后的句段会存云端，并写入项目启用的记忆库。
3. 句段状态：空译文 → 未确认 → 已确认 → 已交付；被退回会单独标记。审校确认后译员不能再改。
4. QA：
   - 右上【QA 设置】勾选/取消规则（项目级已启用的不能取消）；
   - 【运行 QA】对全文重跑；
   - 违规句段右侧显示轻微/一般/严重图标，逐条修。
5. 术语库 / 记忆库：
   - 右侧面板会显示记忆库匹配率和术语命中；
   - 术语不一致会被 QA 标出；
   - 应用记忆库后如果又改过，会显示「匹配并修改」。
6. 占位符 / 标记：
   - 光标放译文目标位置 → 点原文里的标记/占位符即可插入；
   - 或用【自动填充标记】；
   - 成对标记的数字要一致；**不要删除、不要翻译标记内部内容**。
   - XLIFF 路径下 `{name}` 是 `<ph>` 标记；Excel 路径下是普通文本，平台 QA 不一定管，必须靠审校表和回并脚本兜底。
7. 多人协作：
   - 项目详情 → 任务分配，按句段或字数拆分，分配译员/审校；
   - 同一文档可多人同时编辑；他人负责的句段灰色不可编辑；
   - 开启译审同步时，译员确认一句，审校就能看到并审一句。
8. 语言质量保证（可选）：项目设置里定义错误类型和罚分，审校时标注，系统自动算是否达标；导出 QA 报告可用于留档。

---

## 7. 导出：选对文件和流程

在项目详情 → 文件右侧【···】→【导出】，或在编辑器右上角导出：

| 导出项 | 用途 | 建议 |
| --- | --- | --- |
| 目标文件 | 原格式 + 回填译文（xlsx 会回填 C 列） | **回并首选（Excel 路径）** |
| 双语文件 | 原文/译文对照 | 只做人工对照，不含 key，不建议用于回并 |
| QA 报告 | QA 结果 | 留档、交接 |
| 原文 | 原始源文件 | 备份 |
| TMX | 翻译记忆库 | 备份/复用 |
| 工作流文档 | 按流程导出 | 需要中间流程版本时用 |
| XLIFF 文件 | 双语交换格式 | **回并首选（XLIFF 路径）** |

注意事项：

1. **选对流程阶段**：XLIFF 导出会让你选流程；要导出「审校后」的版本，不要误选译员阶段。
2. 未翻译句段会用原文填充；回并脚本会把「与中文相同」视为疑似未翻译并报错跳过（可用 `--allow-identical` 放行品牌名等特殊情况）。
3. 导出后先别急着回并：打开文件确认 379 行、key 列在、C 列是韩语、没有整列错位。
4. 如果导出的是完整 13 列审校表，确认辅助列 D–M 没有被平台改写或删除；若结构变了，改用精简 3 列文件走一轮。
5. 「双语文件」通常只有原文/译文两列，**没有 key**，8 组重复原文无法区分，不能作为回并输入。

---

## 8. 回并到 `ko-KR.ts`

### 8.1 原则

- **只改 `ko-KR.ts`**；`zh-CN.ts` 和 `en.ts` 绝不覆盖。
- **按 key 匹配**，不按中文原文匹配（有 8 组重复）。
- **占位符集合必须完全一致**，否则该条跳过并报错。
- 保留原有 key 顺序、缩进、逗号、行尾符；未变化的行不动。
- 文件编码 UTF-8、无 BOM。

### 8.2 用脚本回并（推荐）

在仓库根目录执行：

```powershell
# 1) 预览：只统计和显示 diff，不写文件
python 2026-11-22/yicat-ko-review/outputs/merge-ko.py --input <导出的.xlsx 或 .xliff>

# 2) 确认无误后写入
python 2026-11-22/yicat-ko-review/outputs/merge-ko.py --input <导出的.xlsx 或 .xliff> --write
```

脚本行为：

- `.xlsx`：读第一个工作表，自动找 `key` 表头，自动找含 `ko`/`韩` 的列；没有表头时按 A=key、C=韩语。
- `.xliff`：优先用 `trans-unit/@resname` 当 key；没有 `resname` 时按「顺序 + 原文」回退匹配，并校验原文一致。
- 输出统计：匹配数、将变化行数、缺少 key、多余 key、错误列表、差异预览。
- 有错误时退出码为 1；`--write` 也会先报告错误，但不会写入出错的行。
- `--report report.json` 可把统计写成 JSON 留档。
- `--allow-identical` 允许「韩语 == 中文」（默认拦截，防未翻译）。

### 8.3 手工回并（不推荐，仅应急）

1. 以 `ko-KR.ts` 为基准，按 key 定位行。
2. 只替换该行第二个字符串（value），key 和行尾逗号不动。
3. 转义规则：`\` → `\\`、`"` → `\"`、换行 → `\n`、制表符 → `\t`。
4. 逐条核对占位符（`{name}`、`{count}` 等）与中文完全一致。
5. 不要整文件另存为 CSV/Excel 再转回，容易改编码、加 BOM、丢逗号。

### 8.4 回并后验证

```powershell
# 词条一致性/占位符测试（Node 22.18+ / 24 可直接跑 .ts）
node --test src/i18n/catalog.test.mjs

# 类型检查 + 构建
npm run build

# 确认只改了 ko-KR.ts
git status --short
git diff --stat
git diff src/i18n/messages/ko-KR.ts
```

验收标准：

- `catalog.test.mjs` 全绿（key 集合一致、非空、占位符一致）。
- `git diff --stat` 只有 `ko-KR.ts`。
- 文件仍是 UTF-8 无 BOM；行尾没有被整体改写（当前文件是 CRLF/LF 混排，脚本会原样保留）。
- 抽查 48 条含占位符的词条，确认 `{...}` 原样保留。
- 抽查 56 条短标签，确认 UI 不溢出（最终以页面实测为准）。

---

## 9. 每次迭代的推荐节奏

1. 本地改 `zh-CN.ts` → 重新生成/更新导入文件（XLIFF 或 xlsx）。
2. 项目详情 →【更新原文】上传新文件（保留旧译文，只翻新增/变化）。
3. 审校确认 → 导出目标文件或 XLIFF。
4. `merge-ko.py` 预览 → `--write` → 跑测试 → 提交 PR。
5. 只提交 `ko-KR.ts`，不要提交导出的中间文件（除非团队约定留档）。

> 不要指望「平台改完自动出现在仓库」。每次都要走第 3–4 步。

---

## 10. 风险与未核实项

### 已核实

- 版本/格式支持、项目创建、工作流与译审同步、多语 Excel 配置、更新原文保留译文、编辑器/QA/句段状态/协同、导出项、XLIFF 导入导出适用版本、GitHub/GitLab 连接器适用版本与同步规则、集成器 API 的存在。

### 推断或需小样验证

1. **XLIFF 导出是否保留 `resname`**：官方文档未承诺。本次生成的是 XLIFF 1.2；若你的账号只接受 XLIFF 2.0 或有特殊解析配置，需要重新生成。脚本已做「顺序 + 原文」回退；若平台重排句段，回并会报错而不是静默错位。
2. **首次上传 XLIFF 是否预填 target**：文档只明确「导入 XLIFF 覆盖译文」。若首次不预填，改用多语 Excel 或上传后再导入 XLIFF。
3. **多语 Excel 是否 100% 保留辅助列/列序**：官方措辞是「尽可能保留原始 Excel 表格结构」。先拿 3–5 行验证 D–M 列。
4. **「双语文件」的列结构**：文档只写「双语文件（原译对照）」，没有逐字说明列名。按命名推断它只有原文/译文、**不含 key**，因此不建议作为回并输入；正式使用前请打开确认。
5. **XLIFF `<ph>` 是否会被 QA 的「格式」规则判为缺失**：QA 文档提到「格式」，未逐条列出标签。建议在 Pilot 里删一个标记试跑 QA。
6. **套餐权益与 UI 文案**：不同时间/套餐可能调整；以账号内实际可见为准。
7. **语言代码**：仓库是 `ko-KR`；YiCAT 语言列表可能显示「韩语」或「Korean (Korea)」。有 `ko-KR` 就选它，没有就选韩语，导出后仍以本地 `ko-KR.ts` 为准。

### 明确不要做

- 不要上传 `.ts`（不支持）。
- 不要把「双语文件」（无 key）当回并输入。
- 不要让审校在 Excel 里改 key 列或中文列。
- 不要把 Excel 另存为 CSV 再导入（编码/BOM/引号风险）。
- 不要用团队版做 key 级回并（没有多语 Excel/XLIFF 能力）。
- 不要期待连接器直接改 `ko-KR.ts`（它只推译文文件/PR，且仅旗舰版 + GitHub/GitLab）。

---

## 11. 参考来源

- [YiCAT 简介（支持格式/版本/语种）](https://docs.tmxmall.com/docs/yicat/start/intro/)
- [新建项目](https://docs.tmxmall.com/docs/yicat/start/new-project/)
- [选择工作流](https://docs.tmxmall.com/docs/yicat/project-manage/project-workflow/)
- [特殊格式文档设置（多语 Excel）](https://docs.tmxmall.com/docs/yicat/project-manage/doc-config/)
- [多语 Excel 官方发布文章（2026-07-24）](https://www.tmxmall.com/article/detail?articleId=9003245045181785218359536)
- [更新原文](https://docs.tmxmall.com/docs/yicat/project-manage/reupload-file/)
- [翻译和审校句段](https://docs.tmxmall.com/docs/yicat/translate/trans-edit/)
- [句段状态](https://docs.tmxmall.com/docs/yicat/translate/segment-status/)
- [QA 设置](https://docs.tmxmall.com/docs/yicat/translate/qa/)
- [标记和占位符](https://docs.tmxmall.com/docs/yicat/translate/tag/)
- [协同翻译](https://docs.tmxmall.com/docs/yicat/translate/co-trans/)
- [任务分配](https://docs.tmxmall.com/docs/yicat/project-manage/task-assign/)
- [导出译文](https://docs.tmxmall.com/docs/yicat/translate/export/)
- [导出 XLIFF](https://docs.tmxmall.com/docs/yicat/translate/xliff-export/)
- [导入 XLIFF](https://docs.tmxmall.com/docs/yicat/translate/xliff-import/)
- [GitHub、Gitlab 连接器](https://docs.tmxmall.com/docs/yicat/settings/connector/)
- [YiCAT 集成器 API](https://docs.tmxmall.com/docs/yicat/api/connector-api/)
- [API 参考](https://api-reference.tmxmall.com/)
