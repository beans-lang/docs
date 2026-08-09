---
title: Documentation coverage
description: How the Beans docs prove they cover every public builtin and standard-library symbol.
---

These docs come with an automated check that they stay complete. It fails the
build when a public symbol is undocumented, a link is broken, or an example that
should compile does not.

## What is checked

Run all three checks with `npm run check` (or individually):

| Command | What it verifies |
|---|---|
| `npm run coverage` | Every public builtin and standard-library symbol is documented on its mapped page. |
| `npm run links` | Every internal link in the docs resolves to a real page, and no link hard-codes the `/beans` base path. |
| `npm run examples` | Every example program in the Beans repo type-checks, and every marked documentation code block compiles (or fails, when marked as an intentional error). |

## Where the inventory comes from

Most of the inventory is built **from source**, so it cannot drift from the
compiler:

- **Builtin type names** — parsed from `builtin_type()` in
  [`compiler/beans/resolve.b`](https://github.com/beans-lang/beans/blob/main/compiler/beans/resolve.b),
  the compiler's single authority for what names are builtin types. Every name
  there must map to a documentation page, so a new builtin type cannot be added
  to the compiler without a doc home.
- **Standard library** — parsed from the Beans source packages under
  [`stdlib/std/`](https://github.com/beans-lang/beans/tree/main/stdlib/std). A
  symbol counts as public when its declaration carries `pub`.
- **Builtins (runtime ABI)** — the method, static, and free-function tables
  (`builtin_methods`, `builtin_statics`, `builtin_constructors`, `builtin_fns`)
  live in `compiler/bootstrap/builtins.cpp`. The C++ bootstrap is a **private
  submodule**, so a committed snapshot at
  [`data/builtin-abi.json`](https://github.com/beans-lang/website/blob/main/data/builtin-abi.json)
  mirrors it and the check parses the live source when it is present.
- **Builtins (checker-typed members)** — the methods, memory-order and
  rounding-mode selectors, and SIMD operations that have no C++ ABI row are a
  curated list, typed in
  [`compiler/beans/expression.b`](https://github.com/beans-lang/beans/blob/main/compiler/beans/expression.b).

:::note[What the check does and does not prove]
Coverage verifies that each inventory symbol's name appears on its mapped page —
so a symbol cannot be silently left out — and that every documentation program
compiles. It does **not** verify that each signature or description is correct;
that is what human review and the compiling examples are for.
:::

The generated symbol → page table lives in
[`docs-coverage.md`](https://github.com/beans-lang/website/blob/main/docs-coverage.md)
at the website root, regenerated every time `npm run coverage` runs.

## What is deliberately excluded

- The low-level primitive modules `std.proc`, `std.sock`, `std.sig`, `std.dl`,
  and `std.ready`. The language contract states these are internal plumbing, not
  the public API — you use their Beans-source wrappers
  ([`std.process`](/reference/stdlib/process/), [`std.net`](/reference/stdlib/net/),
  [`std.signal`](/reference/stdlib/signal/), [`std.dylib`](/reference/stdlib/dylib/),
  [`std.poll`](/reference/stdlib/poll/)) instead.
- The compiler-internal `std.async$rt` package, whose directory name cannot be
  written in source.
- `init` and `deinit`, which are the constructor and destructor bodies —
  documented through `new Class(...)` and automatic teardown, not as named
  methods.

## Marking documentation examples

A Beans code block in these docs can be checked by the example runner. Put a
marker on the line directly before the fence:

```text
<!-- beans:compile -->        the block that follows must type-check cleanly
<!-- beans:expect-error -->   the block that follows must fail to type-check
```

Unmarked blocks are treated as fragments and skipped. See
[Hello world](/start/hello-world/) for one of each.

## Reference index

- [Builtin reference](/reference/builtins/) — every builtin type, method,
  operator, selector, and prelude function.
- [Standard library reference](/reference/stdlib/) — every public package,
  type, function, and method.
