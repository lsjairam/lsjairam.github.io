import test from "node:test";
import assert from "node:assert/strict";
import worker from "../auth/worker.mjs";
const env = { GITHUB_CLIENT_ID: "test-id", GITHUB_CLIENT_SECRET: "test-secret",
  CMS_ORIGIN: "https://engrllamas.com", GITHUB_REPO: "lsjairam/lsjairam.github.io", ALLOWED_GITHUB_USER: "lsjairam" };
const base = "https://notes-auth.test";
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

