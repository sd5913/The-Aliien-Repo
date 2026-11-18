# 后端权限与部署

## 已应用的权限边界

迁移：`supabase/migrations/20261118035831_enforce_poll_permissions.sql`。

- `polls.owner_id` 是创建者账号 UUID，关联 `auth.users`；不再信任客户端作者字段。
- 创建、编辑、结束、删除通过 `save_poll`、`close_poll`、`delete_poll` RPC；服务端检查 `auth.uid()` 与实际账号类型、所有权。
- 三张公开表保留按 RLS 过滤的读取，但禁止 `anon` 和 `authenticated` 直接增删改。
- 公开投票、选项、票数可以读取；非公开投票只有创建者可以读取。
- `save_poll` 在一个事务内保存投票及 2–5 个选项；不会先删空全部选项。不能移走其他投票的选项，也不能移除已有票的选项。
- 已结束或过期投票不能编辑、重新开放或提交新票、改票。删除仍允许创建者执行。
- 投票、关闭、编辑、删除锁定同一投票行；取得锁后使用数据库当前时间检查截止时间。

## 软登录

参与者不需要邮箱账号。浏览器生成 256-bit 随机凭证，通过 `register_participant` 取得服务端生成的身份 UUID。

凭证只保存到当前浏览器；服务器在 `private.soft_participants` 中保存 SHA-256 摘要。投票的公开 UUID 不是凭证，知道其他人的 UUID 不能修改其投票。

`submit_vote` 验证 UUID 与凭证，并验证单选、选项属于本投票、投票公开且仍开放。唯一约束保证同一身份只保留一份最新选择。

`getVoter()` 只返回公开 ID 和昵称，不把凭证拷贝进评论、投票数据或分享内容。

所有高权限实现都在非公开的 `private` schema；`public` RPC 是 SECURITY INVOKER。函数设定空 search_path，并撤销 PUBLIC 默认执行权限。凭证表不授予客户端任何读写权限；RLS 没有策略是有意的默认拒绝，不要为消除 advisor INFO 而开放它。

## 历史数据

只把作者字段精确匹配已有非匿名账号 UUID 的投票回填到 `owner_id`，不自动认领旧浏览器创建的投票。

没有服务端凭证的历史软登录身份需要重新填写一次昵称与头像，生成新的安全身份。历史票数保留，但不能仅凭公开 UUID 认领旧票。清除浏览器存储也会失去该软登录身份。

## 部署

1. 现有数据库执行对应迁移；新建数据库执行完整 `supabase/schema.sql`。
2. 同步发布本次前端；旧版直接写表的前端不能继续写入，不能通过恢复匿名增删改解决。
3. 保留邮箱登录使用的 Supabase Redirect URLs 配置，允许 `/auth` 回调携带 `returnTo` 查询参数。
4. 新增函数的 PostgREST 缓存刷新由迁移里的 NOTIFY 完成。

本次已应用到 BothPls 项目。没有自动部署前端或推送 Git；commit 包含此前的创建者账号身份接入，它是这次服务端权限的前置依赖。

## 验证

- `supabase/tests/permissions.sql` 在一个连接中运行，创建临时测试账号和投票，最后 ROLLBACK。
- 覆盖匿名管理拒绝、跨账号越权、强制服务端所有权、软登录改票、伪造凭证、无效/多选、服务端截止时间、关闭后拒绝、原子保存失败回滚、删除级联。
- 运行 `node src/features/auth/utils/account.test.mjs`、`node src/features/auth/utils/participant.test.mjs`、`node src/features/polls/utils/navigation.test.mjs` 和 `npm run build`。
- 迁移后的 advisors 无新增安全警告；凭证表默认拒绝产生一条 INFO。项目原有的泄露密码保护警告未在本次调整。

评论仍存浏览器本地，本次没有把评论同步到后端，也未修改其可见性产品规则。
