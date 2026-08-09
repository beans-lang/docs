---
title: Structs and unions
description: Inline value types in Beans — plain structs, extern "C" structs and unions, and how they differ from classes.
---

A `struct` is an **inline value type**. It copies by value and is passed and
returned as a plain aggregate, with no reference-count header and no heap
allocation.

```beans
struct Point {
    x: int
    y: int
}

let p: Point = Point { x: 3, y: 4 }   // named field literal
```

- Structs use named field literals (`Point { x: 3, y: 4 }`), unlike classes,
  which construct only with `new`.
- Fields are private unless marked `pub`, as with classes.
- A field can be changed only through a `var` local.
- An ordinary struct can own ARC values — strings, classes, collections,
  Options and Results, other structs — and the compiler retains and drops those
  fields recursively through copies, arrays, and storage.
- A directly recursive value edge is rejected (it has no finite size); use
  `RawPtr` or `Box` for that edge.
- An ordinary struct that satisfies `Eq` and `Hash` can be a `Map` key.

## extern "C" structs

`extern "C" struct` fixes the field order and uses the target's C size and
alignment rules, so the layout matches a C `struct` exactly. That makes it safe
to read and write through a `RawPtr` or `Slice` over native memory.

```beans
extern "C" struct Packet {
    tag: u8
    count: u32
    ratio: f32
}
```

An `extern "C"` struct is restricted to inline scalars, `RawPtr`, fixed arrays,
and nested C-layout structs, so its C ABI carries no hidden ownership. These
records may be passed and returned by value across an `extern "C"` boundary.

Two contextual modifiers apply only to `extern "C"` records:

- `packed` removes all padding between fields.
- `align(N)` raises a record's — or one field's — alignment (`N` a power of two).

```beans
pub extern "C" packed struct Header { kind: u8  length: u32  checksum: u32 }
extern "C" align(64) struct Counter { hits: u32 }
extern "C" struct Slot { tag: u8  align(16) payload: u64 }
```

See [Attributes and modifiers](/guide/attributes/) for the exact rules.

## extern "C" unions

`extern "C" union` declares overlapping storage. It must be initialized with
exactly one named field, and initialization, reads, and writes require `unsafe`,
because Beans does not track which member is active:

```beans
extern "C" union Word {
    bits: u32
    number: f32
}
```

All fields start at offset zero with C size and alignment. Union values copy,
pass, return, and round-trip through `RawPtr` inline.

## opaque structs

`extern "C" opaque struct Handle` declares an incomplete C type. It is valid
only behind `RawPtr`; allocation, field access, embedding, and layout queries
are rejected. This is how you bind a C type whose layout you never see.

## struct vs class

| | `struct` | `class` |
|---|---|---|
| identity | value (copied) | reference (shared) |
| allocation | inline, no header | heap, 16-byte ARC header |
| construction | field literal | `new Class(...)` |
| methods, inheritance | not yet | yes |
| C layout | with `extern "C"` | never |

## Next

- [Unsafe and raw memory](/guide/unsafe/)
- [Foreign function interface](/guide/ffi/)
- [Compile-time features](/guide/compile-time/)

Source: [`spec/SYNTAX.md`](https://github.com/beans-lang/beans/blob/main/spec/SYNTAX.md).
