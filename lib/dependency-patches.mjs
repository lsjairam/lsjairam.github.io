import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Exact upstream source hashes: unknown versions fail closed for review.
export const patches = [
  {
    path: 'braces/lib/parse.js',
    sha: 'e572166565f15fa6ad9865ae49d678218e32aabfd1b3720f6d0d43d39800d310',
    edits: [
      ["    if (value === CHAR_LEFT_PARENTHESES) {", "    if (value === CHAR_LEFT_PARENTHESES) {\n      if (stack.length >= 128) throw new SyntaxError('Brace nesting exceeds safe depth');"],
      ["    if (value === CHAR_LEFT_CURLY_BRACE) {", "    if (value === CHAR_LEFT_CURLY_BRACE) {\n      if (stack.length >= 128) throw new SyntaxError('Brace nesting exceeds safe depth');"],
    ],
  },
  {
    path: 'braces/lib/compile.js',
    sha: 'dc98f22eee3d511785d92a00758d5f0d48efed5f5813bdecc2de430c529b5c9f',
    edits: [
      ['const walk = (node, parent = {}) => {', "const walk = (node, parent = {}, depth = 0) => {\n    if (depth >= 128) throw new SyntaxError('Brace nesting exceeds safe depth');"],
      ['walk(child, node)', 'walk(child, node, depth + 1)'],
    ],
  },
  {
    path: 'braces/lib/expand.js',
    sha: '41ccc196ebfa7b7781a634e721eb744e4e7bcb54cba427a7e3d6806a1b9e58f7',
    edits: [
      ['const walk = (node, parent = {}) => {', "const walk = (node, parent = {}, depth = 0) => {\n    if (depth >= 128) throw new SyntaxError('Brace nesting exceeds safe depth');"],
      ['walk(child, node)', 'walk(child, node, depth + 1)'],
    ],
  },
  {
    path: 'braces/lib/stringify.js',
    sha: '379f22d77bfa1478341ccd49c5e4267464aabcbba03558bab332aac23fc6f23a',
    edits: [
      ['const stringify = (node, parent = {}) => {', "const stringify = (node, parent = {}, depth = 0) => {\n    if (depth >= 128) throw new SyntaxError('Brace nesting exceeds safe depth');"],
      ['stringify(child)', 'stringify(child, node, depth + 1)'],
    ],
  },
  {
    path: 'sprintf-js/src/sprintf.js',
    sha: '9904b0d448280bfdfcb0329bdac995883033597727404f9c058d051d9174b7c7',
    edits: [
      ['match = parse_tree[i] // convenience purposes only', `match = parse_tree[i] // convenience purposes only
                // Bound numeric precision before native formatting calls.
                if (match[7] && /^[efg]$/.test(match[8])) {
                    match = match.slice()
                    match[7] = Math.min(100, Math.max(match[8] === 'g' ? 1 : 0, Number(match[7])))
                }`],
    ],
  },
];

const hash = (text) => createHash('sha256').update(text).digest('hex');
function patchedSource(patch, source) {
  if (hash(source) !== patch.sha) throw new Error('Unexpected upstream source: ' + patch.path);
  for (const [before, after] of patch.edits) {
    if (source.split(before).length !== 2) throw new Error('Patch target is not unique: ' + patch.path);
    source = source.replace(before, after);
  }
  return source;
}

export async function verifyPatches({ apply = false } = {}) {
  for (const patch of patches) {
    const path = resolve('node_modules', patch.path);
    const source = await readFile(path, 'utf8');
    let original = source;
    if (hash(source) !== patch.sha) {
      for (const [before, after] of [...patch.edits].reverse()) original = original.replace(after, before);
    }
    const expected = patchedSource(patch, original);
    if (source === expected) continue;
    if (!apply || hash(source) !== patch.sha) throw new Error('Missing or modified security patch: ' + patch.path);
    await writeFile(path, expected);
  }
}
