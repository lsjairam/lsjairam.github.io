# Engrllamas portfolio and Notes

The original HTML/CSS portfolio is retained. Eleventy generates the Notes index at
`/blog/` and one page at `/blog/<filename>/` for each published Markdown note.
Decap CMS provides the editor at `/admin/`.

## First-time setup

Follow [CMS setup](docs/CMS-SETUP.md) to enable GitHub Actions deployment and finish
testing the self-hosted GitHub login service. The editor points to the owner's
Cloudflare Worker; credentials remain outside this public repository. The site
changes are still in the draft implementation branch, pending approval to go live.

**Activation still needs approval.** The owner-approved patched source build
replaces Decap's affected prebuilt bundle. The clean installation and full
dependency audit report zero known vulnerabilities on 2 October 2026. See the
[security assessment](docs/CMS-SETUP.md#security-hold). The deployment workflow
keeps the full audit and compiled-module checks; a failure stops deployment.
This does not guarantee the absence of security issues.

## Write and publish

1. Visit https://engrllamas.com/admin/ and log in with GitHub.
2. Open **Notes** and choose **New Note**, or continue one of the existing drafts.
3. Add title, date, category, summary, article text, and optional images.
4. **Save** keeps your work in Decap's editorial workflow. Review it in the preview.
5. When ready, choose **Published** in **Site visibility**, save, move the workflow
   item to **Ready**, and use **Publish**.
6. GitHub builds the site. After a successful deployment the article appears at
   `/blog/<filename>/` and is added to `/blog/`.

The four existing ideas are draft outlines, not finished articles. Drafts do not
generate pages. The original public editorial plan remains until the first note
is published.

## Local development

Requires Node.js 22 or newer.

```sh
npm ci --ignore-scripts
npm run dev
```

Open http://localhost:8080/ (or the address printed by Eleventy).

```sh
npm run check
npm run audit:security
```

This builds the CMS from pinned individual modules, runs content/authentication
and browser-bundle tests, and creates the production site in
`_site/`. Publish only `_site/`, never the repository root. The build serves
the locally compiled Decap bundle and its lazy-loaded assets from your own site.

Local `/admin/` normally connects to the live GitHub backend. It is not an offline
draft editor. Production OAuth deliberately accepts only https://engrllamas.com.
For local writing, edit Markdown files and use the local site preview.

To test the CMS controls without GitHub access, run `npm run check`, then
`npm run preview:cms-test`, and open http://127.0.0.1:8085/admin-test/.
This separate localhost-only harness uses in-memory sample content and uploads.
Saves disappear on reload and do not change files or GitHub. It is excluded from
the production site; never substitute its test backend into `/admin/`.

## Where things live

- Existing portfolio: root HTML files, `css/`, `js/`, `assets/`, and `Samples/`.
- Notes: `content/notes/*.md`; the filename is the permanent article URL.
- Notes layout: `_includes/note.njk` and shared Notes header/footer/base templates.
- Index: `templates/notes-index.njk`.
- Long-form styles: `css/notes.css`; existing portfolio styles are unchanged.
- CMS: `admin/` (configuration/preview/start), `cms/` (module entry/build config),
  and `scripts/build-cms.mjs` (compiler and module verification).
- Images: `assets/uploads/`.
- GitHub Pages deployment: `.github/workflows/pages.yml`.
- Login service: `auth/`; never copied into the deployed static site.

The old `blog/index.html` remains as a reference/fallback for the former static
site, but Eleventy does not copy it. Edit the generated index's template instead.
The other root HTML files are copied byte for byte, with their navigation label
changed to **Notes**. Their existing URLs remain the same.

## Dates, drafts, and URLs

The visibility field is an extra safeguard: a note with `status: draft` stays off
the website even if its Markdown is merged into `main`. Set `status: published`
before using Decap's final Publish action. A future publication date is also
excluded until that day in Asia/Manila. A daily scheduled build runs shortly after
midnight in Manila; GitHub's schedule may be delayed. Run the workflow manually
if a dated note must appear immediately.

Changing the title does not require changing the filename. Keep the filename
after publication to preserve links. If you deliberately rename a published
file, add an explicit redirect page for the old URL.

This is a **public GitHub repository**. Draft branches and media uploads can be
read on GitHub even though they do not appear on the website. Keep confidential
project information out of drafts and use redacted or purpose-made images.

SEO title/description default to the article title/summary. Optional cover/social
images generate sharing metadata. A sitemap is generated automatically and
excludes drafts, future notes, and the admin interface.

## Maintain the patched editor

The custom build is intentional: the all-in-one Decap 3.16.3 bundle embeds
affected dependencies even if an installation override changes the dependency
tree. This build imports only the GitHub backend and the widgets used here,
excludes Plate/richtext and prebuilt distributions, and verifies the actual
compiled module versions. `trim` is pinned to 0.0.3 and `uuid` to 11.1.1.

Keep the lockfile, overrides, full dependency audit, and module guard together.
Update pinned Decap components deliberately; run a clean install, audit, full
build/tests, and the local editor test before merging. To add a widget, import
and register its individual module in `cms/editor.js`. Do not replace this with
a CDN script or the all-in-one prebuilt package. Reassess the overrides/guard
when upstream fixes are available; do not silence the audit to deploy.

