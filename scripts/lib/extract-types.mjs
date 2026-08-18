import fs from 'node:fs';
import path from 'node:path';
import { BEANS_REPO, compilerSource } from './paths.mjs';

// The single authority for "is this name a builtin type" is `builtin_type()` in
// compiler/beans/resolve.b (public, self-hosted compiler). We parse the exact
// list of type names from it so the coverage inventory cannot silently miss one
// (this is how RawSlice and Self are kept honest). SIMD families are matched by
// `simd_description(name)` there, not by a literal, so they stay curated.
export function extractBuiltinTypeNames() {
  if (!BEANS_REPO) throw new Error('Beans repo not found (set BEANS_REPO).');
  const src = fs.readFileSync(
    compilerSource('resolve.b'),
    'utf8',
  );
  const start = src.indexOf('fn builtin_type(');
  if (start < 0) throw new Error('builtin_type() not found in resolve.b');
  const end = src.indexOf('\n}', start);
  const body = src.slice(start, end);
  const names = [...body.matchAll(/name\s*==\s*"([A-Za-z_][A-Za-z0-9_]*)"/g)].map((m) => m[1]);
  return [...new Set(names)];
}
