---
title: std.fmt
description: Turn numbers into strings, hex, binary, grouped digits, padding, fixed decimals, and exact decimal formatting.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 7 package functions · 1 type · 1 constructor · 11 instance methods.
<!-- coverage:summary:end -->

`std.fmt` turns numbers into text in the shapes you often need: hexadecimal,
binary, grouped digits, padded columns, and fixed decimal places. Three functions
are written in Beans at
[`stdlib/std/fmt/fmt.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/fmt/fmt.b);
the other four are native and typed in the compiler, so their parameters are
positional and carry no names.

```beans
import std.fmt
```

## Base conversions (Beans source)

```beans
pub fn hex(value: int) -> string
pub fn binary(value: int) -> string
pub fn group_digits(value: int, separator: string) -> string
```

- `hex` gives lowercase hex of the 64-bit pattern, with no `0x` prefix, and `"0"`
  for zero. It works on the raw u64 bit pattern, so a negative int shows its two's
  complement form.
- `binary` gives the base-2 text of the value.
- `group_digits` inserts `separator` every three digits from the right, and keeps
  a leading `-` for negative numbers.

<!-- beans:compile -->
```beans
import std.io
import std.fmt

fn main() {
    io.println(fmt.hex(255))                        // ff
    io.println(fmt.binary(6))                       // 110
    io.println(fmt.group_digits(1234567, ","))     // 1,234,567
    io.println(fmt.group_digits(-1000, ","))       // -1,000
}
```

## Padding (native)

```beans
pad_left(string, int) -> string
pad_right(string, int) -> string
```

The second argument is the target width. `pad_left(s, width)` pads `s` with
spaces on the left; `pad_right(s, width)` pads on the right. Padding is by byte
width. If the input is already at least `width` bytes wide, it is returned
unchanged. A huge `width` panics.

<!-- beans:compile -->
```beans
import std.io
import std.fmt

fn main() {
    io.println(fmt.pad_left("7", 4))    // "   7"
    io.println(fmt.pad_right("7", 4))   // "7   "
}
```

## Decimals (native)

```beans
float(float, int) -> string
decimal(decimal, int) -> string
```

The second argument is the number of decimal places, from 0 to 100. `float` gives
a fixed number of decimal places. `decimal` is exact: when it needs to show fewer
places than the value has, it rounds half-even (banker's rounding); when it needs
more, it zero-pads. For example `fmt.decimal(19.995, 2)` is `"20.00"`.

<!-- beans:compile -->
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

## StringBuilder

Interpolation renders one value. A builder accumulates a stream of them into one
buffer, which is the difference between O(n) and O(n²) when you are building a
string in a loop: `text = "{text}piece"` copies everything written so far on
every turn, while a builder appends and converts once.

```beans
new StringBuilder(capacity: int = 0)

pub fn push(text: string)
pub fn push_line(text: string)
pub fn push_int(value: int)
pub fn push_bool(value: bool)
pub fn push_byte(value: int)
pub fn len() -> int
pub fn is_empty() -> bool
pub fn reserve(capacity: int)
pub fn clear()
pub fn to_string() -> string
pub fn to_bytes() -> Bytes
```

- `push` appends text. `push_line` appends it followed by a newline.
  `push_int`, `push_bool` and `push_byte` append a value without going through
  interpolation first — `push_byte` writes one raw byte.
- `len` is the number of bytes accumulated so far, not characters, and
  `is_empty` is `len() == 0`. `reserve` grows the buffer up front when you know
  roughly how much is coming; `clear` empties it and keeps the capacity, so one
  builder can be reused across rounds.
- `to_string` converts once at the end. `to_bytes` hands back the raw buffer
  instead, for a caller that wants bytes.

The buffer holds bytes and nothing here validates UTF-8, exactly as `Bytes`
does not. Anything already rendered — by interpolation, or by `fmt.float`,
`fmt.decimal` or `fmt.pad_left` above — goes in with `push`.

<!-- beans:compile -->
```beans
import std.io
import std.fmt

fn main() {
    var out: fmt.StringBuilder = new fmt.StringBuilder(64)
    var index: int = 0
    for index < 3 {
        out.push("row ")
        out.push_int(index)
        out.push_line("")
        index += 1
    }
    io.print(out.to_string())
    io.println(out.len())        // 18
    out.clear()
    io.println(out.is_empty())   // true
}
```

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

<!-- beans:compile -->
```beans
import std.io

fn main() {
    let pi: float = 3.14159
    io.println("[{pi:8.2}]")   // [    3.14]
}
```
