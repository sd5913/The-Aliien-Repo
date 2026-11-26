# BothPls 机器翻译配置与部署

用户选择的界面语言就是投票译文语言。中文界面看中文译文，英文界面看英文译文，韩文界面看韩文译文；登录账号自己发布的投票始终显示原文。首页、投票详情和结果页采用同一规则。

本说明对应 [机器翻译 PR 58](https://github.com/sd5913/The-Aliien-Repo/pull/58)。功能默认关闭，按以下步骤配置后再在预览环境验收。全程机器翻译，无人工审核；翻译范围为标题、说明和全部选项，不含评论或图片文字。

# 一 翻译规则

| 用户选择 | 他人投票 | 自己发布的投票 |
| --- | --- | --- |
| 中文 | 简体中文译文 | 原文 |
| English | 英文译文 | 原文 |
| 한국어 | 韩文译文 | 原文 |

“自己的投票”按当前登录账号与投票创建者 ID 判断。未登录时无法确认归属，按访客浏览规则翻译。切换语言后重新选择对应译文；缓存按投票、内容版本和目标语言隔离。翻译失败继续显示原文，并提供重试，不影响投票。支持语言以翻译服务为准，短词、俚语或混合语言仍可能误译。

# 二 获取 Google 翻译密钥

1. 打开 [Google Cloud 控制台](https://console.cloud.google.com/)，创建或选择一个用于翻译测试的项目。
2. 为该项目启用结算，再进入 APIs & Services 的 Library，搜索并启用 Cloud Translation API。
3. 进入 APIs & Services 的 Credentials，创建 API key。当前代码使用 Cloud Translation Basic v2，可用 API key；不是 Gemini API key，也不使用 Advanced v3。
4. 编辑该密钥，在 API restrictions 中限制为 Cloud Translation API。密钥用于 Supabase 服务端调用，不应使用只允许网页来源的 HTTP referrer 限制；若已有固定出口 IP，可按实际出口配置 IP 限制。
5. 在 Cloud Translation 的 Quotas 页面降低每日字符额度，用于控制试点开销。默认每日字符额度可能不限量，预算提醒不等于自动停用。

密钥是敏感信息：直接保存到下一步的 Supabase Secrets，不要发到聊天、PR、截图或提交进 Git。参考 [Google 开通说明](https://docs.cloud.google.com/translate/docs/setup)、[Basic v2 密钥支持](https://docs.cloud.google.com/translate/docs/authentication)、[密钥限制](https://docs.cloud.google.com/docs/authentication/api-keys) 和 [配额说明](https://docs.cloud.google.com/translate/quotas)。

# 三 在 Supabase 配置密钥

打开网站使用的 Supabase 项目，进入 Edge Functions 的 Secrets 页面，新增并保存：

| Name | Value |
| --- | --- |
| GOOGLE_TRANSLATE_API_KEY | 上一步创建的真实 Google API key |

先确认项目与前端的 `VITE_SUPABASE_URL` 指向同一环境。若使用独立测试 Supabase 项目，该项目需要已有应用数据库和投票读取函数；仅部署翻译函数不会建立整套数据库。

运行环境会提供 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`，无需将 Google 密钥填入这两个变量。不要创建 `VITE_GOOGLE_TRANSLATE_API_KEY`；以 `VITE_` 开头的变量可能进入浏览器构建。

保存成功后，在 Secrets 列表能看到变量名即可，不需要再次展示密钥值。操作参考 [Supabase Secrets 文档](https://supabase.com/docs/guides/functions/secrets)。

# 四 部署翻译函数

以下命令适用于本仓库已安装的 Supabase CLI 3.2.0。终端进入项目，使用 PR 58 的最新分支代码：

```powershell
Set-Location E:\xyt\bothpls\The-Aliien-Repo
git switch codex/poll-machine-translation
git pull --ff-only
npx supabase login
npx supabase functions deploy translate-poll --remote=YOUR_PROJECT_REF --use-api
```

把 `YOUR_PROJECT_REF` 换成目标 Supabase 项目的 reference ID；通常是项目地址 `https://项目编号.supabase.co` 中的编号，不是 Google 项目 ID。检查 CLI 显示的目标后确认执行。若本地有未提交改动，先保存工作，再切换分支。

`--use-api` 使用服务端打包，无需本地 Docker。CLI 3 使用 `--remote`，不要照搬旧教程的 `--project-ref`；若版本不同，先查看 `npx supabase functions deploy --help`。

仓库的 `supabase/config.toml` 已为 `translate-poll` 设置 `verify_jwt = false`，以支持游客浏览；函数仍通过现有 `get_poll_by_link` 规则读取内容，不使用 service-role 绕过读取规则。部署后在 Edge Functions 列表确认 `translate-poll` 存在。这项功能不需要新的数据库迁移。参考 [Edge Function 部署说明](https://supabase.com/docs/guides/functions/deploy)。

# 五 在网站预览环境开启功能

若前端托管在 Vercel，打开对应项目的 Environment Variables，给 Preview 环境添加：

```text
VITE_POLL_TRANSLATION_ENABLED=true
```

确认同一 Preview 环境已有正确的 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`，然后重新部署 PR 58 对应的分支预览。Supabase 函数部署和 Vercel 前端部署是两个独立步骤。修改环境变量不会改变旧部署，必须重新构建。[Vercel 环境变量说明](https://vercel.com/docs/environment-variables/managing-environment-variables)

本地测试可在终端临时开启，无需修改密钥文件：

```powershell
$env:VITE_POLL_TRANSLATION_ENABLED = "true"
npm run dev
```

真实服务验收通过后，再将功能代码合并到正式分支，为 Production 配置同名开关并重新部署。不要只给旧主分支加开关；它必须包含 PR 58 的代码。

# 六 验收方法

准备两个账号 A 和 B。用 A 发布一条包含日文标题、西班牙文说明及不同语言选项的投票，用 B 浏览。

1. B 选择中文：首页与详情显示中文译文，查看原文可看到 A 的原始内容。
2. B 切换 English 和 한국어：他人投票分别显示英文、韩文，不复用错误语言的缓存。
3. A 查看自己的投票：无论界面语言如何变化，标题、说明和选项均保持原文，不发起自动翻译请求。
4. B 在译文下投票：提交的仍是原选项 ID，票数和选项对应关系正确。
5. A 修改原文后，B 再次查看：新内容重新翻译。
6. 在测试环境使翻译服务不可用：显示原文和重试入口，仍可正常浏览与投票。

浏览器 Network 中的 `translate-poll` 请求应只有投票 ID 与目标语言：中文为 `zh-CN`、英文为 `en`、韩文为 `ko`；请求中不应出现 Google 密钥。自动化测试使用模拟翻译响应，真实质量需按以上步骤验收。

# 七 常见问题和回退

| 现象 | 检查位置 |
| --- | --- |
| 完全没有翻译提示 | 功能开关是否在当前环境开启并重新构建；是否正在看自己的投票 |
| 函数不存在或请求 404 | 前端 Supabase 地址与部署目标是否一致；函数名是否为 translate-poll |
| TRANSLATION_UNAVAILABLE | Supabase Secrets 是否配置 GOOGLE_TRANSLATE_API_KEY |
| INVALID_TARGET 或切换语言无效 | 前后端是否都部署了 PR 58 最新版本 |
| TRANSLATION_FAILED | 检查 Google API 是否启用、结算、密钥限制、字符配额和网络状态 |
| POLL_UNAVAILABLE | 投票是否已删除，现有读取 RPC 与账号访问状态是否正常 |
| RATE_LIMITED | 当前 worker 的翻译调用达到限制，稍后重试 |

需要回退时，将前端 `VITE_POLL_TRANSLATION_ENABLED` 设为 `false` 后重新部署，页面恢复原文显示。缓存为内存缓存，不是永久译文库；冷启动或不同 worker 可能重复调用并计费。Google 字符配额用于限制整体用量，当前 worker 的限流不能替代全局配额。
