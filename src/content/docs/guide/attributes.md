---
title: Attributes and modifiers
description: The declaration modifiers Beans has — pub, extern "C", packed, align(N), opaque, feature, unique, move, and inout. Beans has no @-style attributes.
---

Beans has **no `@`-style attributes**. Instead it has a small set of
**declaration modifiers** — words that sit before a declaration and change how
it is treated. This page lists them all.

## Visibility

- **`pub`** — makes a declaration or field public outside its package.
  Everything is private by default. See [Source files and
  modules](/guide/modules/).

## C interop

- **`extern "C"`** — declares a C-ABI entity: a struct, union, function,
  global, or thread-local. See [Foreign function interface](/guide/ffi/).
- **`opaque`** — `extern "C" opaque struct Handle` declares an incomplete C
  type, valid only behind `RawPtr`.

## Layout modifiers

Two modifiers apply **only** to `extern "C"` structs and unions — a modifier
that moves bytes only means something against a fixed C layout:

- **`packed`** — removes every byte of padding between fields.
- **`align(N)`** — raises a record's alignment, or one field's. `N` must be a
  power of two, no larger than the target's maximum (4096).

```beans
pub extern "C" packed struct Header { kind: u8  length: u32  checksum: u32 }
extern "C" align(64) struct Counter { hits: u32 }
extern "C" struct Slot { tag: u8  align(16) payload: u64 }
```

Rules:

- Both names are contextual: `packed` only before `struct`/`union`, `align` only
  when followed by `(`. A field or variable may still be named `packed` or
  `align`.
- `align(N)` on a field can only **raise** its alignment. A field `align(N)`
  inside a `packed` record is rejected — one cannot silently win over the other.
- Classes, interfaces, enums, and functions reject both by name.
- Semantics are C's, checked against Clang for every supported target.

## CPU features

- **`feature "name" fn`** — marks a function body as allowed to use that CPU
  feature's instructions. Calling it requires the feature to be known present.
  See [Compile-time features](/guide/compile-time/).

```beans
feature "aes" fn mix_fast(seed: int) -> int { /* ... */ }
```

## Ownership

- **`unique`** — `unique class` makes a type a move-only outer handle. See
  [Variables and constants](/guide/variables/).
- **`move`** — a parameter mode that takes ownership of an argument; also the
  expression `move name` that moves a value out of a binding.
- **`inout`** — a parameter mode that aliases a mutable caller local for the
  call.

## async

- **`async`** — before `fn`, declares an async function.
- **`await`** — inside an async body, waits on an async call.

Both are contextual and stay usable as ordinary identifiers elsewhere. See
[Async and await](/guide/async/).

## Modifier order

The standard order places visibility first, then the kind modifiers:
`pub unique class`, `pub extern "C" struct`.

## Next

- [Foreign function interface](/guide/ffi/)
- [Compile-time features](/guide/compile-time/)
- [Structs and unions](/guide/structs/)

Source: [`compiler/beans/parser.b`](https://github.com/beans-lang/beans/blob/main/compiler/beans/parser.b) and [`spec/SYNTAX.md`](https://github.com/beans-lang/beans/blob/main/spec/SYNTAX.md).
