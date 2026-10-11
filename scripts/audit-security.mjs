import { spawnSync } from 'node:child_process';
import { verifyPatches } from '../lib/dependency-patches.mjs';

await verifyPatches();
const result = spawnSync('npm', ['audit', '--json', '--audit-level=moderate'], { encoding: 'utf8' });
if (result.error) throw result.error;
const report = JSON.parse(result.stdout);
if (report.error || !report.vulnerabilities || ![0, 1].includes(result.status)) {
  throw new Error('Security audit did not complete: ' + (result.stderr || JSON.stringify(report.error)));
}
const patched = new Map([
  ['braces', 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm'],
  ['sprintf-js', 'https://github.com/advisories/GHSA-hp3w-g68c-fv3c'],
]);
function locallyFixed(name, parents = new Set()) {
  if (parents.has(name)) return false;
  const entry = report.vulnerabilities[name];
  if (!entry || !entry.via.length) return false;
  // A newly nested copy is not covered by the reviewed root-package patches.
  if (patched.has(name) && entry.nodes.some(path => path !== 'node_modules/' + name)) return false;
  const next = new Set([...parents, name]);
  return entry.via.every(via => typeof via === 'string'
    ? locallyFixed(via, next)
    : patched.get(name) === via.url);
}
const blocked = Object.entries(report.vulnerabilities).filter(([name, entry]) =>
  ['moderate', 'high', 'critical'].includes(entry.severity) && !locallyFixed(name));
if (blocked.length) {
  console.error('Unpatched dependency vulnerabilities:', JSON.stringify(Object.fromEntries(blocked), null, 2));
  process.exitCode = 1;
} else {
  console.log('Security check passed. The two upstream advisories are covered by verified local source patches; all other moderate/high/critical findings remain blocking.');
}
