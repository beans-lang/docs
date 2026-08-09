---
title: std.math
description: Small integer helpers — clamp a value into a range, and greatest common divisor.
---

`std.math` is a small package of integer helpers written in Beans. Read the
source at
[`stdlib/std/math/math.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/math/math.b).

```beans
import std.math
```

| Function | What it does |
| --- | --- |
| `clamp(value: int, low: int, high: int) -> int` | force `value` into the range `[low, high]` |
| `gcd(a: int, b: int) -> int` | greatest common divisor |

`clamp` returns `low` if `value` is below `low`, `high` if it is above `high`,
and `value` otherwise.

`gcd` uses Euclid's algorithm on the absolute values of `a` and `b`, so the signs
of the inputs do not matter. `gcd(0, 0)` is `0`.

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

## See also

- [Numbers and decimal](/reference/builtins/numbers/) — the integer and float
  types and their own methods.
