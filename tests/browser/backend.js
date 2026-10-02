import { TestBackend } from "decap-cms-backend-test";
import { parse } from "yaml";

if (!["localhost", "127.0.0.1"].includes(location.hostname)) {
  throw new Error("The in-memory test backend is localhost-only.");
}
const config = parse(await (await fetch("/admin/config.yml")).text());
// Only in-memory data is changed. No token, GitHub API, or filesystem write.
config.load_config_file = false;
config.backend = { name: "test-repo", login: false };
config.site_url = location.origin;
config.display_url = location.origin;
window.repoFiles = { content: { notes: { "local-sample.md": { content:
  '---\ntitle: Local sample note\ndate: 2020-01-02\ncategory: Document Control\nsummary: Local editor test only.\nstatus: draft\n---\n\n## Sample heading\n\nA **Markdown** note.\n',
} } } };
// The test backend lists by the complete collection folder key but writes via
// nested paths. Keep both views pointed at the same in-memory folder.
window.repoFiles["content/notes"] = window.repoFiles.content.notes;
// Use the production bundle's React helpers rather than a second React renderer.
class LocalBackend extends TestBackend {
  authComponent() {
    return window.createClass({ render() {
      return window.h("section", {},
        window.h("h1", {}, "Local test only — no GitHub access"),
        window.h("p", {}, "Saves stay in memory and disappear on reload."),
        window.h("button", { onClick: () => this.props.onLogin({}) }, "Enter local editor"));
    } });
  }
}
window.CMS.registerBackend("test-repo", LocalBackend);
window.CMS.init({ config });
