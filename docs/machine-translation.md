# BothPls 机器翻译配置与部署

本说明对应 [PR 58](https://github.com/sd5913/The-Aliien-Repo/pull/58)。已改用开源 [translate.js](https://github.com/xnx3/translate)，固定依赖 i18n-jsautotranslate@4.0.0，使用 client.edge 通道。

**无需创建 Google Cloud 项目、配置翻译密钥或部署 Supabase 翻译函数。部署包含本 PR 的前端即可。** 网站原有数据库与登录配置仍需保留。

## 翻译规则

| 用户选择 | 他人投票 | 当前登录账号发布的投票 |
| --- | --- | --- |
| 中文 | 简体中文 | 原文 |
| English | 英文 | 原文 |
| 한국어 | 韩文 | 原文 |

首页、投票详情与结果页遵循同一规则。只翻译标题、描述和全部选项文字，不识别或修改图片，不翻译评论。原始内容、选项 ID 和票数不变；提供查看原文与重试。未登录时无法确认归属，按访客规则翻译。

纯机器翻译，无人工审核；支持语言和质量取决于通道，不能保证任意语言、俚语或短词都准确。

## 部署

1. 使用 PR 58 分支 codex/poll-machine-translation 的最新代码创建前端预览部署。依赖随正常安装步骤安装，无需添加 CDN 脚本。
2. 翻译默认开启。若环境原来设置了 `VITE_POLL_TRANSLATION_ENABLED=false`，改成 `true` 或移除，然后重新构建部署。
3. 保留网站已有的 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。翻译不再需要额外密钥。
4. 预览验收通过后再合并、部署正式网站。提交 PR 不代表正式网站已上线。

本地运行：

```powershell
npm ci
npm run dev
```

构建检查：`npm run build`。关闭翻译：设置 `VITE_POLL_TRANSLATION_ENABLED=false` 后重新构建部署。环境变量修改不影响已经生成的前端文件。

若已按旧文档部署 translate-poll 或配置 GOOGLE_TRANSLATE_API_KEY，新版本不会调用它们；确认无其他用途后可自行清理。本次未删除任何云端资源。

## 请求与缓存

浏览器通过 translate.js 直接向 edge.microsoft.com 发送待翻译文字和目标语言，不发送应用登录令牌、投票 ID 或用户 ID。他人投票文字交由外部服务处理，包括浏览者有权限访问的链接投票。当前账号自己的投票不发起此请求。

只调用文本接口，不启用整页扫描、DOM 替换或额外语言选择器。内存缓存按投票 ID、完整原文和目标语言隔离，最多 200 条、有效期一小时；刷新可能重新请求。空白字段保留，重复文字复用结果。请求超时或失败显示原文，仍可投票。

client.edge 不要求本站配置 API key，但依赖外部接口及用户网络，不承诺无限额度或长期可用性。若网站自行配置 CSP，connect-src 需要允许 https://edge.microsoft.com。

## 验收

准备账号 A、B，用 A 发布日文标题、西班牙文说明和中韩文选项的投票。

1. B 分别选择中英韩：首页、详情、结果显示对应译文，查看原文可还原。
2. A 查看自己的投票：任何界面语言下都保留原文，不请求翻译。
3. B 在译文下投票：提交原始选项 ID，结果对应正确。
4. A 修改内容后，B 再次读取时获得新内容译文。
5. 阻断翻译网络：原文仍可读、可投票，恢复后重试成功。

Network 中应出现 edge.microsoft.com/translate/translatetext 请求，目标为 zh-CHS、en 或 ko。省略源语言参数以自动识别每段文字：该接口拒绝 from=auto，适配层已修正 translate.js 默认 URL。

自动化浏览器测试模拟上游响应验证交互与失败路径；另已使用虚构混合语言短句，在真实浏览器中成功获得中英韩译文。此检查不代表正式网站已部署，也不保证所有地区网络可用。

## 常见问题

| 现象 | 检查 |
| --- | --- |
| 没有翻译提示 | 是否看自己的投票；部署是否包含 PR；开关是否为 false |
| 翻译不可用 | Network 请求、网络、CSP、上游错误或限流；恢复后重试 |
| 切换语言后不变 | 是否查看原文或自己的投票；是否打开旧部署 |
| 文字不准确 | 短词、专有名词、混合语言可能误译，可查看原文 |

参考：[文本接口](https://translate.zvo.cn/4077.html)、[通道说明](https://translate.zvo.cn/4081.html)。
