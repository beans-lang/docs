---
title: 'Types'
description: 'An overview of the Beans type system: primitives, the number rules, decimal, and collections, with links to the full reference.'
---

Beans is statically typed with **no inference**: every binding, parameter, and
field states its type. This page is a teaching overview. For exhaustive
signatures see the [builtin reference](/reference/builtins/).

## Primitive types

All primitives are unboxed in generated code, and all of them have methods
(`(-5).abs()`, `3.7.round()`).

- Integers: `int` (64-bit signed), `i8 i16 i32 i64`, `uint` (64-bit unsigned),
  `u8 u16 u32 u64`, and `byte` (= `u8`).
- Floats: `float` (= `f64`), `f32 f64`.
- `decimal`: exact base-10 number, used for money (see below).
- `bool`, `string` (immutable UTF-8).

There is no `usize`/`isize`: `int` and `uint` are the word types. Full detail:
[Primitive types](/reference/builtins/primitives/).

## The number rules

Beans never converts numbers for you. The rules are short and strict:

- A literal takes the type the spot demands: `let p: decimal = 19.99` is a
  decimal; `let f: f64 = 19.99` is a float. No numeric suffixes.
- With no demand, an integer literal is `int` and a decimal-point literal is
  `f64`.
- **No implicit numeric conversions, ever.** Mix types with `as`:
  `price * (qty as decimal)`.
- An integer literal must fit the type the spot demands. The checker rejects a
  value outside that type's exact range.
- Fixed-width integer `+`, `-`, `*`, unary `-`, and bit operations wrap to that
  width. Divide or modulo by zero panics.

More: [Numbers and decimal](/reference/builtins/numbers/) and
[Operators and precedence](/guide/operators/).

## decimal

`decimal` is an exact base-10 number. `0.1 + 0.2` is `0.3`, with no rounding
error, which is why it is the type to use for every money value. Prefer it over
`float` for any amount of money.

```beans
let price: decimal = 19.99
let qty: int = 3
let total: decimal = price * (qty as decimal)   // 59.97, exactly
```

The 1.0 contract is 38 significant digits; going past it panics as `decimal
overflow`. Division produces up to 38 significant digits and rounds the last one
half-even. You can round explicitly at the call site, choosing the mode:
`total.round(2, RoundingMode.half_even)`.

## Collections

```beans
var xs: List<int> = [1, 2, 3]
var m: Map<string, int> = {"a": 1, "b": 2}
var ordered: OrderedMap<string, int> = {}
xs.push(4)
let got: Option<int> = m.get("a")     // no null, no panic
```

`List`, `Map`, and `OrderedMap` are generic and move-only. Bracket reads are
checked: `xs[i]` panics if the index is out of range, and `m[key]` panics if the
key is missing. Use `.get(...)`, which returns an `Option`, when absence is
expected. Full detail: [Collections](/reference/builtins/collections/).

## No null, no exceptions

Beans has no null and no exceptions. Absence is `Option<T>`; failure is
`Result<T>`. See [Option and Result](/guide/errors/).

## User-defined types

You build your own types with:

- [Classes](/guide/classes/): reference objects with methods, `init`/`deinit`,
  inheritance, and interfaces.
- [Structs and unions](/guide/structs/): inline value types, including C-layout
  records.
- [Enums](/guide/enums/): tagged variants, built for `match`.
- [Generics](/guide/generics/): type parameters with interface bounds.
