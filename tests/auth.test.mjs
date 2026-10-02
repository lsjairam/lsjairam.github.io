import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import worker from "../auth/worker.mjs";
const env = { GITHUB_CLIENT_ID: "test-id", GITHUB_CLIENT_SECRET: "test-secret",
  CMS_ORIGIN: "https://engrllamas.com", GITHUB_REPO: "lsjairam/lsjairam.github.io", ALLOWED_GITHUB_USER: "lsjairam" };
const base = "https://notes-auth.test";
test("CMS targets the owner's HTTPS service and deployment keeps callback request logging off", async () => {
  const config = parse(await readFile(new URL("../admin/config.yml", import.meta.url), "utf8"));
  assert.equal(config.backend.base_url, "https://engrllamas-notes-auth.lsjairam.workers.dev");
  assert.equal(new URL(config.backend.base_url).origin, config.backend.base_url);
  assert.equal(config.backend.auth_endpoint, "auth");
  assert.equal(config.backend.repo, env.GITHUB_REPO);
  assert.equal(config.backend.branch, "main");
  assert.equal(config.site_url, env.CMS_ORIGIN);
  assert.equal(config.publish_mode, "editorial_workflow");
  assert.ok(!Object.hasOwn(config.backend, "client_secret"));
  assert.ok(!Object.hasOwn(config.backend, "token"));
  const deployment = await readFile(new URL("../auth/wrangler.toml", import.meta.url), "utf8");
  const variables = deployment.match(/\[vars\]([\s\S]*?)(?:\n\[|$)/)?.[1];
  for (const key of ["CMS_ORIGIN", "GITHUB_REPO", "ALLOWED_GITHUB_USER"]) {
    assert.ok(variables.includes(`${key} = "${env[key]}"`));
  }
  const logs = deployment.match(/\[observability\.logs\]([\s\S]*?)(?:\n\[|$)/)?.[1];
  assert.match(logs, /^enabled\s*=\s*true\s*$/m);
  assert.match(logs, /^invocation_logs\s*=\s*false\s*$/m);
  assert.ok(!/^\s*GITHUB_CLIENT_SECRET\s*=/m.test(deployment));
  const workflow = parse(await readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8"));
  const steps = workflow.jobs.build.steps;
  const auditIndex = steps.findIndex(step => step.run === "npm audit --audit-level=moderate");
  const uploadIndex = steps.findIndex(step => step.uses?.startsWith("actions/upload-pages-artifact@"));
  assert.ok(auditIndex >= 0 && uploadIndex > auditIndex);
  assert.ok(!steps[auditIndex]["continue-on-error"]);
  assert.ok(!steps[auditIndex].if);
  assert.equal(workflow.jobs.deploy.needs, "build");
});
test("OAuth redirect is fixed, minimal in scope, and protected by a secure cookie", async () => {
  const response = await worker.fetch(new Request(base + "/auth?provider=github&scope=repo"), env);
  assert.equal(response.status, 302);
  const url = new URL(response.headers.get("Location"));
  assert.equal(url.origin, "https://github.com");
  assert.equal(url.searchParams.get("redirect_uri"), base + "/callback");
  assert.equal(url.searchParams.get("scope"), "public_repo");
  const cookie = response.headers.get("Set-Cookie");
  assert.ok(cookie.includes(url.searchParams.get("state")));
  for (const part of ["HttpOnly", "Secure", "SameSite=Lax", "Max-Age=600"]) assert.ok(cookie.includes(part));
});
test("rejects wrong origins, missing configuration, and callback CSRF before contacting GitHub", async () => {
  assert.equal((await worker.fetch(new Request(base + "/auth?origin=https://evil.test"), env)).status, 403);
  assert.equal((await worker.fetch(new Request(base + "/auth"), {})).status, 503);
  assert.equal((await worker.fetch(new Request(base + "/callback?state=fake&code=fake"), env)).status, 403);
  assert.equal((await worker.fetch(new Request(base + "/auth?provider=gitlab"), env)).status, 400);
  assert.equal((await worker.fetch(new Request(base + "/auth", { method: "POST" }), env)).status, 405);
  assert.equal((await worker.fetch(new Request(base + "/auth"), { ...env, CMS_ORIGIN: "http://engrllamas.com" })).status, 503);
});
test("successful callback checks owner and repository write access and restricts postMessage origin", async () => {
  const start = await worker.fetch(new Request(base + "/auth"), env);
  const state = new URL(start.headers.get("Location")).searchParams.get("state");
  const originalFetch = globalThis.fetch;
  let calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (url.endsWith("access_token")) return Response.json({ access_token: "test-token" });
    if (url.endsWith("/user")) return Response.json({ login: "lsjairam" });
    return Response.json({ full_name: env.GITHUB_REPO, private: false, permissions: { push: true } });
  };
  try {
    const response = await worker.fetch(new Request(base + "/callback?state=" + state + "&code=test-code", {
      headers: { Cookie: start.headers.get("Set-Cookie").split(";")[0] },
    }), env);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes('event.origin !== origin'));
    assert.ok(html.includes('event.source !== window.opener'));
    assert.ok(html.includes('https://engrllamas.com'));
    assert.ok(html.includes('authorization:github:success:'));
    assert.ok(!html.includes('postMessage("authorizing:github", "*"'));
    assert.ok(response.headers.get("Content-Security-Policy").includes("default-src 'none'"));
    assert.ok(response.headers.get("Set-Cookie").includes("Max-Age=0"));
    assert.equal(calls.length, 3);
    globalThis.fetch = async (url) => url.endsWith("access_token")
      ? Response.json({ access_token: "test-token" }) : Response.json({ login: "someone-else" });
    assert.equal((await worker.fetch(new Request(base + "/callback?state=" + state + "&code=test-code", {
      headers: { Cookie: start.headers.get("Set-Cookie").split(";")[0] },
    }), env)).status, 403);
  } finally { globalThis.fetch = originalFetch; }
});
test("callback never releases a token for read-only, private, or different repositories", async () => {
  const start = await worker.fetch(new Request(base + "/auth"), env);
  const state = new URL(start.headers.get("Location")).searchParams.get("state");
  const originalFetch = globalThis.fetch;
  try {
    for (const repository of [
      { full_name: env.GITHUB_REPO, private: false, permissions: { push: false } },
      { full_name: env.GITHUB_REPO, private: true, permissions: { push: true } },
      { full_name: "lsjairam/another-repository", private: false, permissions: { push: true } },
    ]) {
      globalThis.fetch = async (url) => url.endsWith("access_token")
        ? Response.json({ access_token: "test-token" })
        : url.endsWith("/user") ? Response.json({ login: "lsjairam" }) : Response.json(repository);
      const response = await worker.fetch(new Request(base + "/callback?state=" + state + "&code=test-code", {
        headers: { Cookie: start.headers.get("Set-Cookie").split(";")[0] },
      }), env);
      assert.equal(response.status, 403);
      assert.ok(!(await response.text()).includes("test-token"));
    }
  } finally { globalThis.fetch = originalFetch; }
});

