---
title: Attributes and modifiers
description: The declaration modifiers Beans has, covering pub, extern "C", packed, align(N), opaque, feature, unique, move, and inout. Beans has no @-style attributes.
---

Beans has **no `@`-style attributes**. Instead it has a small set of
**declaration modifiers**: words that sit before a declaration and change how it
is treated. This page lists them all.

## Visibility

- **`pub`** makes a declaration or field public outside its package. Everything
  is private by default. See [Source files and modules](/guide/modules/).

## C interop

- **`extern "C"`** declares a C-ABI entity: a struct, union, function, global,
  or thread-local. See [Foreign function interface](/guide/ffi/).
- **`opaque`** goes with `extern "C" opaque struct Handle` to declare an
  incomplete C type, valid only behind `RawPtr`.

## Layout modifiers

Two modifiers apply **only** to `extern "C"` structs and unions. A modifier that
moves bytes only means something against a fixed C layout, which is what
`extern "C"` promises:

- **`packed`** removes every byte of padding between fields.
- **`align(N)`** raises a record's alignment, or one field's. `N` must be a
  power of two, no larger than the target's maximum (4096).

```beans
pub extern "C" packed struct Header { kind: u8  length: u32  checksum: u32 }
extern "C" align(64) struct Counter { hits: u32 }
extern "C" struct Slot { tag: u8  align(16) payload: u64 }
```

Rules:

- Both names are contextual: `packed` only before `struct`/`union`, and `align`
  only when followed by `(`. A field or variable may still be named `packed` or
  `align`.
- `align(N)` on a field can only **raise** its alignment. A field `align(N)`
  inside a `packed` record is rejected, rather than letting one silently win over
  the other.
- Classes, interfaces, enums, and functions reject both by name.
- Semantics are C's, checked against Clang for every supported target.

## CPU features

- **`feature "name" fn`** marks a function body as allowed to use that CPU
  feature's instructions. Calling it, or storing it as a function value,
  requires the feature to be known present. See
  [Compile-time features](/guide/compile-time/).

```beans
feature "aes" fn mix_fast(seed: int) -> int { /* ... */ }
```

## Ownership

- **`unique`** goes with `unique class` to make a type a move-only outer handle.
  See [Variables and constants](/guide/variables/).
- **`move`** is a parameter mode that takes ownership of an argument. It is also
  the expression `move name`, which moves a value out of a binding.
- **`inout`** is a parameter mode that aliases a mutable caller local for the
  call. The caller writes `inout` at the call site and the argument must be a
  `var`.

## async

- **`async`** before `fn` declares an async function.
- **`await`** inside an async body waits on an async call.

Both are contextual and stay usable as ordinary identifiers elsewhere. See
[Async and await](/guide/async/).

## Modifier order

The standard order places visibility first, then the kind modifiers:
`pub unique class`, `pub extern "C" struct`. The C interop modifiers and layout
modifiers stack in the same chain: `pub extern "C" packed struct`.

These modifiers are the whole set; there is no way to add your own. The
[foreign function interface](/guide/ffi/) page shows `extern "C"` and `opaque`
in use, and [structs and unions](/guide/structs/) shows the layout modifiers on
real records.
