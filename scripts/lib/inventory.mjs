import { extractStdlib } from './extract-stdlib.mjs';
import { extractBuiltinAbi } from './extract-builtins.mjs';
import { extractBuiltinTypeNames } from './extract-types.mjs';

// Build the full coverage inventory: every public builtin and standard-library
// symbol, each mapped to the documentation page that must document it.
//
// Sources:
//  - stdlib source packages   -> generated from stdlib/std/**/*.b
//  - builtin C++ ABI tables    -> generated from compiler/bootstrap/builtins.cpp
//  - checker-typed builtins    -> curated below (typed in compiler/beans, no C++ row)
//  - native std.* modules      -> curated / from the ABI fn table
//
// Each entry: { group, name, token, page, kind }.
// `token` is what we look for (whole word) on `page`.

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

// ABI receiver type -> builtin page
const ABI_METHOD_PAGE = {
  string: B('string'),
  Bytes: B('bytes'),
  File: B('files'),
  MMap: B('files'),
};
const ABI_STATIC_PAGE = { Bytes: B('bytes'), File: B('files'), Dir: B('files'), MMap: B('files') };

// ABI fn module -> page. Internal primitive modules (std.proc/sock/sig/dl/ready)
// are NOT the public API — the spec says so explicitly — so they are not
// required coverage targets. They are surfaced through their Beans-source
// packages (std.process, std.net, ...) instead.
const ABI_FN_PAGE = {
  'std.os': S('io-os'),
  'std.c': S('io-os'),
  'std.io': S('io-os'),
  'std.time': S('time-random'),
  'std.random': S('time-random'),
  'std.fmt': S('fmt'),
};
const INTERNAL_MODULES = new Set(['std.proc', 'std.sock', 'std.sig', 'std.dl', 'std.ready']);

// Checker-typed builtins and native modules with no C++ ABI row. Curated from
// compiler/bootstrap/builtins.h/.cpp and compiler/beans/{expression.b,resolve.b,
// parser.b,target.b}. Format: [page, group, ...names].
// Where each builtin TYPE name from resolve.b's builtin_type() is documented.
// Every registry type must have an entry here or buildInventory() throws — so a
// new builtin type cannot slip in undocumented.
const TYPE_PAGE = {
  // primitives
  unit: B('primitives'), bool: B('primitives'), string: B('primitives'),
  int: B('primitives'), i8: B('primitives'), i16: B('primitives'), i32: B('primitives'),
  i64: B('primitives'), uint: B('primitives'), byte: B('primitives'), u8: B('primitives'),
  u16: B('primitives'), u32: B('primitives'), u64: B('primitives'), f32: B('primitives'),
  f64: B('primitives'), float: B('primitives'),
  decimal: B('numbers'), RoundingMode: B('numbers'),
  // marker interfaces (bounds)
  Clone: 'guide/generics', Eq: 'guide/generics', Hash: 'guide/generics',
  Order: 'guide/generics', Send: 'guide/generics', Sync: 'guide/generics',
  Self: 'guide/generics',
  // raw memory
  RawPtr: B('simd'), Slice: B('simd'), RawSlice: B('simd'),
  // collections
  List: B('collections'), Map: B('collections'), OrderedMap: B('collections'),
  // option / result / error
  Option: B('option-result'), Result: B('option-result'), Error: B('option-result'),
  // ownership handles
  Box: B('handles'), Arena: B('handles'), Shared: B('handles'), Weak: B('handles'),
  Mutex: B('handles'), Channel: B('handles'), Thread: B('handles'), AtomicInt: B('handles'),
  // atomics
  Atomic: B('atomics'), MemoryOrder: B('atomics'),
  // bytes / files
  Bytes: B('bytes'), File: B('files'), Dir: B('files'), MMap: B('files'),
  // cpu / callbacks
  CpuFeature: S('cpu-intrinsic'), StoredCallback: 'guide/ffi', CFunctionPtr: 'guide/ffi',
};

const CURATED = [
  // numbers / decimal
  [B('numbers'), 'RoundingMode selector', 'half_even', 'half_away',
    'toward_zero', 'floor', 'ceil'],
  // decimal method
  [B('numbers'), 'decimal method', 'round', 'abs'],
  // collections
  [B('collections'), 'List method', 'clone', 'push', 'pop', 'first', 'last', 'get', 'len',
    'is_empty', 'max', 'min', 'contains', 'index_of', 'insert', 'remove', 'reverse',
    'clear', 'slice', 'sort', 'sort_by', 'sort_by_key', 'join', 'reserve'],
  [B('collections'), 'Map method', 'set', 'contains_key', 'keys', 'values'],
  // option / result / error
  [B('option-result'), 'prelude value', 'some', 'none', 'ok', 'err'],
  [B('option-result'), 'Option method', 'or', 'expect', 'is_some', 'is_none', 'map',
    'and_then', 'filter'],
  [B('option-result'), 'Result method', 'is_ok', 'recover'],
  [B('option-result'), 'Error field', 'msg', 'kind'],
  // ownership handles
  [B('handles'), 'handle method', 'downgrade', 'upgrade', 'is_expired', 'join',
    'with_lock', 'send', 'receive', 'add_and_get', 'store', 'load', 'at'],
  // atomics
  [B('atomics'), 'MemoryOrder selector', 'relaxed', 'acquire', 'release', 'acq_rel', 'seq_cst'],
  [B('atomics'), 'Atomic method', 'exchange', 'fetch_add', 'fetch_sub', 'fetch_and',
    'fetch_or', 'fetch_xor', 'compare_exchange', 'wait', 'wait_timeout', 'notify_one',
    'notify_all', 'fence'],
  // simd / raw memory
  [B('simd'), 'SIMD family', 'Simd4f32', 'Simd4i32', 'Simd16u8', 'Simd2f64'],
  [B('simd'), 'RawPtr member', 'alloc', 'alloc_aligned', 'null', 'from_address',
    'read_volatile', 'write_volatile', 'offset', 'address', 'element_size', 'element_align',
    'copy_from', 'fill_zero', 'free'],
  [B('simd'), 'Slice member', 'from_raw', 'subslice', 'as_ptr'],
  [B('simd'), 'SIMD op', 'splat', 'of', 'lane', 'with_lane', 'lane_count', 'select',
    'any_true', 'all_true', 'product'],
  // C-interop builtins live on the FFI / unsafe guide pages
  ['guide/ffi', 'C callback builtin', 'CFunctionPtr', 'StoredCallback', 'create',
    'function', 'function_pointer', 'context'],
  ['guide/unsafe', 'scoped pointer', 'with_local'],
  // prelude functions
  [B('functions'), 'prelude function', 'panic', 'size_of', 'align_of', 'offset_of'],
  [B('functions'), 'print function', 'println', 'print', 'eprintln', 'eprint'],
  // native modules typed in the checker (no C++ ABI row)
  [S('thread'), 'std.thread function', 'spawn'],
  [S('target'), 'std.target function', 'triple', 'arch', 'os', 'env', 'object_format',
    'endian', 'pointer_bits', 'pointer_size', 'stack_align', 'max_simd_bits'],
  [S('cpu-intrinsic'), 'std.cpu function', 'has', 'has_name', 'CpuFeature'],
  [S('cpu-intrinsic'), 'std.intrinsic function', 'popcount', 'leading_zeros',
    'trailing_zeros', 'bswap16', 'bswap32', 'bswap64', 'rotate_left', 'rotate_right',
    'sqrt', 'sqrt32', 'fma', 'fma32', 'prefetch', 'spin_hint', 'crc32c'],
  [S('asm'), 'std.asm function', 'value', 'run'],
];

export function buildInventory() {
  const entries = [];
  const add = (group, name, page, kind, token) =>
    entries.push({ group, name, token: token ?? name, page, kind });

  // 1. stdlib source packages
  for (const pkg of extractStdlib()) {
    const page = STDLIB_PAGES[pkg.importPath];
    if (!page) continue; // unknown/internal package
    for (const fn of pkg.functions) add(pkg.importPath, fn, page, 'function');
    for (const t of pkg.types) {
      add(pkg.importPath, t.name, page, t.kind);
      // `init`/`deinit` are the constructor and destructor bodies, documented
      // through `new Class(...)` and automatic teardown, not as named methods.
      for (const m of t.methods) {
        if (m === 'init' || m === 'deinit') continue;
        add(pkg.importPath, `${t.name}.${m}`, page, 'method', m);
      }
      for (const s of t.statics) add(pkg.importPath, `${t.name}.${s}`, page, 'static', s);
      for (const f of t.fields) add(pkg.importPath, `${t.name}.${f}`, page, 'field', f);
      for (const v of t.variants) add(pkg.importPath, `${t.name}.${v}`, page, 'variant', v);
    }
  }

  // 2. builtin C++ ABI tables
  const abi = extractBuiltinAbi();
  for (const m of abi.methods)
    add(`builtin ${m.recv}`, `${m.recv}.${m.name}`, ABI_METHOD_PAGE[m.recv], 'method', m.name);
  for (const s of abi.statics)
    add(`builtin ${s.cls}`, `${s.cls}.${s.name}`, ABI_STATIC_PAGE[s.cls], 'static', s.name);
  for (const f of abi.fns) {
    if (INTERNAL_MODULES.has(f.module)) continue;
    const page = ABI_FN_PAGE[f.module];
    if (page) add(f.module, `${f.module}.${f.name}`, page, 'function', f.name);
  }

  // 3. builtin TYPES straight from resolve.b's builtin_type() registry, so a
  // new builtin type cannot be added to the compiler without a doc home.
  for (const name of extractBuiltinTypeNames()) {
    const page = TYPE_PAGE[name];
    if (!page) {
      throw new Error(
        `builtin type "${name}" from resolve.b has no documentation page in ` +
          `TYPE_PAGE (scripts/lib/inventory.mjs). Add a mapping and document it.`,
      );
    }
    add('builtin type', name, page, 'type');
  }

  // 4. curated members, selectors, and native module functions
  for (const [page, group, ...names] of CURATED) {
    for (const name of names) add(group, name, page, 'symbol');
  }

  // De-duplicate identical (name, page) pairs that both sources can produce.
  const seen = new Set();
  return entries.filter((e) => {
    const key = `${e.name}::${e.page}::${e.token}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
