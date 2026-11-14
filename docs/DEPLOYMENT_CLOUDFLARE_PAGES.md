# Deploy BothPls to Cloudflare Pages + Supabase

The app is a static React + Vite SPA. GitHub Actions builds `dist/` and uploads
it to Cloudflare Pages using Wrangler. Supabase remains the backend; no database
migration, Workers server, or application rewrite is needed.

This is an alternative to [Vercel deployment](DEPLOYMENT_VERCEL_SUPABASE.md).
The existing Vercel configuration remains unchanged. This guide uses **Pages
Direct Upload**, not Cloudflare's Git integration, because GitHub Actions owns
the build and deployment.

## 1. Create a Cloudflare Pages project once

You need access to the intended Cloudflare account and permission to manage the
GitHub repository's Actions secrets.

On your own computer with Node.js 22 installed, run:

```sh
npx --yes wrangler@4.162.0 login
npx --yes wrangler@4.162.0 pages project create bothpls --production-branch main
```

`bothpls` is an example project name. Choose your own lowercase name if needed,
select the intended account if prompted, and save that exact name for step 3.
This creates the project without publishing the app. Use the production branch
`main` to match the workflow.

Do not also import this repository through Cloudflare's Git integration for
this setup: that would introduce a second build/deployment pipeline. A Direct
Upload project cannot later be switched to Git integration in place; that would
require a new project. If using an existing Git-integrated project with Wrangler,
disable its automatic Git deployments to avoid duplicate deployments.

## 2. Create a narrowly scoped Cloudflare API token

1. In the Cloudflare dashboard, open **My Profile > API Tokens > Create Token**
   (or **Account API tokens**, if available for your account).
2. Choose **Create Custom Token** and give it a name such as `BothPls GitHub Pages`.
3. Under **Permissions**, add **Account > Cloudflare Pages > Edit**.
4. Under **Account Resources**, select **Include > Specific account** and choose
   only the account containing your Pages project.
5. Create the token and copy it directly into the GitHub secret in step 3.
   Do not paste it into an issue, PR, chat, or committed file. Do not use the
   Global API Key.

Find the **Account ID** in that account's dashboard (account overview or
**Workers & Pages**). It is not a Zone ID or the Pages project name. No custom
domain is required to deploy to `pages.dev`.

## 3. Add five GitHub repository secrets

Open:

<https://github.com/sd5913/The-Aliien-Repo/settings/secrets/actions>

Alternatively: repository **Settings > Secrets and variables > Actions >
Secrets > New repository secret**. Add each entry separately, with the exact
name below, no surrounding quotes, and no trailing spaces:

| Repository secret | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | The scoped token from step 2. |
| `CLOUDFLARE_ACCOUNT_ID` | The account ID containing the Pages project. |
| `CLOUDFLARE_PAGES_PROJECT_NAME` | The exact project name from step 1, e.g. `bothpls`; not a URL. |
| `VITE_SUPABASE_URL` | The existing Supabase project URL, e.g. `https://<project-ref>.supabase.co`; not its dashboard URL. |
| `VITE_SUPABASE_ANON_KEY` | That project's **publishable** key (`sb_publishable_...`) or legacy **anon** key. |

All five belong under **repository secrets**, not repository variables or an
environment's secrets: this workflow does not select a GitHub environment.

**Important:** `VITE_*` values are embedded in the public JavaScript during the
build. Storing them as GitHub secrets avoids committing their values, but does
not hide them from visitors. Never put a Supabase `service_role` key or an
`sb_secret_...` key here. Database access must be protected by Supabase RLS.
The prototype currently allows anonymous database writes; review its policies
before treating the app as production-ready.

Because the build runs in **GitHub Actions**, setting these values only in the
Cloudflare dashboard will not configure the frontend. Keep the existing
Supabase tables and data; do not rerun or change the schema just to move hosts.

## 4. Merge and deploy

The workflow is [`.github/workflows/cloudflare-pages.yml`](../.github/workflows/cloudflare-pages.yml).

- Pull requests targeting `main` run `npm ci` and `npm run build` with dummy
  Supabase values. They do not receive real credentials, access the database,
  or deploy. This also works for fork PRs. It checks compilation, not live
  backend functionality.
- Pushes to `main` (including merging a PR) validate all five secrets, install
  the locked dependencies, build with the real public Supabase values, and
  deploy `dist/` to the Pages production branch `main`.
- After the workflow is on `main`, **Actions > Cloudflare Pages > Run workflow**
  can rebuild and redeploy. Select `main`; manual runs on other branches do not
  deploy. Changing a secret alone does not trigger a deployment.

Set up the Pages project and secrets **before merging** if you want the first
production run to succeed. If they are missing, deployment fails with the
missing secret names, without printing their values. Complete setup and rerun
the workflow. If GitHub Actions is disabled, an administrator must enable it
and allow the pinned `actions/checkout` and `actions/setup-node` actions.

Find the actual production URL in **Cloudflare > Workers & Pages > your Pages
project**. Wrangler also reports deployment URLs in the Actions log. No custom
domain or DNS change is required. Vercel can remain online while you test;
adding this workflow does not disable its existing deployments.

## 5. Verify before switching shared links

1. Open the Pages production URL on a phone and confirm the home page renders.
2. Directly open and refresh `/create`, `/settings`, `/poll/<existing-id>`, and
   `/poll/<existing-id>/results`. They should load without a hosting 404.
3. Create a test poll, open its link on a second device, vote, and refresh the
   creator's results. Confirm the shared data is still coming from Supabase.
4. Test closing and deleting your own test poll. Do not test on someone else's
   data. Check browser Network errors and Supabase policies if writes fail.

Cloudflare Pages automatically serves the SPA for unmatched routes when the
output has no top-level `404.html`. The workflow checks this condition and the
presence of `dist/index.html`. `vercel.json` is ignored by Cloudflare and can
stay in the repository to preserve Vercel support. No extra rewrite is needed.

Browser LocalStorage is scoped to the site's origin. Moving from a Vercel URL
to a Pages URL does **not** carry across local comments, preferences, or anonymous
voter identities. Existing shared Vercel links also do not automatically change
to Pages links. Test first, then update the README's live demo link and any
shared links deliberately. A `vercel.app` domain cannot be moved to Cloudflare;
use the Pages URL or a custom domain you control.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `Missing repository secret` | Add the exact name under repository Actions secrets, then rerun on `main`. |
| Cloudflare authentication/authorization failure | Token has Pages Edit for the correct account and has not expired; Account ID is correct. |
| Pages project not found | Create it in the same account and match `CLOUDFLARE_PAGES_PROJECT_NAME` exactly. |
| Deployment is a preview, not production | Project production branch must be `main`; workflow uploads with `--branch main`. |
| Blank page or Supabase errors | Check the two `VITE_*` repository secrets and rebuild; do not use PR placeholder values for production. |
| Supabase data does not load | Verify project availability, project URL/public key, browser Network requests, and RLS; changing hosts does not repair backend policies. |
| A direct poll link returns a hosting 404 | Confirm `dist/index.html` exists, no top-level `404.html` is added, and you opened the correct deployment URL. |

## References

- [Cloudflare: Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
- [Cloudflare: Direct Upload with GitHub Actions](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
- [Cloudflare: SPA route fallback](https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering)
