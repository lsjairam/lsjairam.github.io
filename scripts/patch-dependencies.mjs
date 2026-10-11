import { verifyPatches } from '../lib/dependency-patches.mjs';
await verifyPatches({ apply: true });
console.log('Applied and verified bounded brace nesting and numeric precision patches.');
