# BothPls on TestFlight

TestFlight builds use Xcode 27 and require the iOS 27 SDK or later.
BothPls uses the `App` Xcode scheme and the explicit App ID
`org.sd5913.bothpls`. For local and simulator development, follow the
[iOS and Apple sign-in setup](APPLE_SIGN_IN_IOS.md).

## Owner setup

1. Issue the course's Apple Distribution certificate on team `76LUX2KQMG`
   and export the certificate with its matching private key as a
   password-protected `.p12`. Make a new App Store Connect distribution
   profile for `org.sd5913.bothpls` using that exact certificate. The profile
   must include the **Sign in with Apple** entitlement with `Default`.
2. Confirm the BothPls app record for this bundle ID in App Store Connect.
   Give the uploader the **Developer** role, access only to BothPls, and
   permission to generate an individual API key. The uploader generates the
   key in **Edit Profile** and records its Key ID. That key is different
   from the one used for web Apple sign-in. [Apple app uploads](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/), [App Store Connect API keys](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api/)
3. Use the instructor-approved `sd5913/The-Aliien-Repo` repository. Its
   `bothpls-testflight` environment requires owner approval, disables
   administrator bypass, and accepts only the `main` branch. Before the
   first upload, protect `main` with required PR review and the unsigned
   iOS simulator check. [GitHub environment protection](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)

Open **Settings → Environments → bothpls-testflight** to configure these
entries. A repository administrator can add the `.p8` under **Environment
secrets** and the Key ID and website origin under **Environment variables**.
For file-based secrets, `base64 < path/to/file | tr -d '\n'` produces one
line. Run it on a trusted device and paste the result only into the matching
secret field. The uploader's individual key requires the Key ID and `.p8`.

| Entry | Kind | Source |
| --- | --- | --- |
| `BOTHPLS_APPLE_TEAM_ID` | Variable | Apple Developer Team ID |
| `BOTHPLS_ASC_INDIVIDUAL_KEY_ID` | Variable | Key ID of the BothPls uploader's individual key |
| `BOTHPLS_DISTRIBUTION_P12_BASE64` | Secret | Base64 of the new Apple Distribution `.p12` |
| `BOTHPLS_DISTRIBUTION_P12_PASSWORD` | Secret | Password protecting the `.p12` |
| `BOTHPLS_PROVISIONING_PROFILE_BASE64` | Secret | Base64 of the renewed BothPls `.mobileprovision` |
| `BOTHPLS_ASC_INDIVIDUAL_KEY_BASE64` | Secret | Base64 of the BothPls uploader's individual App Store Connect `.p8` |
| `VITE_PUBLIC_APP_ORIGIN` | Variable | Deployed BothPls website HTTPS origin, without a path, query or fragment |
| `BOTHPLS_TESTFLIGHT_ENABLED` | Variable | Start with `false`. Set to `true` after verifying the prerequisites |

The iOS web bundle uses the existing `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` repository secrets. Confirm they point to the same
Supabase project as the website and that Supabase has the BothPls bundle ID
in its Apple provider's allowed Client IDs.

## Upload and check

From a trusted device, check the uploader's access with Node.js 22 and the
individual key before adding it to GitHub. The command makes a read request
and verifies the key can see exactly one app, `org.sd5913.bothpls`.

```sh
ASC_KEY="$(base64 < /private/path/to/AuthKey.p8 | tr -d '\n')" \
  ASC_KEY_ID=YOUR_KEY_ID node .github/scripts/ios-upload.mjs check-access
```

Once the workflow is on protected `main` and enabled, run **Upload BothPls
to TestFlight** manually from `main` and approve the environment deployment.
The workflow builds and syncs the existing iOS bundle, signs the App target
with the matching profile and certificate, and uploads the IPA. The signing
and upload steps receive their own credentials. GitHub does not retain the
signed IPA as an artifact.

Match the build number in the Actions log to the BothPls **TestFlight** tab
in App Store Connect after Apple processes the build. Confirm Apple shows it as
eligible for internal testing before adding it to the intended group. Install
it on a real iPhone and verify Apple sign-in, cancellation and retry,
session persistence after relaunch, and links opening on the public website.
Confirm launch on the oldest supported iOS version the team can test.
