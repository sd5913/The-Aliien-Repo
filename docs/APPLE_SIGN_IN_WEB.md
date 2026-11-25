# Apple 网页登录配置

本分支仅使用 Supabase 托管的 Apple OAuth 重定向流程，不包含 iOS 原生登录、Capacitor 或 Apple JS 登录。

1. 在 Apple Developer 创建启用 Sign in with Apple 的 App ID，再创建关联它的 Services ID。
2. 在 Services ID 的 Website URLs 中配置：
   - Domain: `<project-ref>.supabase.co`
   - Return URL: `https://<project-ref>.supabase.co/auth/v1/callback`
3. 创建 Sign in with Apple 的私钥，保存 `.p8` 文件，并记下 Team ID 和 Key ID。
4. 使用 [Supabase Apple 登录文档](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple)中的工具生成 ES256 client secret JWT。`.p8` 私钥和 JWT 不应提交到仓库。
5. 在 Supabase Dashboard → Authentication → Providers → Apple 中启用 Apple：Client IDs 填 Services ID，Secret Key (for OAuth) 填生成的 JWT。
6. 在 Authentication → URL Configuration 中，将网站生产域名和预览域名的 `/auth` 回调 URL 加入 Redirect URLs。应用会把安全校验后的 `returnTo` 附在同源 `/auth` 地址后。
7. 在实际网站上测试登录、取消授权、返回原页面及隐藏邮箱的情形。OAuth JWT 有效期不超过六个月，到期前用保存的 `.p8` 重新生成并替换。

页面使用 PR #18 中的 Apple 登录按钮素材，保留 Apple 的黑色按钮外观、文字及标志比例。按钮位于其他第三方登录方式之前，并使用 Supabase `signInWithOAuth({ provider: "apple" })` 启动流程。
