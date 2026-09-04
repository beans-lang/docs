---
title: 'Enums'
description: 'User-defined enums in Beans: variants, payloads, methods, and matching.'
---

An enum is a type with a fixed set of named **variants**. Variant names are
snake_case, and a variant may carry a payload. Enums are built for
[`match`](/guide/pattern-matching/).

```beans
enum Status {
    active
    suspended
    closed
}
```

## Payloads

A variant can carry named fields:

```beans
enum Payment {
    cash
    card(number: string)
    transfer(iban: string, amount: decimal)
}

fn describe(p: Payment) -> string {
    return match p {
        cash => "cash",
        card(n) => "card ending {n.last(4)}",
        transfer(iban, amt) => "sent {amt} to {iban}",
    }
}
```

Construct a variant with the enum name in front: `Payment.card("4242")`, or
`Payment.cash` for a variant with no payload. Matching, by contrast, uses the
bare variant name. It binds the payload fields positionally (`card(n)`), and the
matched value pins their types, so you do not restate them.

## Methods

An enum can carry methods, with an implicit `self`, and static methods called on
the enum name:

```beans
enum Level {
    low
    high

    static fn default_level() -> Level {
        return Level.low
    }

    fn label() -> string {
        return match self {
            low => "low",
            high => "high",
        }
    }
}
```

## An enum is a tag, not an object

Methods do not make an enum an object. An enum **value** is its variant tag —
there is no heap allocation behind it and no descriptor word in it. Dynamic
dispatch works by reading a descriptor out of an object's first word, so an enum
has nothing to read, and the checker says so at the declaration:

<!-- beans:expect-error -->
```beans
interface Shows {
    fn show_it() -> string
}

enum Colour implements Shows {
    red
    green

    fn show_it() -> string {
        return "colour"
    }
}
```

```
error: enum 'Colour' cannot implement 'main.Shows' — an interface value is an
object with a descriptor and an enum value is a tag, so only a class can
implement one
```

`extends` is refused the same way, because an enum has no base type at all:

<!-- beans:expect-error -->
```beans
class Base {
    fn init() {}
}

enum Colour extends Base {
    red
    green
}
```

```
error: enum 'Colour' cannot extend 'main.Base' — enums have no base type
```

This is not a gap to work around: no value type is ever boxed into an interface
value in Beans. `let x: Eq = 5` is refused, a [struct](/guide/structs/) naming a
relation is refused, and `enum(u8)` below is committed to a bare one-byte tag
with no room for a pointer. When you want one name to cover several shapes,
[use a class](/guide/interfaces/); when you want one closed set of cases with
behaviour attached, a method plus `match` — the `Level.label` above — is the
enum's answer.

What you keep without asking: an enum satisfies the `Clone`, `Eq` and `Hash`
bounds and works as a `Map` key, none of which it has to name.

```beans
import std.io

enum Suit {
    clubs
    hearts
}

fn tally<K implements Eq & Hash>(keys: List<K>) -> int {
    var seen: Map<K, int> = {}
    for k: K in keys {
        seen[k] = 1
    }
    return seen.len()
}

fn main() {
    io.println("{tally([Suit.clubs, Suit.hearts, Suit.clubs])}")
    io.println("{Suit.clubs == Suit.hearts}")
}
```

An enum does **not** satisfy `Order`, so `sort`, `max` and `min` do not reach it
and `a < b` on two enum values is refused.

## Fixed representation: `enum(u8)`

A payload-free enum can commit to a one-byte layout on the declaration:

```beans
enum(u8) Display {
    flex
    grid
    hidden
}
```

The value is then the bare `u8` tag, variants numbered in declaration order —
the same numbers an ordinary enum already uses, so nothing about behaviour
changes. Matching, equality, printing, methods, map keys, and reflection all
work exactly as they do without the marker.

What changes is layout. `size_of` answers 1, `align_of` answers 1, a struct
holding one keeps a fixed inline layout with no pointer bits and no reference
counting, and a `[Display; N]` array stores one byte per element:

```beans
import std.io

enum(u8) Display {
    flex
    grid
    hidden
}

fn main() {
    io.println("{size_of(Display)} {align_of(Display)} {size_of([Display; 4])}")
}
```

```
1 1 4
```

Reach for it when the layout is the point — a field in a large array, or a
compact record you keep many of. An ordinary enum is the default otherwise.

The checker refuses the marker, naming the rule, on:

- an enum with any payload variant,
- a generic enum,
- more than 256 variants,
- any representation other than `u8`.

<!-- beans:expect-error -->
```beans
enum(u8) Payment {
    cash
    card(number: string)
}
```

```
error: enum(u8) needs every variant payload-free — variant 'card' carries a payload
```

An `enum(u8)` is still a distinct type, not an integer: there is no implicit
conversion in either direction. It is also still not a C ABI type, so an
`extern "C"` record field or typed JSON refuses it exactly as an ordinary enum
does. See [Compile-time layout](/guide/compile-time/).

## Option and Result are builtin enums

`Option<T>` and `Result<T, E>` are ordinary builtin enums:

```beans
enum Option<T> {
    some(value: T)
    none
}

enum Result<T, E> {
    ok(value: T)
    err(error: E)
}
```

That is why `some`, `none`, `ok`, and `err` are lowercase: they are variant
values, and variants are snake_case. See [Option and Result](/guide/errors/).

## A complete example

An enum with payloads and a method, matched to compute a value:

```beans
import std.io

enum Shape {
    circle(r: f64)
    rect(w: f64, h: f64)

    fn area() -> f64 {
        return match self {
            circle(r) => 3.14159 * r * r,
            rect(w, h) => w * h,
        }
    }
}

fn main() {
    let s: Shape = Shape.rect(3.0, 4.0)
    io.println("{s.area()}")
}
```

A `match` on an enum must cover every variant, or handle the rest with `_`. See
[Pattern matching](/guide/pattern-matching/).
