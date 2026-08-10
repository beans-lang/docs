---
title: string
description: The immutable UTF-8 string type in Beans and every method it has.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 28 instance methods.
<!-- coverage:summary:end -->

`string` is immutable UTF-8 text. Once you make a string, it never changes. A
method that "changes" a string really returns a new string.

Strings are byte-based. `len()` returns the number of bytes, not characters, and
this never changes. Indexes into a string are byte positions.

The string type is a native builtin, reached through the runtime ABI table at
[`compiler/beans/expression.b`](https://github.com/beans-lang/beans/blob/main/compiler/beans/expression.b).

## Making and joining strings

There is no `+` on strings. To build a string from parts, use interpolation:

```beans
let name: string = "beans"
let greeting: string = "hi {name}"
```

To join a `List<string>` with a separator, use `List.join`. See
[Collections](/reference/builtins/collections/).

## Size and emptiness

```beans
string.len() -> int
string.is_empty() -> bool
```

- `len()` is the number of bytes, not characters.
- `is_empty()` is true when `len()` is 0.

## Taking pieces

```beans
string.first(int) -> string
string.last(int) -> string
string.slice(int, int) -> string
string.byte_at(int) -> int
```

- `first(n)` returns the first `n` bytes; `last(n)` returns the last `n` bytes.
- `slice(from, to)` returns the half-open byte range `[from, to)`. It panics if
  the range is out of bounds.
- `byte_at(i)` returns the byte value at index `i`, and panics if `i` is out of
  range.

```beans
let s: string = "hello"
let h: string = s.first(1)
let lo: string = s.slice(3, 5)
```

## Searching

```beans
string.contains(string) -> bool
string.starts_with(string) -> bool
string.ends_with(string) -> bool
string.find(string) -> Option<int>
string.rfind(string) -> Option<int>
```

- `contains`, `starts_with`, and `ends_with` answer a yes/no question.
- `find` returns the byte index of the first match, `rfind` the last. Both return
  `none` when the needle is not present.
- For an empty needle, `find` returns `0` and `rfind` returns `len`.

```beans
match "hello".find("ll") {
    some(i) => io.println("found at {i}"),
    none => io.println("not found"),
}
```

## Cleaning and case

```beans
string.trim() -> string
string.trim_start() -> string
string.trim_end() -> string
string.to_upper() -> string
string.to_lower() -> string
```

- `trim` removes ASCII whitespace from both ends; `trim_start` and `trim_end`
  remove it from one end.
- `to_upper` and `to_lower` change ASCII letters only. Non-ASCII bytes are left
  as they are.

## Building new strings

```beans
string.replace(string, string) -> string
string.repeat(int) -> string
```

- `replace(old, new)` replaces every match of `old`. An empty `old` changes
  nothing.
- `repeat(n)` repeats the string `n` times, and panics on a negative `n`.

## Splitting

```beans
string.split(string) -> List<string>
string.lines() -> List<string>
```

- `split(sep)` splits on `sep` and keeps empty pieces. An empty `sep` returns the
  whole string as one piece.
- `lines()` splits the string into lines.

```beans
let parts: List<string> = "a,b,,c".split(",")
// ["a", "b", "", "c"]
```

## Parsing to numbers

```beans
string.to_int() -> Result<int>
string.to_float() -> Result<float>
string.to_decimal() -> Result<decimal>
```

Each returns a `Result` because the text may not be a number. See
[Option, Result, and Error](/reference/builtins/option-result/).

## Characters (UTF-8)

`len()` counts bytes. These two methods work with whole UTF-8 characters.

```beans
string.chars() -> List<string>
string.count_chars(int, int) -> int
```

- `chars()` returns each UTF-8 character as its own one-character string.
- `count_chars(from, to)` returns the number of characters in the byte range
  `[from, to)`.

## Low-level helpers

These work directly on bytes and use plain return values, not `Option`.

```beans
string.find_byte(int, int) -> int
string.range_equals(int, int, string) -> bool
string.parse_int_range_or(int, int, int) -> int
```

- `find_byte(byte, from)` returns the index of `byte` at or after `from`, or `-1`
  when it is absent.
- `range_equals(from, to, other)` is true when the byte range `[from, to)` equals
  `other`.
- `parse_int_range_or(from, to, fallback)` parses the byte range as an int, or
  returns `fallback` when it is not a number.

## A short tour

<!-- beans:compile -->
```beans
import std.io

fn main() {
    let s: string = "  Beans Language  "
    let t: string = s.trim()
    io.println("{t.len()} bytes, empty {t.is_empty()}")
    io.println("{t.to_upper()} / {t.to_lower()}")
    io.println("{t.starts_with("Beans")} {t.contains("Lang")}")

    match t.find("Lang") {
        some(i) => io.println("Lang at byte {i}"),
        none => io.println("not found"),
    }

    let parts: List<string> = "a,b,,c".split(",")
    io.println("{parts.len()} parts, third is \"{parts[2]}\"")

    let n: int = "  42  ".trim().to_int().expect("a number")
    io.println("{n + 1}")
}
```

## See also

- [Bytes](/reference/builtins/bytes/), a changeable byte buffer.
- [Numbers and decimal](/reference/builtins/numbers/), the parse targets.
- [Collections](/reference/builtins/collections/), `List<string>` and `join`.
