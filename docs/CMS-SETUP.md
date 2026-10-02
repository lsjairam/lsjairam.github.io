# Activate the Notes editor

The website already uses GitHub Pages, publishing `main` from the repository
root, with the custom domain `engrllamas.com` and HTTPS enabled. The new workflow
builds with Eleventy and deploys only the generated `_site/` folder.

No domain transfer, Porkbun change, Netlify account, Decap Turbo subscription, or
server at home is needed.

## Current setup — 2 October 2026

- The owner deployed `https://engrllamas-notes-auth.lsjairam.workers.dev` in their
  Cloudflare account. The Worker code, account/repository restrictions, and public
  Client ID are configured; the owner entered the Client Secret directly into
  Cloudflare, where it is encrypted. No real secret is included in this repository.
- The [Engrllamas Notes OAuth app](https://github.com/settings/applications/3898468)
  is registered with the exact callback URL below. User access token expiration
  was kept enabled during registration.
- Invocation logs are disabled and general logging remains enabled. This was
  saved and verified after reloading the Cloudflare dashboard. Traces remain off.
- The public service's root response and its redirect to GitHub's authorization
  endpoint have been verified. This does **not** verify the owner's Client Secret,
  token exchange, popup handshake, or a full CMS sign-in.
- `admin/config.yml` now targets that exact service in the implementation branch.
  The draft review has not been merged and the live website is unchanged.
- Remaining: review and approve activation after the patched branch passes checks, enable the generated GitHub Pages
  deployment, merge, authorize GitHub access, and test a real publication.

### Security hold

The original full `npm audit` on 2 October 2026
reported 30 affected packages (23 moderate, 7 high), tracing to three underlying
advisories, not 30 independent vulnerabilities. Functional tests and a successful
build do not establish that the editor is safe to deploy.

- [Plate HTML deserialization](https://github.com/udecode/plate/security/advisories/GHSA-qrfj-mgw8-j9c6):
  untrusted HTML can trigger browser behavior during parsing. The installed
  `@platejs/core` is 49.2.21; the fixed stable version is 53.3.11 or later.
- [trim denial of service](https://github.com/advisories/GHSA-w5p7-h5w8-2hfq):
  the installed `trim` is 0.0.1; the fix is 0.0.3.
- [uuid bounds check](https://github.com/advisories/GHSA-w5hq-g745-h8pq):
  dependency audit also flags older uuid versions. Reachability through this CMS
  configuration has not been established.

The published Decap 3.16.3 source map confirms that Plate 49.2.21 and trim 0.0.1
are embedded in the browser bundle copied into `/admin/`. Decap 3.16.3 is still the
official npm stable release at this check. A package override alone would **not**
repair that prebuilt browser bundle. Do not use `npm audit fix --force` as a
substitute for examining the resulting editor.

#### Owner-approved remediation

The owner approved maintaining a patched source build. The implementation now
compiles pinned individual Decap ESM modules instead of copying the prebuilt
distribution. It uses core 3.19.1, GitHub backend 3.8.3, and Markdown widget
3.13.1, with the other required fields pinned in `package.json`/the lockfile.
The unused Plate/richtext editor is not installed or shipped. Overrides select
`trim` 0.0.3 and `uuid` 11.1.1. The production compilation currently does not
include uuid; the guard also rejects an older version if later included.

`scripts/build-cms.mjs` inspects the actual compilation's module resources and
versions, rejects Plate, prebuilt Decap distributions, and the test backend,
and hashes the emitted assets. Tests verify those hashes and that the published
assets are identical; private source maps, manifests, and the test harness
are excluded from `_site/`. This checks the browser build, not only installation
metadata. Markdown preview sanitization is explicitly enabled; public articles
do not execute authored raw HTML or template expressions.

A clean `npm ci --ignore-scripts` and the full dependency audit report **zero
known vulnerabilities** on 2 October 2026. Twelve automated tests pass with the
site build. Local browser checks cover Markdown/rich-text conversion, custom
preview, SEO fields, cover upload/alternative text/caption, draft saves, and
Draft → In review → Ready → Publish. Script/event-handler test content was removed from
the preview without execution. After a browser timeout, a fresh in-memory
test completed the final Publish action and showed "Entry published".
Real GitHub OAuth, publishing,
and deployment still require end-to-end verification after approved activation.

The GitHub workflow retains the full `npm audit --audit-level=moderate`, including
development dependencies because their code ships in the CMS. It runs before
the build and deployment artifact. A failed audit or module check stops the
build; no warning is ignored. Zero audit findings are not a security guarantee.

The image and Markdown widgets wrap `getAsset` for this site's
`/assets/uploads/` paths: the editor resolves repository assets (including
unsaved in-memory blobs) instead of prematurely requesting their public URL.
The saved root-relative URL is unchanged. `lib/cms-assets.cjs` and its test must
stay in sync with the upload folder in `admin/config.yml`; external URLs are
left untouched. This uses Decap's extension interface, not modified vendor files.

The live site and Pages settings remain unchanged. Do not merge, change Pages
source, or authorize real CMS GitHub access without the owner's next approval.

The instructions below are retained for maintenance or recreating the setup.
Do not create a duplicate Worker or OAuth app if the existing ones are available.

## 1. Enable the generated-site deployment

After the implementation branch has passed its checks and is ready to merge:

1. Open [repository Settings → Pages](https://github.com/lsjairam/lsjairam.github.io/settings/pages).
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Keep **Custom domain: engrllamas.com** and **Enforce HTTPS** as they are.
4. Merge the implementation branch into `main`.
5. In **Actions**, wait for **Build and deploy portfolio** to finish. If needed,
   open that workflow and select **Run workflow** on `main`.

Changing the source does not require unpublishing the existing site. Leave the
current site published while the new deployment builds.

The workflow runs on changes to `main`, checks pull requests without deploying
them, and supports manual and daily runs. Decap's Publish action merges a content
pull request into `main`, which triggers that same deployment.

## 2. Host the login bridge under your own Cloudflare account

Decap is a static browser editor. GitHub's authorization code exchange needs a
server that can keep an OAuth client secret outside the public site. The included
Cloudflare Worker performs that exchange; it does not host or rebuild the portfolio.

Cloudflare Workers has a free tier. Occasional personal CMS logins should fit
within it, but check your account's current limits and keep it on the Free plan.
You control the Worker, its secrets, and its deletion. This is what
**self-hosted** means here.

In the local website folder:

```sh
cd auth
npm install
npx wrangler login
npx wrangler deploy
```

Wrangler will open Cloudflare's sign-in/authorization flow. Complete it yourself.
The first deployment can run without secrets; `/auth` returns a configuration
message until they are added.

The deployed HTTPS origin is:

```text
https://engrllamas-notes-auth.lsjairam.workers.dev
```

If you intentionally recreate the Worker at a different address, update both the
GitHub callback and the CMS `base_url` to match it.

### Keep callback URLs out of request logs

GitHub redirects to `/callback` with a temporary authorization code in the URL.
Cloudflare invocation logs can include request URLs. For this Worker, keep
**Settings → Observability → Include Invocation logs** unchecked, leave general
**Logs** enabled, and keep **Traces** disabled. Deploy changes and verify they
remain saved after reloading. No destination for exporting telemetry is configured.

`auth/wrangler.toml` records those settings so later code deployments do not
silently restore automatic invocation logging. The Worker itself does not log
tokens, secrets, authorization codes, or GitHub responses. Avoid live tail sessions
or browser screenshots that expose login callback URLs or newly generated secrets.

## 3. Register your GitHub OAuth application

Open [GitHub → Settings → Developer settings → OAuth Apps → New OAuth App](https://github.com/settings/applications/new).

Use these values:

- **Application name:** Engrllamas Notes
- **Homepage URL:** https://engrllamas.com
- **Redirect URI:** `https://engrllamas-notes-auth.lsjairam.workers.dev/callback`.
- Leave **Allow wildcard matching** and **Enable Device Flow** unchecked.
- Keep **Expire user access tokens** enabled.

Register the application and generate its client secret yourself. In the `auth`
folder, run:

```sh
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

Enter each value at the corresponding prompt. The Client ID is public; it can
also be stored as a plain Worker variable. The Client Secret must remain a Worker
secret, never a plain variable. Do not put the Client Secret in `admin/config.yml`,
GitHub comments, chat, screenshots, or this public repository.

For dashboard setup, use **Worker Settings → Runtime variables and secrets →
Add variable**, with key `GITHUB_CLIENT_SECRET`, the copied secret as the value,
and **Secret** checked. Enter and save the credential yourself. Add the public
identifier separately as `GITHUB_CLIENT_ID`. Do not assume generating a secret
copies it to the clipboard. Copy it immediately while its full value is visible.

The bridge does not persist refresh tokens or implement automatic token refresh.
When an expiring GitHub session stops working, save any writing, log out, and
sign in again. Do not disable expiration to avoid signing in again. Once login
works, review unused secrets with the owner before removing any old credentials.

The settings in `auth/wrangler.toml` restrict successful sign-in to GitHub user
`lsjairam`, with write access to `lsjairam/lsjairam.github.io`, and send the result
only to `https://engrllamas.com`.

## 4. Connect Decap to the deployed service

`admin/config.yml` is now configured with:

```yaml
base_url: https://engrllamas-notes-auth.lsjairam.workers.dev
```

Keep the exact HTTPS Worker origin, with **no trailing slash**, and keep:

```yaml
auth_endpoint: auth
```

The URL is public and contains no secret. Review the implementation branch and
approve the production switch before merging it to `main`. The CMS uses `main`
for content, not the implementation branch; changing this configuration in a
draft review does not publish the editor or website.

Then open https://engrllamas.com/admin/ and choose **Login with GitHub**. GitHub
will ask you to authorize your OAuth application. The service requests
`public_repo`, not `repo`: GitHub's OAuth permission covers your public
repositories, not just this one. The service restricts who can sign in, but cannot
narrow GitHub's token to a single repository. Review that scope when authorizing.

The CMS keeps its GitHub session in the browser. Use your own browser profile and
log out when finished on a shared computer. You can revoke the application later
under GitHub Settings → Applications → Authorized OAuth Apps.

## 5. Verify your first publication

1. Create a short, real Note and add an image through the media library.
2. Supply alternative text if you add a cover image.
3. Save it in the editorial workflow. It should not appear at `/blog/` yet.
4. Set **Site visibility → Published**, save, then move it to **Ready** and **Publish**.
5. Wait for **Build and deploy portfolio** to succeed.
6. Open the article's `/blog/<filename>/` URL and the Notes index.
7. Confirm the image, date, summary, body, and title.

The built-in editor preview works before publication, but no public draft
deployment is configured. The **View live** link works after a successful
production deployment.

To unpublish a note, change its visibility to **Draft**, then publish that edit
through the workflow. The next build removes the article page and index entry.
Decap's editorial workflow should also be used when updating existing articles.

## If something does not work

- **Login opens the wrong address:** verify the exact HTTPS `base_url` and deploy.
- **GitHub callback mismatch:** the registered callback must match the Worker's
  HTTPS origin plus `/callback` exactly.
- **OAuth service has not been configured:** check that `GITHUB_CLIENT_ID` is
  present and `GITHUB_CLIENT_SECRET` is saved as an encrypted Worker secret.
- **Session stops working later:** save your writing, log out, and sign in again;
  expiring tokens are intentional. This setup does not automatically refresh them.
- **Sign-in session expired:** close the popup and try again; the login cookie
  lasts ten minutes. Allow the popup and normal first-party cookies.
- **Restricted to the site owner:** log in as `lsjairam`.
- **An article does not appear:** check its visibility, date, whether you used
  the final workflow Publish action, and the latest GitHub Actions result.
- **Build fails:** open its log. It rejects missing metadata, invalid categories
  or dates, empty published articles, and covers without alternative text.
- **Publish cannot merge:** check repository branch protection and allow squash
  merges. A required review or failed build check may prevent Decap publishing.

Authentication tests simulate GitHub responses. Successful live login and a real
CMS publication must be verified after your Worker and OAuth app are configured.

## Maintenance and references

The root lockfile pins the site build and individual CMS modules. The custom
bundle is built by webpack and served from the generated site's `/admin/`,
including lazy-loaded scripts and WebAssembly. It requires ongoing maintenance.

Before updating dependencies, run `npm ci --ignore-scripts`,
`npm run audit:security`, and `npm run check`. Test controls with
`npm run preview:cms-test` at http://127.0.0.1:8085/admin-test/. This isolated
localhost-only harness has no GitHub access; test saves/uploads stay in memory,
disappear on reload, and are never deployed. The real `/admin/` is not this
offline test editor. Do not add the test backend to the production module entry.

Preserve the overrides and compiled-module guard until deliberately reviewed
alongside upstream fixes. Adding a widget means pinning, importing, and
registering its individual module in `cms/editor.js`, then repeating the audit,
build, tests, and browser checks. Do not swap in the prebuilt bundle or a CDN
script, remove the audit, or force dependency upgrades to make checks pass.
For the Worker, retain secrets in Cloudflare and deploy code updates from `auth/`.

- [Decap GitHub backend](https://decapcms.org/docs/github-backend/)
- [Decap editorial workflow](https://decapcms.org/docs/editorial-workflows/)
- [GitHub OAuth scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare invocation logging](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)

