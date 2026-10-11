# Temporary dependency security patches

The upstream braces and sprintf-js advisories have no published patched releases as of October 12, 2026. Keep the existing compatible Eleventy and Decap versions rather than accepting npm's suggested Nunjucks downgrade.

`npm run patch:security` applies local fixes to exact, SHA-256-verified upstream sources. It bounds braces parser nesting and all three recursive AST walkers to 128 levels, and clamps sprintf numeric precision to the native supported range (0–100, or 1–100 for significant digits). Ordinary glob patterns and numeric formatting remain unchanged. Regression tests exercise malicious nesting, externally supplied ASTs, and excessive precision.

`npm run audit:security` verifies the patched file contents and runs the full npm audit. Only GHSA-vfj7-8cjw-p6xm and GHSA-hp3w-g68c-fv3c, and dependency-chain reports caused exclusively by those advisories, are accepted after patch verification. Every other moderate, high, or critical finding still fails. Missing patches, changed upstream source, unknown audit errors, and network failures also fail. Raw `npm audit` still reports the upstream package versions because it does not inspect locally patched source.

The workflow installs with `--ignore-scripts`, then explicitly invokes the patch/check step. CMS builds also invoke the patches before compilation. These patches must be reviewed or removed when upstream dependencies change; do not expand the advisory exceptions to make a new finding pass.

- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/advisories/GHSA-hp3w-g68c-fv3c
