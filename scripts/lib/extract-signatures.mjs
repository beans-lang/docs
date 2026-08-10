import fs from 'node:fs';
import path from 'node:path';
import { BEANS_REPO, walk } from './paths.mjs';

// Extract the PUBLIC surface of every compiler-shipped Beans-source standard
// library package straight from source (stdlib/std/**/*.b), WITH the full
// normalized signature of every function, method, static, constructor and field.
//
// "Public" means the declaration literally carries `pub` — the only visibility
// modifier in Beans. Signatures are read exactly as written in source (so
// `Result<T>` shows with its implicit Error elided, matching what a caller
// types), across multiple lines when a declaration wraps.
//
// Returns: [{ importPath, file, functions:[Sig], types:[Type] }]
//   Sig  = { name, kind: 'fn'|'static'|'async', signature }
//   Type = { kind:'class'|'struct'|'enum'|'interface', name, unique,
//            constructor: Sig|null, methods:[Sig], statics:[Sig],
//            fields:[{name,type,signature}], variants:[{name,signature}] }

const TYPE_KINDS = ['class', 'interface', 'enum', 'struct'];

// Collapse a wrapped declaration to a single normalized line: one space between
// tokens, no trailing block brace, no trailing whitespace.
function normalizeSig(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s*\{\s*$/, '')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s*$/, '')
    .trim();
}

// Given the source lines and the index of a declaration's opening line, return
// the full signature text from the first keyword up to (and including) the
// return type, joining continuation lines. The declaration header ends at the
// `{` that opens the body (for fns/types) or the end of line (for a field).
function readHeader(lines, start) {
  let buf = '';
  let parenDepth = 0;
  let angleDepth = 0;
  let sawParen = false;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i].replace(/\/\/.*$/, '');
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '(') { parenDepth++; sawParen = true; }
      else if (ch === ')') parenDepth--;
      else if (ch === '<') angleDepth++;
      else if (ch === '>') { if (angleDepth > 0) angleDepth--; }
      else if (ch === '{' && parenDepth === 0 && angleDepth === 0) {
        // body starts here
        return normalizeSig(buf + line.slice(0, c));
      }
    }
    buf += line + ' ';
    // A field or return-less decl ends at end of line once parens are balanced
    // and we have consumed at least the whole line with no open paren.
    if (sawParen && parenDepth === 0) {
      // Peek: if the next non-empty content is a `{`, keep going; otherwise the
      // header may still continue onto a `-> Type` on the next line. We only
      // stop early when the accumulated text already contains a return arrow or
      // the line clearly ended the header.
    }
  }
  return normalizeSig(buf);
}

// Classify a declaration line (ignoring leading modifiers). Returns the kind and
// name, or null. Used to find declaration starts.
function classify(line) {
  const trimmed = line.trim();
  const isPub = /^pub\b/.test(trimmed);
  let rest = trimmed
    .replace(/^pub\s+/, '')
    .replace(/^unique\s+/, '')
    .replace(/^extern\s+"C"\s+/, '')
    .replace(/^packed\s+/, '')
    .replace(/^opaque\s+/, '');
  const unique = /\bunique\b/.test(trimmed.replace(/^pub\s+/, '').split(/\s+/).slice(0, 2).join(' '));
  const staticFn = rest.match(/^static\s+fn\s+([a-z_][A-Za-z0-9_]*)\b/);
  if (staticFn) return { isPub, kind: 'static', name: staticFn[1] };
  const asyncFn = rest.match(/^async\s+fn\s+([a-z_][A-Za-z0-9_]*)\b/);
  if (asyncFn) return { isPub, kind: 'async', name: asyncFn[1] };
  const fn = rest.match(/^fn\s+([a-z_][A-Za-z0-9_]*)\b/);
  if (fn) return { isPub, kind: 'fn', name: fn[1] };
  for (const k of TYPE_KINDS) {
    const m = rest.match(new RegExp(`^${k}\\s+([A-Z][A-Za-z0-9_]*)`));
    if (m) return { isPub, kind: 'type', typeKind: k, name: m[1], unique };
  }
  const field = rest.match(/^([a-z_][A-Za-z0-9_]*)\s*:/);
  if (field) return { isPub, kind: 'field', name: field[1] };
  return null;
}

function importPathFor(file) {
  const rel = path.relative(path.join(BEANS_REPO, 'stdlib', 'std'), file);
  const dir = path.dirname(rel);
  return 'std.' + dir.split(path.sep).join('.');
}

// Pull the `name: Type` (with optional default) out of a field header, so the
// summary and coverage report can show a field's type.
function fieldParts(signature) {
  // signature like `host: string = ""` (pub already stripped by caller). The
  // type is everything after the colon up to an `=` default, which no type
  // spelling contains.
  const m = signature.match(/^([a-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/);
  if (!m) return { type: '' };
  return { type: m[2].split(' = ')[0].trim() };
}

export function extractStdlibSignatures() {
  if (!BEANS_REPO) throw new Error('Beans repo not found (set BEANS_REPO).');
  const root = path.join(BEANS_REPO, 'stdlib', 'std');
  const files = walk(root, (f) => f.endsWith('.b'));
  const packages = new Map();

  for (const file of files) {
    if (file.includes('async$rt')) continue; // compiler-internal, not importable
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
    let currentType = null;
    let typeDepth = 0;
    let inEnum = false;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw.replace(/\/\/.*$/, '');
      const info = classify(line);

      if (info && info.kind === 'type') {
        const t = {
          kind: info.typeKind,
          name: info.name,
          unique: info.unique,
          isPub: info.isPub,
          constructor: null,
          methods: [],
          statics: [],
          fields: [],
          variants: [],
        };
        if (info.isPub) pkg.types.push(t);
        currentType = info.isPub ? t : null;
        typeDepth = depth;
        inEnum = info.typeKind === 'enum';
      } else if (info && depth === 0 && info.isPub &&
                 (info.kind === 'fn' || info.kind === 'static' || info.kind === 'async')) {
        pkg.functions.push({ name: info.name, kind: info.kind, signature: readHeader(lines, i) });
      } else if (currentType && depth === typeDepth + 1 && !info &&
                 inEnum && currentType.kind === 'enum') {
        // An enum variant classifies as nothing (a bare identifier, maybe with a
        // payload). Handle it here, where `info` is null.
        const v = line.trim().match(/^([a-z_][A-Za-z0-9_]*)\s*(\(.*\))?\s*$/);
        if (v && !/^(pub|fn|static|return|match|if|for|let|var|else)\b/.test(line.trim())) {
          currentType.variants.push({ name: v[1], signature: v[1] + (v[2] ?? '') });
        }
      } else if (currentType && depth === typeDepth + 1 && info) {
        if (info.kind === 'fn' || info.kind === 'static' || info.kind === 'async') {
          const signature = readHeader(lines, i);
          if (info.name === 'init') {
            // A constructor. Public constructors let another package write
            // `new Type(...)`. Record it as a constructor, keyed to the type.
            const params = signature.replace(/^.*?\binit\s*/, '');
            currentType.constructor = {
              name: 'init',
              isPub: info.isPub,
              signature: `new ${currentType.name}${params}`,
            };
          } else if (info.name === 'deinit') {
            // destructor: documented through automatic teardown, not as an API.
          } else if (info.isPub && info.kind === 'static') {
            currentType.statics.push({ name: info.name, kind: 'static', signature });
          } else if (info.isPub) {
            currentType.methods.push({ name: info.name, kind: info.kind, signature });
          }
        } else if (info.kind === 'field' && info.isPub) {
          // A field is a single line (`pub name: Type = default`); never seek a
          // body brace or it will swallow the following declarations.
          const stripped = normalizeSig(line.replace(/\/\/.*$/, '')).replace(/^pub\s+/, '');
          currentType.fields.push({ name: info.name, ...fieldParts(stripped), signature: stripped });
        }
      }

      for (const ch of line) {
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (currentType && depth <= typeDepth) { currentType = null; inEnum = false; }
        }
      }
    }
  }
  return [...packages.values()].sort((a, b) => a.importPath.localeCompare(b.importPath));
}
