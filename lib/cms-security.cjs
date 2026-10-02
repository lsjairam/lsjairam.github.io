// Verify compiled modules, not just package.json overrides.
function assertCmsModules(packages) {
  const forbidden = /^(?:@platejs\/|platejs$|decap-cms$|decap-cms-app$|decap-cms-widget-richtext$|decap-cms-backend-test$)/;
  for (const item of packages) {
    if (forbidden.test(item.name)) throw new Error(`Unsafe/unneeded CMS module: ${item.name}`);
    if (item.name.startsWith("decap-cms-") && item.files.some(file => /\/dist\/[^/]+\.js$/.test(file))) {
      throw new Error(`Prebuilt CMS distribution is not allowed: ${item.name}`);
    }
  }
  for (const [name, version] of [["trim", "0.0.3"], ["uuid", "11.1.1"]]) {
    const matches = packages.filter(item => item.name === name);
    if ((name === "trim" && !matches.length) || matches.some(item => item.version !== version)) {
      throw new Error(`Compiled CMS must use patched ${name}@${version}`);
    }
  }
}
module.exports = { assertCmsModules };
