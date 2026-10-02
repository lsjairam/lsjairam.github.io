const COOKIE = "__Host-notes-oauth";
const sharedHeaders = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};
function clearCookie() {
  return COOKIE + "=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax";
}
function failure(message, status = 400) {
  return new Response(message, { status, headers: {
    ...sharedHeaders, "Content-Type": "text/plain; charset=utf-8", "Set-Cookie": clearCookie(),
  } });
}
function cookieState(request) {
  return (request.headers.get("Cookie") || "").split(";").map((part) => part.trim())
    .find((part) => part.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1);
}
function randomHex() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
}
function sameState(left, right) {
  if (!left || !right || left.length !== 64 || right.length !== 64) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}
function complete(token, origin) {
  const nonce = randomHex();
  // HTML-safe serialization; token is sent only to the configured CMS opener.
  const payload = JSON.stringify("authorization:github:success:" + JSON.stringify({ token, provider: "github" }))
    .replace(/</g, "\\u003c");
  const target = JSON.stringify(origin).replace(/</g, "\\u003c");
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Notes sign-in</title>
<p id="status">Finishing sign-in. This window will close automatically.</p>
<script nonce="${nonce}">
(function () {
  var origin = ${target};
  if (!window.opener) { document.getElementById("status").textContent = "Open sign-in from the Notes editor."; return; }
  function receive(event) {
    if (event.origin !== origin || event.source !== window.opener || event.data !== "authorizing:github") return;
    window.removeEventListener("message", receive);
    window.opener.postMessage(${payload}, origin);
    window.close();
  }
  window.addEventListener("message", receive);
  window.opener.postMessage("authorizing:github", origin);
})();
</script></html>`;
  return new Response(html, { headers: {
    ...sharedHeaders, "Content-Type": "text/html; charset=utf-8", "Set-Cookie": clearCookie(),
    "Content-Security-Policy": "default-src 'none'; script-src 'nonce-" + nonce + "'; base-uri 'none'; frame-ancestors 'none'",
  } });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== "GET") return failure("Method not allowed.", 405);
    if (url.pathname === "/") return new Response("Engrllamas Notes authentication", { headers: sharedHeaders });
    if (!["/auth", "/callback"].includes(url.pathname)) return failure("Not found.", 404);
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.CMS_ORIGIN ||
        !env.GITHUB_REPO || !env.ALLOWED_GITHUB_USER) return failure("OAuth service has not been configured.", 503);
    let origin;
    try {
      origin = new URL(env.CMS_ORIGIN);
      if (origin.protocol !== "https:" || origin.origin !== env.CMS_ORIGIN) throw new Error();
    } catch { return failure("Invalid CMS origin configuration.", 503); }
    const callback = url.origin + "/callback";
    if (url.pathname === "/auth") {
      const requestedOrigin = url.searchParams.get("origin");
      if (requestedOrigin && requestedOrigin !== origin.origin) return failure("CMS origin is not allowed.", 403);
      if (url.searchParams.has("provider") && url.searchParams.get("provider") !== "github") {
        return failure("Only GitHub authentication is supported.");
      }
      const state = randomHex();
      const authorize = new URL("https://github.com/login/oauth/authorize");
      authorize.search = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        redirect_uri: callback,
        scope: "public_repo",
        state,
      }).toString();
      return new Response(null, { status: 302, headers: {
        ...sharedHeaders, Location: authorize.href,
        "Set-Cookie": COOKIE + "=" + state + "; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax",
      } });
    }
    if (!sameState(cookieState(request), url.searchParams.get("state"))) {
      return failure("Sign-in session expired or invalid. Close this window and try again.", 403);
    }
    if (url.searchParams.has("error")) return failure("GitHub sign-in was cancelled.", 401);
    const code = url.searchParams.get("code");
    if (!code) return failure("GitHub did not return an authorization code.");
    try {
      const exchange = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET,
          code, redirect_uri: callback,
        }),
      });
      if (!exchange.ok) return failure("GitHub token exchange failed.", 502);
      const result = await exchange.json();
      if (!result.access_token || result.error) return failure("GitHub rejected the sign-in request.", 401);
      const headers = {
        Accept: "application/vnd.github+json", Authorization: "Bearer " + result.access_token,
        "User-Agent": "engrllamas-notes-auth", "X-GitHub-Api-Version": "2022-11-28",
      };
      const userResponse = await fetch("https://api.github.com/user", { headers });
      if (!userResponse.ok) return failure("Could not verify your GitHub account.", 502);
      const user = await userResponse.json();
      if (user.login?.toLowerCase() !== env.ALLOWED_GITHUB_USER.toLowerCase()) {
        return failure("This Notes editor is restricted to the site owner.", 403);
      }
      const repositoryResponse = await fetch("https://api.github.com/repos/" + env.GITHUB_REPO, { headers });
      if (!repositoryResponse.ok) return failure("Could not verify repository access.", 403);
      const repository = await repositoryResponse.json();
      if (!repository.permissions?.push || repository.private ||
          repository.full_name?.toLowerCase() !== env.GITHUB_REPO.toLowerCase()) {
        return failure("Public repository write access is required.", 403);
      }
      return complete(result.access_token, origin.origin);
    } catch {
      // Never log access tokens, secrets, authorization codes, or GitHub responses.
      return failure("Sign-in service could not reach GitHub. Please try again.", 502);
    }
  },
};

