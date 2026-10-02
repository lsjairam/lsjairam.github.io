# Activate the Notes editor

The website already uses GitHub Pages, publishing `main` from the repository
root, with the custom domain `engrllamas.com` and HTTPS enabled. The new workflow
builds with Eleventy and deploys only the generated `_site/` folder.

No domain transfer, Porkbun change, Netlify account, Decap Turbo subscription, or
server at home is needed.

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

Record the exact HTTPS URL printed by the deployment, for example:

```text
https://engrllamas-notes-auth.YOUR-SUBDOMAIN.workers.dev
```

This is an example, not a preconfigured working service.

## 3. Register your GitHub OAuth application

Open [GitHub → Settings → Developer settings → OAuth Apps → New OAuth App](https://github.com/settings/applications/new).

Use these values:

- **Application name:** Engrllamas Notes
- **Homepage URL:** https://engrllamas.com
- **Authorization callback URL:** your exact Worker URL followed by `/callback`,
  for example `https://engrllamas-notes-auth.YOUR-SUBDOMAIN.workers.dev/callback`.

Register the application and generate its client secret yourself. In the `auth`
folder, run:

```sh
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

Enter each value at the corresponding prompt. Do not paste either value into
`admin/config.yml`, GitHub comments, or this public repository. Cloudflare stores
them as Worker secrets.

The settings in `auth/wrangler.toml` restrict successful sign-in to GitHub user
`lsjairam`, with write access to `lsjairam/lsjairam.github.io`, and send the result
only to `https://engrllamas.com`.

## 4. Connect Decap to the deployed service

In `admin/config.yml`, replace:

```yaml
base_url: https://notes-auth.example.invalid
```

with your exact Worker origin, with **no trailing slash**. Keep:

```yaml
auth_endpoint: auth
```

Commit that change to `main` and wait for deployment. This URL is public and
contains no secret.

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

- **Login opens an invalid address:** replace the placeholder `base_url` and deploy.
- **GitHub callback mismatch:** the registered callback must match the Worker's
  HTTPS origin plus `/callback` exactly.
- **OAuth service has not been configured:** add both Worker secrets.
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

The root lockfile pins the site build. The CMS is versioned at 3.16.3 and served
from the generated site's `/admin/`, including lazy-loaded scripts and WebAssembly.
Update dependencies deliberately, run `npm run check`, and preview before merging.
For the Worker, retain secrets in Cloudflare and deploy code updates from `auth/`.

- [Decap GitHub backend](https://decapcms.org/docs/github-backend/)
- [Decap editorial workflow](https://decapcms.org/docs/editorial-workflows/)
- [GitHub OAuth scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)

