---
title: 'Structs and unions'
description: 'Inline value types in Beans: generic structs, methods, mutation, extern "C" records, and how structs differ from classes.'
---

A `struct` is an **inline value type**. It copies by value and is passed and
returned as a plain aggregate, with no reference-count header and no heap
allocation.

```beans
struct Point<T> {
    value: T
    moves: int = 0

    priv inout fn add_move() {
        self.moves += 1
    }

    fn current() -> T {
        return self.value
    }

    inout fn moved() {
        self.add_move()
    }
}

var p: Point<int> = Point { value: 3 }
p.moved()
```

- Structs use named field literals (`Point { x: 3, y: 4 }`), unlike classes,
  which construct only with `new`.
- An unmarked field is visible in its package. `pub` exposes it to every
  package. `priv` limits it to the declaring struct, even inside the same
  package.
- A field can be changed only through a `var` local.
- A normal method gets read-only `self`. Mark the method `inout fn` when it
  needs to change fields; call it on a `var` local.
- `priv` works on normal, static, and `inout` methods. It limits the method to
  code inside the exact declaring struct, including against same-package peers.
- A static method has no `self` and can be used as a named factory.
- A generic struct gets a separate inline layout for each concrete type.
- An ordinary struct can own ARC values (strings, classes, collections, Options
  and Results, other structs), and the compiler retains and drops those fields
  recursively through copies, arrays, and storage.
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
- `align(N)` raises the alignment of a record, or of one field, to `N` (a power
  of two).

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
| methods | read-only, `inout`, and static | instance and static |
| inheritance | no | one base class, many interfaces |
| C layout | with `extern "C"` | never |

Use a struct when copying the whole value is its meaning. Use a class when
objects need shared identity, inheritance, or reference-counted lifetime.

## Methods and mutation

A normal struct method may read `self`, but cannot change it. An `inout fn`
method may change fields and must be called on a mutable local:

```beans
struct Point {
    x: int
    y: int

    fn total() -> int {
        return self.sum()
    }

    priv fn sum() -> int {
        return self.x + self.y
    }

    inout fn translate(dx: int, dy: int) {
        self.move_by(dx, dy)
    }

    priv inout fn move_by(dx: int, dy: int) {
        self.x += dx
        self.y += dy
    }

    static fn origin() -> Point {
        return Point { x: 0, y: 0 }
    }
}

var point: Point = Point.origin()
point.translate(3, 4)
```

Calling `translate` on a `let`, a temporary field literal, or a non-local value
is an error. Structs use field literals, so they do not have `init` or `deinit`.

## Generic structs

Type parameters work on structs as they do on classes and functions:

```beans
struct Cell<T> {
    value: T
    previous: Option<T> = none

    fn current() -> T {
        return self.value
    }
}

let number: Cell<int> = Cell { value: 7 }
let word: Cell<string> = Cell { value: "beans" }
```

The declared type supplies the type argument for the field literal. `Cell<int>`
and `Cell<string>` have separate compiled layouts and method copies.

## A complete example

```beans
import std.io

struct Point {
    x: int
    y: int

    fn total() -> int {
        return self.x + self.y
    }

    inout fn shift(dx: int) {
        self.x += dx
    }
}

fn main() {
    var point: Point = Point { x: 3, y: 4 }
    io.println("{point.x},{point.y}: {point.total()}")
    point.shift(10)
    io.println("{point.x},{point.y}: {point.total()}")
}
```

The value still lives inline. `inout fn` changes that local value in place; a
normal pass or return still copies it.
