---
title: std.fmt
description: Turn numbers into strings — hex, binary, grouped digits, padding, fixed decimals, and exact decimal formatting.
---

`std.fmt` turns numbers into text in the shapes you often need: hexadecimal,
binary, grouped digits, padded columns, and fixed decimal places. Some of it is
written in Beans at
[`stdlib/std/fmt/fmt.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/fmt/fmt.b);
the rest is native.

```beans
import std.fmt
```

## Base conversions (Beans source)

| Function | What it does |
| --- | --- |
| `hex(value: int) -> string` | lowercase hex of the 64-bit pattern, no `0x` prefix; `"0"` for zero |
| `binary(value: int) -> string` | base-2 text of the value |
| `group_digits(value: int, separator: string) -> string` | insert `separator` every three digits from the right |

`hex` works on the raw u64 bit pattern, so a negative int shows its two's
complement form. `group_digits` keeps a leading `-` for negative numbers.

```beans
import std.io
import std.fmt

fn main() {
    io.println(fmt.hex(255))                       // ff
    io.println(fmt.binary(6))                       // 110
    io.println(fmt.group_digits(1234567, ","))    // 1,234,567
    io.println(fmt.group_digits(-1000, ","))       // -1,000
}
```

## Padding (native)

| Function | What it does |
| --- | --- |
| `pad_left(s, width) -> string` | pad `s` with spaces on the left to `width` bytes |
| `pad_right(s, width) -> string` | pad `s` with spaces on the right to `width` bytes |

Padding is by byte width. If the input is already at least `width` bytes wide, it
is returned unchanged. A huge `width` panics.

```beans
import std.io
import std.fmt

fn main() {
    io.println(fmt.pad_left("7", 4))    // "   7"
    io.println(fmt.pad_right("7", 4))   // "7   "
}
```

## Decimals (native)

| Function | What it does |
| --- | --- |
| `float(x, places) -> string` | format a float with a fixed number of decimals; `places` from 0 to 100 |
| `decimal(d, places) -> string` | exact formatting of a `decimal`; `places` from 0 to 100 |

`float` gives a fixed number of decimal places. `decimal` is exact: when it needs
to show fewer places than the value has, it rounds half-even (banker's rounding);
when it needs more, it zero-pads. For example `fmt.decimal(19.995, 2)` is
`"20.00"`.

```beans
import std.io
import std.fmt

fn main() {
    io.println(fmt.float(3.14159, 2))     // 3.14
    io.println(fmt.decimal(19.995, 2))    // 20.00
}
```

See [Numbers and decimal](/reference/builtins/numbers/) for the `decimal` type
itself.

## Format specs in interpolation

String interpolation understands the same width and precision specs, so you often
do not need to call these functions at all. Inside `"{ ... }"`:

| Spec | Meaning |
| --- | --- |
| `{x:8}` | right-align `x` in a field 8 wide |
| `{x:-8}` | left-align `x` in a field 8 wide |
| `{pi:.2}` | two decimal places |
| `{pi:8.2}` | width 8 and two decimal places |

These render the same way as `pad_left` / `pad_right` and `float` above.

```beans
import std.io

fn main() {
    let pi: float = 3.14159
    io.println("[{pi:8.2}]")   // [    3.14]
}
```
