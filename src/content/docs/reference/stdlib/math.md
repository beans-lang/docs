---
title: std.math
description: Integer helpers, and the float and f32 maths — square root, exponential, sine and cosine, min, max, clamp and Euclidean remainder.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 25 package functions.
<!-- coverage:summary:end -->

`std.math` is the numeric helper package, written in Beans rather than bound to
a C library. Every float function has an `f32` twin with a `32` suffix that
works in single precision throughout rather than rounding a double at the end.
Read the source at
[`stdlib/std/math/math.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/math/math.b).

```beans
import std.math
```

```beans
pub fn clamp(value: int, low: int, high: int) -> int
pub fn gcd(a: int, b: int) -> int
```

- `clamp` forces `value` into the inclusive range `[low, high]`. It returns `low`
  if `value` is below `low`, `high` if it is above `high`, and `value` otherwise.
- `gcd` is the greatest common divisor, using Euclid's algorithm on the absolute
  values of `a` and `b`, so the signs of the inputs do not matter. `gcd(0, 0)` is
  `0`.

```beans
import std.io
import std.math

fn main() {
    io.println(math.clamp(15, 0, 10))   // 10
    io.println(math.clamp(-3, 0, 10))   // 0
    io.println(math.gcd(12, 18))        // 6
    io.println(math.gcd(0, 0))          // 0
}
```

## Float helpers

```beans
pub fn sqrt(value: float) -> float
pub fn hypot(x: float, y: float) -> float
pub fn exp(power: float) -> float
pub fn sin(radians: float) -> float
pub fn cos(radians: float) -> float
pub fn fmin(left: float, right: float) -> float
pub fn fmax(left: float, right: float) -> float
pub fn fclamp(value: float, low: float, high: float) -> float
pub fn rem_euclid(value: float, divisor: float) -> float
pub fn infinity() -> float
pub fn is_finite(value: float) -> bool
pub fn angle_limit() -> float
```

- `sqrt` is the hardware instruction, so it is correctly rounded. The wrapper
  exists so you need no `unsafe` block. `hypot` is the length of the vector
  `(x, y)` and does not overflow on the squares.
- `exp` raises `e` to `power`. `sin` and `cos` take radians.
- `fmin`, `fmax` and `fclamp` are the float versions of the integer helpers. A
  NaN is not ordered against anything, so a NaN argument to `fmin`/`fmax`
  answers whichever side the comparison falls through to — test with `is_nan`
  first when that matters.
- `rem_euclid` is the Euclidean remainder and is never negative. `%` is the
  truncated remainder and keeps the sign of the dividend, so wrapping an angle
  or a hue wants this one.
- `infinity` is positive infinity — negate it for the other one. `is_finite` is
  false for both infinities and for NaN.
- `angle_limit` is the largest `|radians|` that `sin` and `cos` can still reduce
  accurately (`1.0e15`). Past it a float carries fewer bits than a full turn
  needs, so any answer would be invented; they answer NaN there instead.

```beans
import std.io
import std.math

fn main() {
    io.println(math.sqrt(2.0))                  // 1.4142135623730951
    io.println(math.hypot(3.0, 4.0))            // 5
    io.println(math.fclamp(1.5, 0.0, 1.0))      // 1
    io.println(math.rem_euclid(-1.0, 3.0))      // 2
    io.println(math.is_finite(math.infinity())) // false
}
```

## f32 helpers

```beans
pub fn sqrt32(value: f32) -> f32
pub fn hypot32(x: f32, y: f32) -> f32
pub fn exp32(power: f32) -> f32
pub fn sin32(radians: f32) -> f32
pub fn cos32(radians: f32) -> f32
pub fn fmin32(left: f32, right: f32) -> f32
pub fn fmax32(left: f32, right: f32) -> f32
pub fn fclamp32(value: f32, low: f32, high: f32) -> f32
pub fn rem_euclid32(value: f32, divisor: f32) -> f32
pub fn infinity32() -> f32
pub fn is_finite32(value: f32) -> bool
```

Each is its `float` counterpart done in single precision from end to end, not a
`float` result rounded down at the last step. Use them when the values around
them are already `f32` — there are no implicit numeric conversions, so mixing
the two widths needs an explicit `as` either way.

## See also

- [Numbers and decimal](/reference/builtins/numbers/), the integer and float
  types and their own methods, including how floats order and compare.
