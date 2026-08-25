import fs from 'node:fs';
import path from 'node:path';
import { BEANS_REPO, compilerSource } from './paths.mjs';

// Generate canonical signatures for the built-in methods, statics and module
// functions straight from the checker's own typed registry
// (src/expression.b: builtin_method / builtin_static /
// builtin_module). These are the exact `(parameter types) -> result` shapes the
// checker enforces, so a documented builtin signature can be verified against
// the compiler and cannot silently drift.
//
// Built-ins carry positional parameter types, not names (they are typed in the
// checker, not written in Beans source), so a signature reads
// `List<T>.push(T) -> unit` — the honest shape a caller sees, matching the
// compiler's own hover text.
//
// A handful of receivers are matched by a predicate rather than a name literal
// (numeric `abs`/`round` via hir_is_integer/hir_is_float, and the whole SIMD
// family via simd_description). Those are enumerated in the curated inventory
// with their own doc homes; this generator covers every name-matched receiver.

// Receiver display + generic variable environment, per receiver name.
const RECEIVERS = {
  string: { display: 'string', env: {} },
  array: { display: 'array', env: {} },
  List: { display: 'List<T>', env: { element: 'T' } },
  Map: { display: 'Map<K, V>', env: { key: 'K', value: 'V' } },
  OrderedMap: { display: 'OrderedMap<K, V>', env: { key: 'K', value: 'V' } },
  Box: { display: 'Box<T>', env: { value: 'T' } },
  Arena: { display: 'Arena<T>', env: { value: 'T' } },
  Shared: { display: 'Shared<T>', env: { value: 'T' } },
  Weak: { display: 'Weak<T>', env: { value: 'T' } },
  Thread: { display: 'Thread<T>', env: { 'receiver.args[0]': 'T' } },
  Brew: { display: 'Brew<T>', env: { 'receiver.args[0]': 'T' } },
  TaskGroup: { display: 'TaskGroup<T>', env: { 'receiver.args[0]': 'T', value: 'T' } },
  Gate: { display: 'Gate', env: {} },
  Mutex: { display: 'Mutex<T>', env: { 'receiver.args[0]': 'T' } },
  Channel: { display: 'Channel<T>', env: { value: 'T' } },
  AtomicInt: { display: 'AtomicInt', env: {} },
  Atomic: { display: 'Atomic<T>', env: { value: 'T', order: 'MemoryOrder' } },
  Option: { display: 'Option<T>', env: { value: 'T' } },
  Result: { display: 'Result<T>', env: { value: 'T' } },
  Bytes: { display: 'Bytes', env: {} },
  File: { display: 'File', env: {} },
  MMap: { display: 'MMap', env: {} },
  RawPtr: { display: 'RawPtr<T>', env: { element: 'T' } },
  Slice: { display: 'Slice<T>', env: { element: 'T' } },
  Dir: { display: 'Dir', env: {} },
};

// Base type spellings for the local variables the registry declares at the top
// of each function.
const BASE_ENV = {
  integer: 'int',
  boolean: 'bool',
  string: 'string',
  unit: 'unit',
  bytes: 'Bytes',
};

function readExpressionSource() {
  if (!BEANS_REPO) throw new Error('Beans repo not found (set BEANS_REPO).');
  return fs.readFileSync(compilerSource('expression.b'), 'utf8');
}

// The body text of a top-level `fn NAME(...) { ... }` in a source string.
function functionBody(src, name) {
  const start = src.indexOf(`fn ${name}(`);
  if (start < 0) throw new Error(`${name}() not found in expression.b`);
  const brace = src.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(brace + 1, i);
    }
  }
  throw new Error(`unterminated ${name}()`);
}

// Split the two arguments of `new BuiltinSignature(<params>, <result>)` at the
// top-level comma, honouring nested () and [].
function splitSignatureArgs(text) {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === ',' && depth === 0) {
      return [text.slice(0, i).trim(), text.slice(i + 1).trim()];
    }
  }
  throw new Error(`cannot split BuiltinSignature args: ${text}`);
}

// Split a top-level comma list (already unwrapped from its [ ]).
function splitList(text) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[') { depth++; cur += ch; }
    else if (ch === ')' || ch === ']') { depth--; cur += ch; }
    else if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// Evaluate a HirType expression from the registry to its rendered spelling,
// against an environment mapping local names to type spellings. Throws on any
// construct it does not recognise, so a new one cannot slip through untyped.
function evalType(expr, env) {
  // Collapse the whitespace a wrapped declaration leaves behind so the shape
  // regexes below match regardless of how the source line-broke.
  expr = expr.replace(/\s+/g, ' ').replace(/([([])\s+/g, '$1').replace(/\s+([)\]])/g, '$1').trim();
  if (expr in env) return env[expr];
  if (expr in BASE_ENV) return BASE_ENV[expr];
  if (expr === 'receiver') return env['receiver'];
  if (expr === 'receiver.args[0]') return env['receiver.args[0]'] ?? env['element'] ?? env['value'];
  let m;
  if ((m = expr.match(/^new HirType\("([^"]+)"\)$/))) return m[1];
  if ((m = expr.match(/^hir_result\((.*)\)$/s))) return `Result<${evalType(m[1], env)}>`;
  if ((m = expr.match(/^hir_option\((.*)\)$/s))) return `Option<${evalType(m[1], env)}>`;
  if ((m = expr.match(/^hir_list\((.*)\)$/s))) return `List<${evalType(m[1], env)}>`;
  if ((m = expr.match(/^hir_named\("([^"]+)",\s*\[(.*)\]\)$/s))) {
    const args = splitList(m[2]).map((a) => evalType(a, env));
    return `${m[1]}<${args.join(', ')}>`;
  }
  if ((m = expr.match(/^hir_function\(\[(.*)\],\s*(.*)\)$/s))) {
    const params = m[1].trim() ? splitList(m[1]).map((a) => evalType(a, env)) : [];
    return `fn(${params.join(', ')}) -> ${evalType(m[2], env)}`;
  }
  throw new Error(`unrecognized builtin type expression: ${JSON.stringify(expr)}`);
}

// Render one method/static/module signature line. A module function has no
// receiver, so it reads `name(params) -> ret`.
function renderMethod(recvDisplay, name, paramTypes, result) {
  const params = paramTypes.join(', ');
  const ret = result === 'unit' ? '' : ` -> ${result}`;
  const prefix = recvDisplay ? `${recvDisplay}.` : '';
  return `${prefix}${name}(${params})${ret}`;
}

// Parse a registry function body into { receiverName -> [{name, paramTypes[], result}] }.
// `kind` selects the guard variable: 'method' (receiver.name), 'static'
// (type_name), 'module' (import_path).
function parseRegistry(body, kind) {
  const guardRe =
    kind === 'method'
      ? /receiver\.name\s*==\s*"([A-Za-z0-9_]+)"/
      : kind === 'static'
        ? /type_name\s*==\s*"([A-Za-z0-9_]+)"/
        : /import_path\s*==\s*"([A-Za-z0-9_.]+)"/;

  const result = {};
  // Walk the body character by character, tracking the current receiver guard
  // and, when we hit `new BuiltinSignature(`, the set of method names in scope.
  const lines = body.split('\n');

  let currentRecv = null;
  let predicate = null; // '<int>' | '<float>' | '<simd>' | 'decimal-ish'
  let pendingNames = [];
  let conditionalParams = null; // { test: name, then: expr, else: expr }
  const localAliases = {}; // block-local `let X: HirType = new HirType("Y")`

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // A block-local type alias, e.g. `let floating: HirType = new HirType("float")`,
    // which the registry may wrap onto the next line.
    if (/\blet\s+[A-Za-z_]\w*\s*:\s*HirType\s*=/.test(line)) {
      const window = [line, lines[i + 1] ?? ''].join(' ').replace(/\s+/g, ' ');
      const alias = window.match(/\blet\s+([A-Za-z_]\w*)\s*:\s*HirType\s*=\s*new HirType\("([^"]+)"\)/);
      if (alias) localAliases[alias[1]] = alias[2];
    }

    // Receiver / predicate context.
    if (kind === 'method') {
      if (/hir_is_integer\(receiver\)/.test(line)) { predicate = '<int>'; currentRecv = null; }
      else if (/hir_is_float\(receiver\)/.test(line)) { predicate = '<float>'; currentRecv = null; }
      else if (/simd_description\(receiver\.name\)/.test(line)) { predicate = '<simd>'; currentRecv = null; }
      const g = line.match(guardRe);
      if (g) {
        // A shared block `(receiver.name == "Map" ||\n receiver.name ==
        // "OrderedMap")` wraps across lines: the first line starts with `if`,
        // the rest are continuations. Accumulate receiver names across them.
        const names = [...line.matchAll(new RegExp(guardRe.source, 'g'))].map((x) => x[1]);
        if (/^if\b/.test(line.trimStart())) currentRecv = names;
        else currentRecv = (currentRecv ?? []).concat(names);
        predicate = null;
      }
    } else {
      const g = line.match(guardRe);
      if (g) { currentRecv = [g[1]]; predicate = null; }
    }

    // Method-name guard, which may wrap across lines:
    //   if name == "a" || name == "b" ||
    //      name == "c" {
    // A guard START begins with `if` and mentions `name ==`; a continuation
    // line mentions `name ==` without starting a new `if`. The `let parameters
    // = if name == ...` ternary is handled above, so exclude any `let` line.
    const nameMatches = [...line.matchAll(/(?<![._A-Za-z0-9])name\s*==\s*"([A-Za-z0-9_]+)"/g)].map(
      (x) => x[1],
    );
    const trimmedStart = line.trimStart();
    // The inner line of a wrapped `= if name == "x" { [..] } else { [..] }`
    // ternary also matches `name ==`; it is a parameter selector, not a guard,
    // so it must not reset the accumulated guard names.
    const isTernary = /if\s+name\s*==.*\belse\b/.test(line) || /\{\s*\[/.test(line);
    if (nameMatches.length && !/\blet\b/.test(line) && !isTernary) {
      if (/^if\b/.test(trimmedStart)) pendingNames = nameMatches; // new guard
      else pendingNames = pendingNames.concat(nameMatches); // continuation
    }

    // Conditional parameter list: `let parameters ... = if name == "x" { [A] }
    // else { [B] }`, which the registry sometimes wraps across lines.
    if (/\blet parameters\b/.test(line)) {
      const window = lines.slice(i, i + 6).join(' ').replace(/\s+/g, ' ');
      const cond = window.match(
        /=\s*if\s+name\s*==\s*"([A-Za-z0-9_]+)"\s*\{\s*\[(.*?)\]\s*\}\s*else\s*\{\s*\[(.*?)\]\s*\}/,
      );
      if (cond) conditionalParams = { test: cond[1], then: cond[2], else: cond[3] };
    }

    // A signature return.
    const sigStart = line.indexOf('new BuiltinSignature(');
    if (sigStart >= 0 && (predicate === null || predicate === undefined) && currentRecv) {
      // Accumulate until the parentheses balance (may span lines).
      let text = line.slice(sigStart + 'new BuiltinSignature('.length);
      let depth = 1;
      let j = i;
      let collected = '';
      // rebuild from the char after the open paren across lines
      let buf = text;
      while (true) {
        for (let k = 0; k < buf.length; k++) {
          const ch = buf[k];
          if (ch === '(' || ch === '[') depth++;
          else if (ch === ')' || ch === ']') {
            depth--;
            if (depth === 0) { collected += buf.slice(0, k); buf = null; break; }
          }
        }
        if (buf === null) break;
        collected += buf + ' ';
        j++;
        if (j >= lines.length) throw new Error('unterminated BuiltinSignature');
        buf = lines[j].replace(/\/\/.*$/, '');
      }
      const [paramsExpr, resultExpr] = splitSignatureArgs(collected);
      for (const recvName of currentRecv) {
        let recvDisplay;
        let env;
        if (kind === 'module') {
          recvDisplay = ''; // a module function has no receiver
          env = { ...localAliases };
        } else {
          const recv = RECEIVERS[recvName];
          if (!recv) continue; // predicate/curated receiver, skip
          recvDisplay = recv.display;
          env = { ...localAliases, ...recv.env, receiver: recv.display };
          // element/value/key already in env; also expose receiver.args[0]
          if (recv.env.element) env['receiver.args[0]'] = recv.env.element;
          if (recv.env.value) env['receiver.args[0]'] = recv.env.value;
        }

        for (const nm of pendingNames) {
          let paramTypes;
          if (conditionalParams) {
            const chosen = nm === conditionalParams.test ? conditionalParams.then : conditionalParams.else;
            paramTypes = chosen.trim() ? splitList(chosen).map((e) => evalType(e, env)) : [];
          } else {
            const inner = paramsExpr.replace(/^\[/, '').replace(/\]$/, '');
            paramTypes = inner.trim() ? splitList(inner).map((e) => evalType(e, env)) : [];
          }
          const resultType = evalType(resultExpr, env);
          (result[recvName] ??= []).push({
            name: nm,
            signature: renderMethod(recvDisplay, nm, paramTypes, resultType),
          });
        }
      }
      conditionalParams = null;
      i = j;
      continue;
    }

    // Reset conditionalParams if we passed the return without using it.
    if (line.includes('return some')) conditionalParams = null;
  }
  return result;
}

let CACHE = null;

export function extractBuiltinSignatures() {
  if (CACHE) return CACHE;
  const src = readExpressionSource();
  const methods = parseRegistry(functionBody(src, 'builtin_method'), 'method');
  const statics = parseRegistry(functionBody(src, 'builtin_static'), 'static');
  const modules = parseRegistry(functionBody(src, 'builtin_module'), 'module');
  CACHE = { methods, statics, modules };
  return CACHE;
}
