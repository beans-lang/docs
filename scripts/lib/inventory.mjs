import { extractStdlibSignatures } from './extract-signatures.mjs';
import { extractBuiltinSignatures } from './extract-builtin-signatures.mjs';
import { extractBuiltinTypeNames } from './extract-types.mjs';

// Build the full coverage inventory: every public builtin and standard-library
// symbol, each mapped to the documentation page that must document it, WITH the
// canonical signature the page must show.
//
// Sources (all read from the public Beans source, so nothing is typed by hand
// that can silently drift):
//   - stdlib packages           -> stdlib/std/**/*.b       (full signatures, param names)
//   - builtin methods/statics   -> compiler/beans/expression.b builtin_method/static
//   - builtin module functions  -> compiler/beans/expression.b builtin_module
//   - builtin TYPE registry     -> compiler/beans/resolve.b builtin_type()
//   - a small curated set for members the compiler types by predicate rather
//     than by a name literal (numeric abs/round, the SIMD family, the FFI
//     callback handles) and for the true prelude globals (panic, size_of, ...).
//
// Each entry: { group, name, token, page, kind, summaryKind, signature }.
//   token     — the whole word the page must contain (name fallback).
//   signature — the exact normalized signature the page must contain, or null
//               for symbols that have no signature (type names, fields, enum
//               variants, selectors), which fall back to token presence.
//   summaryKind — the bucket the compact per-page API summary counts it under:
//               'function' | 'type' | 'constructor' | 'static' | 'method'
//               | 'field' | 'variant' | 'value'.

const B = (p) => `reference/builtins/${p}`;
const S = (p) => `reference/stdlib/${p}`;

// import path -> stdlib reference page
const STDLIB_PAGES = {
  'std.collections': S('collections'),
  'std.fmt': S('fmt'),
  'std.math': S('math'),
  'std.bytes': S('bytes'),
  'std.path': S('path'),
  'std.fs': S('fs'),
  'std.reader': S('reader'),
  'std.encoding.json': S('json'),
  'std.encoding.xml': S('xml'),
  'std.encoding.base64': S('base64'),
  'std.encoding.binary': S('binary'),
  'std.net': S('net'),
  'std.process': S('process'),
  'std.poll': S('poll'),
  'std.signal': S('signal'),
  'std.dylib': S('dylib'),
};

// builtin method receiver -> page
const BUILTIN_METHOD_PAGE = {
  string: B('string'),
  array: B('simd'),
  List: B('collections'),
  Map: B('collections'),
  OrderedMap: B('collections'),
  Option: B('option-result'),
  Result: B('option-result'),
  Box: B('handles'),
  Arena: B('handles'),
  Shared: B('handles'),
  Weak: B('handles'),
  Mutex: B('handles'),
  Channel: B('handles'),
  Thread: B('handles'),
  AtomicInt: B('handles'),
  Atomic: B('atomics'),
  Bytes: B('bytes'),
  File: B('files'),
  MMap: B('files'),
  RawPtr: B('simd'),
  Slice: B('simd'),
};

// builtin static class -> page
const BUILTIN_STATIC_PAGE = {
  Bytes: B('bytes'),
  File: B('files'),
  Dir: B('files'),
  MMap: B('files'),
  Atomic: B('atomics'),
};

// public builtin module -> page. Internal primitive modules (std.proc/sock/sig/
// dl/ready) are compiler-internal and surfaced through their Beans-source
// packages (std.process, std.net, ...), so they are not coverage targets.
const BUILTIN_MODULE_PAGE = {
  'std.io': S('io-os'),
  'std.c': S('io-os'),
  'std.os': S('io-os'),
  'std.time': S('time-random'),
  'std.random': S('time-random'),
  'std.fmt': S('fmt'),
  'std.target': S('target'),
  'std.asm': S('asm'),
  'std.intrinsic': S('cpu-intrinsic'),
  'std.cpu': S('cpu-intrinsic'),
};
const INTERNAL_MODULES = new Set(['std.proc', 'std.sock', 'std.sig', 'std.dl', 'std.ready']);

// Where each builtin TYPE name from resolve.b's builtin_type() is documented.
// Every registry type must have an entry here or buildInventory() throws, so a
// new builtin type cannot slip in without a doc home.
const TYPE_PAGE = {
  unit: B('primitives'), bool: B('primitives'), string: B('primitives'),
  int: B('primitives'), i8: B('primitives'), i16: B('primitives'), i32: B('primitives'),
  i64: B('primitives'), uint: B('primitives'), byte: B('primitives'), u8: B('primitives'),
  u16: B('primitives'), u32: B('primitives'), u64: B('primitives'), f32: B('primitives'),
  f64: B('primitives'), float: B('primitives'),
  decimal: B('numbers'), RoundingMode: B('numbers'),
  Clone: 'guide/generics', Eq: 'guide/generics', Hash: 'guide/generics',
  Order: 'guide/generics', Send: 'guide/generics', Sync: 'guide/generics',
  Self: 'guide/generics',
  RawPtr: B('simd'), Slice: B('simd'), RawSlice: B('simd'),
  List: B('collections'), Map: B('collections'), OrderedMap: B('collections'),
  Option: B('option-result'), Result: B('option-result'), Error: B('option-result'),
  Box: B('handles'), Arena: B('handles'), Shared: B('handles'), Weak: B('handles'),
  Mutex: B('handles'), Channel: B('handles'), Thread: B('handles'), AtomicInt: B('handles'),
  Atomic: B('atomics'), MemoryOrder: B('atomics'),
  Bytes: B('bytes'), File: B('files'), Dir: B('files'), MMap: B('files'),
  CpuFeature: S('cpu-intrinsic'), StoredCallback: 'guide/ffi', CFunctionPtr: 'guide/ffi',
};

// Members the compiler types by predicate (not a name literal) or that are true
// prelude globals, plus selectors and native functions with no name-literal
// builtin_* entry. Format: [page, group, summaryKind, ...names].
const CURATED = [
  // numeric methods (typed via hir_is_integer / hir_is_float / decimal)
  [B('numbers'), 'decimal method', 'method', 'round', 'abs'],
  [B('primitives'), 'numeric method', 'method', 'abs', 'round'],
  // rounding-mode selector (an enum-like set of names)
  [B('numbers'), 'RoundingMode selector', 'variant', 'half_even', 'half_away',
    'toward_zero', 'floor', 'ceil'],
  // option / result prelude constructors and the Error fields
  [B('option-result'), 'prelude value', 'value', 'some', 'none', 'ok', 'err'],
  // Higher-order combinators typed by the expander (check_higher_order_method),
  // not by a name-literal builtin_* row. They are generic over the closure's
  // result, so their names are enforced here and full signatures are written on
  // the page by hand.
  [B('option-result'), 'combinator', 'method', 'map', 'and_then', 'filter', 'recover'],
  [B('option-result'), 'Error field', 'field', 'msg', 'kind'],
  // ownership-handle members typed elsewhere / handle join
  [B('handles'), 'handle method', 'method', 'join', 'with_lock'],
  // memory-order selector
  [B('atomics'), 'MemoryOrder selector', 'variant', 'relaxed', 'acquire', 'release',
    'acq_rel', 'seq_cst'],
  // SIMD family (matched by simd_description, so kept curated) and raw memory
  [B('simd'), 'SIMD family', 'type', 'Simd4f32', 'Simd4i32', 'Simd16u8', 'Simd2f64'],
  [B('simd'), 'RawPtr member', 'static', 'alloc', 'alloc_aligned', 'null', 'from_address',
    'with_local'],
  [B('simd'), 'Slice member', 'static', 'from_raw'],
  [B('simd'), 'SIMD op', 'method', 'splat', 'of', 'lane', 'with_lane', 'lane_count',
    'select', 'any_true', 'all_true', 'product'],
  // C-interop builtins live on the FFI page
  ['guide/ffi', 'C callback builtin', 'method', 'create', 'function',
    'function_pointer', 'context', 'call'],
  // prelude globals typed as builtin_call / expander magic
  [B('functions'), 'prelude function', 'function', 'panic', 'size_of', 'align_of',
    'offset_of'],
  [B('functions'), 'print function', 'function', 'println', 'print', 'eprintln', 'eprint'],
  // native module typed in the checker with no name-literal builtin_* row
  [S('thread'), 'std.thread function', 'function', 'spawn'],
];

export function buildInventory() {
  const entries = [];
  const add = (e) => entries.push({ token: e.name, signature: null, ...e });

  // 1. stdlib source packages (full signatures with parameter names)
  for (const pkg of extractStdlibSignatures()) {
    const page = STDLIB_PAGES[pkg.importPath];
    if (!page) continue; // unknown/internal package
    const group = pkg.importPath;
    for (const fn of pkg.functions)
      add({ group, name: fn.name, page, kind: 'function', summaryKind: 'function', signature: fn.signature });
    for (const t of pkg.types) {
      add({ group, name: t.name, page, kind: t.kind, summaryKind: 'type' });
      if (t.constructor && t.constructor.isPub) {
        add({
          group, name: `new ${t.name}`, token: t.name, page,
          kind: 'constructor', summaryKind: 'constructor', signature: t.constructor.signature,
        });
      }
      for (const m of t.methods)
        add({ group, name: `${t.name}.${m.name}`, token: m.name, page, kind: 'method', summaryKind: 'method', signature: m.signature });
      for (const s of t.statics)
        add({ group, name: `${t.name}.${s.name}`, token: s.name, page, kind: 'static', summaryKind: 'static', signature: s.signature });
      for (const f of t.fields)
        add({ group, name: `${t.name}.${f.name}`, token: f.name, page, kind: 'field', summaryKind: 'field' });
      for (const v of t.variants)
        add({ group, name: `${t.name}.${v.name}`, token: v.name, page, kind: 'variant', summaryKind: 'variant' });
    }
  }

  // 2. builtin methods, statics and module functions (typed registry)
  const bi = extractBuiltinSignatures();
  for (const recv of Object.keys(bi.methods)) {
    const page = BUILTIN_METHOD_PAGE[recv];
    if (!page) continue;
    for (const m of bi.methods[recv])
      add({ group: `builtin ${recv}`, name: `${recv}.${m.name}`, token: m.name, page, kind: 'method', summaryKind: 'method', signature: m.signature });
  }
  for (const cls of Object.keys(bi.statics)) {
    const page = BUILTIN_STATIC_PAGE[cls];
    if (!page) continue;
    for (const s of bi.statics[cls])
      add({ group: `builtin ${cls}`, name: `${cls}.${s.name}`, token: s.name, page, kind: 'static', summaryKind: 'static', signature: s.signature });
  }
  for (const mod of Object.keys(bi.modules)) {
    if (INTERNAL_MODULES.has(mod)) continue;
    const page = BUILTIN_MODULE_PAGE[mod];
    if (!page) continue;
    for (const f of bi.modules[mod])
      add({ group: mod, name: `${mod}.${f.name}`, token: f.name, page, kind: 'function', summaryKind: 'function', signature: f.signature });
  }

  // 3. builtin TYPES from resolve.b's registry, so a new builtin type cannot be
  // added to the compiler without a documentation home.
  for (const name of extractBuiltinTypeNames()) {
    const page = TYPE_PAGE[name];
    if (!page) {
      throw new Error(
        `builtin type "${name}" from resolve.b has no documentation page in ` +
          `TYPE_PAGE (scripts/lib/inventory.mjs). Add a mapping and document it.`,
      );
    }
    add({ group: 'builtin type', name, page, kind: 'type', summaryKind: 'type' });
  }

  // 4. curated predicate-typed members, selectors and prelude globals.
  for (const [page, group, summaryKind, ...names] of CURATED) {
    for (const name of names) add({ group, name, token: name, page, kind: summaryKind, summaryKind });
  }

  // De-duplicate identical (name, page) pairs that two sources can produce,
  // preferring the entry that carries a signature.
  const bestByKey = new Map();
  for (const e of entries) {
    const key = `${e.name}::${e.page}`;
    const prev = bestByKey.get(key);
    if (!prev || (!prev.signature && e.signature)) bestByKey.set(key, e);
  }
  return [...bestByKey.values()];
}
