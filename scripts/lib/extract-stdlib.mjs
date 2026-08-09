import fs from 'node:fs';
import path from 'node:path';
import { BEANS_REPO, walk } from './paths.mjs';

// Extract the PUBLIC surface of every compiler-shipped Beans-source standard
// library package straight from source (stdlib/std/**/*.b). "Public" means the
// declaration literally carries `pub` — the only visibility modifier in Beans.
//
// Returns: [{ importPath, file, functions:[], types:[{kind,name,methods,statics,fields,variants}] }]

const TYPE_KINDS = ['class', 'interface', 'enum', 'struct'];

// A declaration line, ignoring `pub`, `unique`, and `extern "C"` prefixes.
function classify(line) {
  const trimmed = line.trim();
  const isPub = /^pub\b/.test(trimmed);
  // strip leading modifiers
  let rest = trimmed
    .replace(/^pub\s+/, '')
    .replace(/^unique\s+/, '')
    .replace(/^extern\s+"C"\s+/, '')
    .replace(/^packed\s+/, '')
    .replace(/^opaque\s+/, '');
  // Match `fn name`, `static fn name`, `async fn name`. The name may be
  // followed by a generic clause `<...>` before the `(`, so match on a word
  // boundary rather than requiring an immediate paren.
  const staticFn = rest.match(/^static\s+fn\s+([a-z_][A-Za-z0-9_]*)\b/);
  if (staticFn) return { isPub, kind: 'static', name: staticFn[1] };
  const fn = rest.match(/^fn\s+([a-z_][A-Za-z0-9_]*)\b/);
  if (fn) return { isPub, kind: 'fn', name: fn[1] };
  const asyncFn = rest.match(/^async\s+fn\s+([a-z_][A-Za-z0-9_]*)\b/);
  if (asyncFn) return { isPub, kind: 'fn', name: asyncFn[1] };
  for (const k of TYPE_KINDS) {
    const m = rest.match(new RegExp(`^${k}\\s+([A-Z][A-Za-z0-9_]*)`));
    if (m) return { isPub, kind: 'type', typeKind: k, name: m[1] };
  }
  // a field: `pub name: Type`
  const field = rest.match(/^([a-z_][A-Za-z0-9_]*)\s*:/);
  if (field) return { isPub, kind: 'field', name: field[1] };
  return null;
}

// import path from a stdlib/std/<...>/<file>.b path
function importPathFor(file) {
  const rel = path.relative(path.join(BEANS_REPO, 'stdlib', 'std'), file);
  const dir = path.dirname(rel); // e.g. encoding/json
  return 'std.' + dir.split(path.sep).join('.');
}

export function extractStdlib() {
  if (!BEANS_REPO) throw new Error('Beans repo not found (set BEANS_REPO).');
  const root = path.join(BEANS_REPO, 'stdlib', 'std');
  const files = walk(root, (f) => f.endsWith('.b'));
  const packages = new Map();

  for (const file of files) {
    // The async runtime package cannot be imported from user source (its
    // directory name contains `$`); it is compiler-internal, so exclude it.
    if (file.includes('async$rt')) continue;
    const importPath = importPathFor(file);
    if (!packages.has(importPath)) {
      packages.set(importPath, {
        importPath,
        file: path.relative(BEANS_REPO, file),
        functions: [],
        types: [],
      });
    }
    const pkg = packages.get(importPath);

    const src = fs.readFileSync(file, 'utf8');
    const lines = src.split('\n');
    let depth = 0;
    let inEnumBody = null; // type object while inside an enum body
    let currentType = null; // type object while inside any type body at depth 1
    let typeDepth = 0;

    for (const raw of lines) {
      const line = raw.replace(/\/\/.*$/, '');
      const info = classify(line);

      if (info && info.kind === 'type') {
        const t = {
          kind: info.typeKind,
          name: info.name,
          isPub: info.isPub,
          methods: [],
          statics: [],
          fields: [],
          variants: [],
        };
        if (info.isPub) pkg.types.push(t);
        currentType = info.isPub ? t : null;
        typeDepth = depth; // opening brace will push depth to typeDepth+1
        inEnumBody = info.typeKind === 'enum' && info.isPub ? t : null;
      } else if (info && depth === 0 && info.kind === 'fn' && info.isPub) {
        pkg.functions.push(info.name);
      } else if (currentType && depth === typeDepth + 1) {
        if (info && info.kind === 'fn' && info.isPub) currentType.methods.push(info.name);
        else if (info && info.kind === 'static' && info.isPub) currentType.statics.push(info.name);
        else if (info && info.kind === 'field' && info.isPub) currentType.fields.push(info.name);
        else if (inEnumBody && currentType.kind === 'enum') {
          // enum variant: an identifier line, optionally with a payload, not a fn
          const v = line.trim().match(/^([a-z_][A-Za-z0-9_]*)\s*(\(|$)/);
          if (v && !/^(pub|fn|static|return|match|if|for|let|var)\b/.test(line.trim())) {
            currentType.variants.push(v[1]);
          }
        }
      }

      // update brace depth after processing the line
      for (const ch of line) {
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (currentType && depth <= typeDepth) {
            currentType = null;
            inEnumBody = null;
          }
        }
      }
    }
  }

  return [...packages.values()].sort((a, b) => a.importPath.localeCompare(b.importPath));
}
