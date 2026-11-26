# 问题反馈

入口：设置 → 关于 → 问题反馈（`/settings/feedback`）。游客和已登录用户均可提交。

标题、描述必填；联系方式和一张截图选填。标题 / 描述 / 联系方式分别限制为 100 / 3000 / 200 字符。截图支持 JPG、PNG、WebP，最大 5 MB。

界面沿用设置页的粉紫渐变背景、玻璃卡片、圆角输入框和紫色按钮，支持中文、英文、韩文。失败时保留输入和截图；反馈写入失败后重试复用已上传截图。

## 部署与处理

先应用 `supabase/migrations/20261126130816_user_feedback.sql`，再部署前端。迁移创建 `public.user_feedback` 和私有的 `feedback-screenshots` Storage bucket；`supabase/schema.sql` 已同步。

团队使用 Supabase Dashboard 的 Table Editor 查看 `user_feedback`，按 `created_at` 倒序处理；`screenshot_path` 对应 Storage 中同名私有文件，可由有权限的团队成员预览。反馈保存提交时的应用版本和界面语言，联系方式留空时存为 NULL。

客户端仅有指定字段的新增权限，不能读取、修改或删除反馈，也不能读取、覆盖或删除截图。管理员通过 Dashboard 或受信任的服务端角色处理；前端只使用现有公开客户端密钥。

截图上传成功但用户放弃重试、替换截图或离开页面时，可能留下未关联反馈的文件。维护时可清理创建超过一天且未被 `user_feedback.screenshot_path` 引用的文件。

## 验证

生产构建：`npm run build`。

浏览器：在 `tools/browser` 中执行 `npx playwright test tests/feedback.spec.mjs tests/settings-navigation.spec.mjs tests/localization.spec.mjs`。覆盖游客和账号提交、可选联系方式、截图预览与移除、格式和大小校验、失败重试、防重复提交，以及 320px / 390px 下的三种语言布局。

数据库：把 `PGLITE_MODULE` 指向临时安装的 `@electric-sql/pglite` 的 `dist/index.js`，在仓库根目录执行 `node tools/verify-feedback-sql.mjs`。测试执行实际迁移并检查字段约束、客户端提交权限、反馈和私有截图的访问隔离以及服务端读取权限。
