# BothPls Apple sign-in and iOS setup

## Build and verify

Use Node.js 22 or later and Xcode 26 or later. Supply the public Supabase URL and publishable/anon key as on the web. Also set `VITE_PUBLIC_APP_ORIGIN` to the HTTPS origin of the deployed BothPls website, with no path, query or fragment. The native app uses this origin for public poll links and the browser sign-in link.

```sh
npm ci
npm run ios:sync
npm exec -- cap open ios
```

`ios:sync` builds into `dist-ios` and copies the bundle into the Xcode target. The normal web build still produces `dist`. The iOS Simulator pull request workflow builds the exact PR head with signing disabled and placeholder public configuration, and checks that the app contains the bundled SPA. It also checks the Swift nonce generator without an Apple account. The workflow produces a compile check, while a signed-device test is needed to exercise the real system sheet and Apple token exchange.

Run the browser mocks with a local Playwright Chromium installation. Keep the Supabase values synthetic.

```sh
npm ci --prefix tools/browser
npm exec --prefix tools/browser -- playwright install chromium
export VITE_SUPABASE_URL=https://example.supabase.co
export VITE_SUPABASE_ANON_KEY=ci-placeholder-not-a-real-key
export VITE_PUBLIC_APP_ORIGIN=https://bothpls.example
npm test --prefix tools/browser -- apple-auth.spec.mjs
npm test --prefix tools/browser -- apple-web-auth.spec.mjs oauth.spec.mjs account-only-voting.spec.mjs
```

The mocks cover the platform-specific button, safe navigation and web cancellation, iOS bridge cancellation and retry, the raw nonce in the Supabase exchange, session restoration, and the browser fallback link. They use intercepted requests and a simulated Capacitor bridge.

## Owner checklist

1. In Apple Developer, create the explicit iOS App ID `org.sd5913.bothpls` and enable **Sign in with Apple** as the primary App ID. The Xcode target already declares the entitlement. In Supabase Auth’s Apple provider, enable Apple and include that bundle ID in **Client IDs**. Keep nonce verification enabled. A native-only setup does not require an Apple OAuth client secret. [Apple native setup](https://developer.apple.com/documentation/authenticationservices/implementing-user-authentication-with-sign-in-with-apple) · [Supabase Apple setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple)
2. To enable the web flow, create Services ID `org.sd5913.bothpls.web` and associate it with the primary App ID. Configure the required domains and register the exact HTTPS **Return URL** shown by Supabase’s Apple provider, usually `https://<project-ref>.supabase.co/auth/v1/callback`. This is the Apple-to-Supabase callback. Supabase then sends the browser to the existing BothPls `/auth?returnTo=…` page. Verify that the intended website and its existing Auth redirect allow-list accept that callback. Keep the current narrow origin/path rules and preserve the email and GitHub entries. [Apple web setup](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/) · [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
3. When enabling both paths, order the Supabase Apple **Client IDs** as `org.sd5913.bothpls.web,org.sd5913.bothpls`. The first ID drives web OAuth and both IDs are accepted as native ID token audiences. Use an Apple Sign in with Apple private key for the primary App ID to generate the web OAuth **client-secret JWT**, scoped to the Services ID. Store the JWT in the Supabase Apple provider and keep the `.p8` key in the owner’s private credential store. Replace the JWT before it expires, at most every six months, and retest web sign-in after rotation. Keep both out of Vite, the repository and build logs. [Apple client secret](https://developer.apple.com/documentation/signinwithapple/configuring-your-environment-for-sign-in-with-apple) · [Supabase web OAuth setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple#configuration-web-oauth)
4. Web Apple sign-in is already enabled in the current web UI; preserve the existing provider and callback configuration. There is no longer a web build flag. For device testing, select the owner’s Apple development team in Xcode and use provisioning that includes the entitlement. Test native Apple first and repeat sign-in, cancellation/retry, session persistence after relaunch, sign-out, and the guest-to-account voting flow (guests can browse, but must sign in to vote). Test web Apple from a protected page and confirm return to that page. Verify that poll links shared from a phone open on the public website.
5. For TestFlight, follow the [BothPls TestFlight setup](IOS_TESTFLIGHT.md) to configure distribution signing and an individual App Store Connect upload key. Keep those credentials separate from the Sign in with Apple private key and the Supabase client-secret JWT.

## Browser sign-in on iOS

The native target uses AuthenticationServices for Apple. It generates a fresh random nonce in Swift, sends its SHA-256 digest to Apple, and exchanges the ID token and original nonce through the existing Supabase client. A successful exchange updates BothPls through the usual session listener.

Email verification codes, Google OAuth and GitHub OAuth remain available on the website. The iOS sign-in page opens that website in the default browser with the sanitized return path, and login completes there. Browser and app sessions are separate. Completing email, Google or GitHub sign-in in a browser, or switching back to BothPls leaves the app's native session as it was. Poll links from the native app also open the website. Automatic browser-to-app sign-in would require a separately configured and tested callback design.

Apple sends email through its private relay when users hide their address. If sending mail through that relay is required later, register the sending domains or addresses with Apple. BothPls keeps its existing account/profile behavior. [Apple private email relay](https://developer.apple.com/help/account/capabilities/configure-private-email-relay-service/)

Apple button images were rendered by the [official Apple button endpoint](https://developer.apple.com/documentation/signinwithapple/incorporating-sign-in-with-apple-into-other-platforms). Web and iOS reuse the existing localized Apple button and locale provider (Simplified Chinese, English and Korean). Native introduction and browser-session copy live in the shared message catalogs.
