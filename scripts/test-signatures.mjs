#!/usr/bin/env node
// Tests for the signature extraction and API-count tooling. These lock down the
// exact shapes the coverage gate depends on, so a change in an extractor that
// silently drops a symbol or mangles a signature fails here rather than sailing
// through as "documented".
import fs from 'node:fs';
import path from 'node:path';
import { extractStdlibSignatures } from './lib/extract-signatures.mjs';
import { extractBuiltinSignatures } from './lib/extract-builtin-signatures.mjs';
import { buildInventory } from './lib/inventory.mjs';
import { BEANS_REPO } from './lib/paths.mjs';

if (!BEANS_REPO) {
  console.error('test:signatures: Beans repo not found. Set BEANS_REPO to the beans checkout.');
  process.exit(2);
}

let failures = 0;
function ok(cond, msg) {
  if (cond) return;
  failures++;
  console.error(`  ✗ ${msg}`);
}

// ---- stdlib signatures ------------------------------------------------------
const pkgs = extractStdlibSignatures();
const byPath = new Map(pkgs.map((p) => [p.importPath, p]));

function methodSig(pkg, type, method) {
  const t = byPath.get(pkg)?.types.find((x) => x.name === type);
  return t?.methods.find((m) => m.name === method)?.signature;
}
function staticSig(pkg, type, name) {
  const t = byPath.get(pkg)?.types.find((x) => x.name === type);
  return t?.statics.find((m) => m.name === name)?.signature;
}
function fnSig(pkg, name) {
  return byPath.get(pkg)?.functions.find((f) => f.name === name)?.signature;
}

ok(
  staticSig('std.net', 'TcpStream', 'connect') ===
    'pub static fn connect(host: string, port: int) -> Result<TcpStream>',
  'net TcpStream.connect signature',
);
ok(
  methodSig('std.net', 'UdpSocket', 'send_to') ===
    'pub fn send_to(data: Bytes, to: Address) -> Result<int>',
  'net UdpSocket.send_to signature',
);
ok(fnSig('std.encoding.json', 'parse') === 'pub fn parse(text: string) -> Result<Value>', 'json parse signature');
ok(
  staticSig('std.encoding.json', 'Value', 'from_uint') === 'pub static fn from_uint(value: u64) -> Value',
  'json Value.from_uint signature',
);
// Multiline declaration with generic bounds, inout and a closure parameter.
ok(
  fnSig('std.collections', 'get_or_insert_with') ===
    'pub fn get_or_insert_with<K implements Eq & Hash, V implements Clone>(inout values: Map<K, V>, key: K, make: fn() -> V) -> V',
  'collections get_or_insert_with multiline generic signature',
);
// Public constructor is captured.
const addr = byPath.get('std.net').types.find((t) => t.name === 'Address');
ok(addr?.constructor?.signature === 'new Address(host: string, port: int)', 'net Address constructor');
ok(addr?.constructor?.isPub === true, 'net Address constructor is public');
// Package-private constructor is flagged non-public.
const stream = byPath.get('std.net').types.find((t) => t.name === 'TcpStream');
ok(stream?.constructor?.isPub === false, 'net TcpStream constructor is package-private');
// Enum variants.
const kind = byPath.get('std.encoding.json').types.find((t) => t.name === 'Kind');
ok(
  kind && ['null', 'boolean', 'integer', 'object'].every((v) => kind.variants.some((x) => x.name === v)),
  'json Kind enum variants captured',
);

// ---- builtin signatures -----------------------------------------------------
const bi = extractBuiltinSignatures();
function findMethod(recv, name) {
  return (bi.methods[recv] ?? []).find((m) => m.name === name)?.signature;
}
ok(findMethod('List', 'push') === 'List<T>.push(T)', 'builtin List.push signature');
ok(findMethod('List', 'get') === 'List<T>.get(int) -> Option<T>', 'builtin List.get signature');
ok(findMethod('Map', 'set') === 'Map<K, V>.set(K, V)', 'builtin Map.set signature');
ok(findMethod('string', 'split') === 'string.split(string) -> List<string>', 'builtin string.split signature');
ok(
  findMethod('Atomic', 'compare_exchange') === 'Atomic<T>.compare_exchange(T, T, MemoryOrder, MemoryOrder) -> bool',
  'builtin Atomic.compare_exchange signature',
);
ok(bi.statics.File?.some((s) => s.signature === 'File.open(string, string) -> Result<File>'), 'builtin File.open static');
ok(bi.modules['std.os']?.some((f) => f.signature === 'args() -> List<string>'), 'builtin std.os.args module fn');

// Completeness: every name-matched builtin method in the checker source is
// produced by the evaluator (guards against a new receiver/name slipping past).
const src = fs.readFileSync(path.join(BEANS_REPO, 'compiler', 'beans', 'expression.b'), 'utf8');
function fnBody(name) {
  const s = src.indexOf(`fn ${name}(`);
  const b = src.indexOf('{', s);
  let d = 0;
  for (let i = b; i < src.length; i++) {
    if (src[i] === '{') d++;
    else if (src[i] === '}') {
      d--;
      if (d === 0) return src.slice(b + 1, i);
    }
  }
  return '';
}
const PREDICATE = new Set(['<int>', '<float>', '<simd>']);
// Receivers documented through the curated inventory rather than the evaluator.
const CURATED_RECV = new Set(['StoredCallback', 'CFunctionPtr', 'decimal']);
const covered = new Set();
for (const r of Object.keys(bi.methods)) for (const m of bi.methods[r]) covered.add(`${r}.${m.name}`);
let recv = null;
let pred = null;
for (const ln of fnBody('builtin_method').split('\n')) {
  if (/hir_is_integer\(receiver\)/.test(ln)) { pred = '<int>'; recv = null; }
  else if (/hir_is_float\(receiver\)/.test(ln)) { pred = '<float>'; recv = null; }
  else if (/simd_description\(receiver\.name\)/.test(ln)) { pred = '<simd>'; recv = null; }
  const g = [...ln.matchAll(/receiver\.name\s*==\s*"([A-Za-z0-9_]+)"/g)].map((x) => x[1]);
  if (g.length) { recv = g; pred = null; }
  for (const nm of [...ln.matchAll(/(?<![._A-Za-z0-9])name\s*==\s*"([A-Za-z0-9_]+)"/g)].map((x) => x[1])) {
    if (pred && PREDICATE.has(pred)) continue;
    if (!recv) continue;
    if (recv.some((r) => CURATED_RECV.has(r))) continue;
    ok(recv.some((r) => covered.has(`${r}.${nm}`)), `builtin method covered by evaluator: ${recv.join('|')}.${nm}`);
  }
}

// ---- inventory --------------------------------------------------------------
const inv = buildInventory();
ok(inv.length > 600, `inventory has a plausible symbol count (got ${inv.length})`);
const withSig = inv.filter((e) => e.signature).length;
ok(withSig > 400, `inventory has signatures for most symbols (got ${withSig})`);
// A few representative entries carry the right signature + page.
function invEntry(name, page) {
  return inv.find((e) => e.name === name && e.page === page);
}
ok(
  invEntry('TcpStream.connect', 'reference/stdlib/net')?.signature ===
    'pub static fn connect(host: string, port: int) -> Result<TcpStream>',
  'inventory net connect entry',
);
ok(
  invEntry('List.push', 'reference/builtins/collections')?.signature === 'List<T>.push(T)',
  'inventory List.push entry',
);
ok(invEntry('new Address', 'reference/stdlib/net')?.signature === 'new Address(host: string, port: int)', 'inventory Address constructor entry');
// No duplicate (name, page) keys.
const keys = inv.map((e) => `${e.name}::${e.page}`);
ok(keys.length === new Set(keys).size, 'inventory has no duplicate (name, page) entries');

if (failures) {
  console.error(`\ntest:signatures — ${failures} failure(s)`);
  process.exit(1);
}
console.log('test:signatures — all checks passed');
