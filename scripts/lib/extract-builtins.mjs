import fs from 'node:fs';
import path from 'node:path';
import { BEANS_REPO, DATA_DIR } from './paths.mjs';

// The C++ builtin tables live in the private `compiler/bootstrap` submodule,
// which is absent from a plain public checkout. We keep a committed snapshot at
// data/builtin-abi.json so the coverage check still runs without it. When the
// live source is present we parse it (the source of truth); otherwise we fall
// back to the snapshot.
const SNAPSHOT = path.join(DATA_DIR, 'builtin-abi.json');

// Extract the C++ runtime-ABI builtin tables from compiler/bootstrap/builtins.cpp:
// builtin_methods(), builtin_statics(), builtin_constructors(), builtin_fns().
// These are the monomorphic rows the native backend and the bootstrap
// interpreter call directly. The generic/checker-typed builtins (List, Map,
// Atomic, RawPtr, SIMD, size_of, intrinsics, ...) are NOT here — they live in
// the curated inventory (builtin-curated.mjs), typed in compiler/beans.

// Slice out the row lines of one `table = { ... };` block by its function name.
function tableBody(src, fnName) {
  const start = src.indexOf(`${fnName}()`);
  if (start < 0) return '';
  const braceStart = src.indexOf('{', src.indexOf('table', start));
  let depth = 0;
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(braceStart + 1, i);
    }
  }
  return '';
}

// The receiver-kind enum value -> the builtin type name a reader knows.
const RECV = { str: 'string', bytes: 'Bytes', file: 'File', mmap: 'MMap' };

// Parse the live builtins.cpp when the bootstrap submodule is present, and also
// refresh the committed snapshot. Used by scripts/gen-snapshots.mjs.
export function parseBuiltinAbiFromSource() {
  const src = fs.readFileSync(
    path.join(BEANS_REPO, 'compiler', 'bootstrap', 'builtins.cpp'),
    'utf8',
  );
  return parse(src);
}

export function extractBuiltinAbi() {
  const cppPath = BEANS_REPO
    ? path.join(BEANS_REPO, 'compiler', 'bootstrap', 'builtins.cpp')
    : null;
  if (cppPath && fs.existsSync(cppPath)) {
    return parse(fs.readFileSync(cppPath, 'utf8'));
  }
  if (fs.existsSync(SNAPSHOT)) {
    return JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  }
  throw new Error(
    'builtins.cpp not found and no snapshot at data/builtin-abi.json. ' +
      'Run scripts/gen-snapshots.mjs with the bootstrap submodule checked out.',
  );
}

function parse(src) {

  const methods = [];
  for (const m of tableBody(src, 'builtin_methods').matchAll(
    /\{BT::([a-z0-9_]+),\s*"([A-Za-z0-9_]+)"/g,
  )) {
    const recv = RECV[m[1]];
    if (recv) methods.push({ recv, name: m[2] });
  }

  const statics = [];
  for (const m of tableBody(src, 'builtin_statics').matchAll(
    /\{"([A-Za-z0-9_]+)",\s*"([A-Za-z0-9_]+)"/g,
  )) {
    statics.push({ cls: m[1], name: m[2] });
  }

  const fns = [];
  for (const m of tableBody(src, 'builtin_fns').matchAll(
    /\{"(std\.[A-Za-z0-9_.]+)",\s*"([A-Za-z0-9_]+)"/g,
  )) {
    fns.push({ module: m[1], name: m[2] });
  }

  return { methods, statics, fns };
}
