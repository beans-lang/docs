---
title: Numbers and decimal
description: How number literals, types, casts, and wrapping work in Beans, plus the exact base-10 decimal type.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 2 types · 2 instance methods · 5 enum variants.
<!-- coverage:summary:end -->

This page covers the rules for numbers in Beans: how a literal picks its type, how
to convert between number types, and how the exact `decimal` type works. For the
full list of number types, see [Primitive types](/reference/builtins/primitives/).

## How a literal picks its type

A number literal takes the type the spot demands. If the spot wants a `decimal`,
the literal is a `decimal`. If the spot wants a `float`, it is a `float`.

```beans
let p: decimal = 19.99
let f: f64 = 19.99
```

There are no numeric suffixes. You never write `19.99f` or `5i32`.

When nothing demands a type:

- a whole-number literal (no decimal point) is `int`,
- a literal with a decimal point is `f64`.

An integer literal must fit the type the spot demands. If it does not, the checker
rejects it.

## Writing literals

Number literals may use `_` as a separator for readability, and may be written in
hex or binary:

```beans
let big: int = 1_000_000
let mask: int = 0xFF
let bits: int = 0b1010
```

## No implicit conversions

Beans never converts between number types on its own. You must ask, with the `as`
operator:

```beans
let price: decimal = 4.50
let qty: int = 3
let total: decimal = price * (qty as decimal)
```

See [operators](/guide/operators/) for more on `as`.

## Integer arithmetic and wrapping

Fixed-width integers wrap to their width. This applies to `+ - *`, unary `-`, and
the bit operations. For example, adding past the top of a `u8` wraps around to the
bottom.

- Shift counts are masked by `width - 1`. Shifting a 32-bit value by 32 is the
  same as shifting by 0.
- Dividing or taking the modulo by zero panics.

## Integer casts

When you cast between integer types with `as`:

- The result keeps the low bits that fit the target width.
- Widening a signed value sign-extends (keeps the sign).
- Widening an unsigned value zero-extends (fills with zeros).

## Float rules

- `f32` is a real 32-bit value. It rounds after every literal, cast, and
  arithmetic operation.
- Float comparisons follow IEEE-754. `NaN` makes `==`, `<`, `<=`, `>`, and `>=`
  return `false`, and makes `!=` return `true`.
- Casting `NaN` or infinity to `decimal` panics with `"decimal overflow"`.

## decimal

`decimal` is a base-10 exact number. It does not have the rounding errors that
binary floats have:

```beans
let sum: decimal = 0.1 + 0.2
// sum == 0.3 is always true
```

It suits values where a binary-float rounding error would be wrong, such as money.
A `decimal` value does not carry a currency or a scale, though, so it cannot round
for you. When you need a fixed number of places, you call `round` and pick the
mode that fits your domain.

The `1.0` contract keeps 38 significant digits. Going past that panics with
`"decimal overflow"`. Division produces up to 38 significant digits and rounds the
last digit half-even.

### decimal methods

`round(places, mode = RoundingMode.half_even)` rounds to a number of decimal
places. The mode is optional and defaults to half-even.

```beans
let x: decimal = 2.675
let y: decimal = x.round(2, RoundingMode.half_even)
```

`RoundingMode` has exactly five selectors, and the right one depends on your rule,
not on the value:

- `RoundingMode.half_even`: round half to the nearest even digit
- `RoundingMode.half_away`: round half away from zero
- `RoundingMode.toward_zero`: drop the extra digits
- `RoundingMode.floor`: round toward negative infinity
- `RoundingMode.ceil`: round toward positive infinity

`abs()` returns the value without its sign.

## Parsing from text

You can turn a `string` into a number. Each returns a `Result` because the text
may not be a valid number:

```beans
let n: Result<int> = "42".to_int()
let f: Result<float> = "3.14".to_float()
let d: Result<decimal> = "19.99".to_decimal()
```

See [string](/reference/builtins/string/) for these and other string methods, and
[Option, Result, and Error](/reference/builtins/option-result/) for how to handle
the `Result`.

## See also

- [Primitive types](/reference/builtins/primitives/)
- [operators](/guide/operators/), including `as`.
