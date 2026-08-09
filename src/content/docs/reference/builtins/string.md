---
title: string
description: The immutable UTF-8 string type in Beans and every method it has.
---

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

| Method | Returns | Notes |
| --- | --- | --- |
| `len()` | `int` | number of bytes |
| `is_empty()` | `bool` | true when `len()` is 0 |

## Taking pieces

| Method | Returns | Notes |
| --- | --- | --- |
| `first(n)` | `string` | first `n` bytes |
| `last(n)` | `string` | last `n` bytes |
| `slice(from, to)` | `string` | half-open `[from, to)`; panics if out of range |
| `byte_at(i)` | `int` | byte value at index `i`; panics if out of range |

```beans
let s: string = "hello"
let h: string = s.first(1)
let lo: string = s.slice(3, 5)
```

## Searching

| Method | Returns | Notes |
| --- | --- | --- |
| `contains(s)` | `bool` | is `s` somewhere inside |
| `starts_with(s)` | `bool` | does it begin with `s` |
| `ends_with(s)` | `bool` | does it end with `s` |
| `find(s)` | `Option<int>` | byte index of first match |
| `rfind(s)` | `Option<int>` | byte index of last match |

For an empty needle, `find` returns `0` and `rfind` returns `len`.

```beans
match "hello".find("ll") {
    some(i) => io.println("found at {i}"),
    none => io.println("not found"),
}
```

## Cleaning and case

| Method | Returns | Notes |
| --- | --- | --- |
| `trim()` | `string` | removes ASCII whitespace from both ends |
| `trim_start()` | `string` | removes ASCII whitespace from the start |
| `trim_end()` | `string` | removes ASCII whitespace from the end |
| `to_upper()` | `string` | ASCII uppercase |
| `to_lower()` | `string` | ASCII lowercase |

Trimming and case changes affect ASCII only.

## Building new strings

| Method | Returns | Notes |
| --- | --- | --- |
| `replace(old, new)` | `string` | replaces all matches of `old`; an empty `old` changes nothing |
| `repeat(n)` | `string` | repeats the string `n` times; panics on negative `n` |

## Splitting

| Method | Returns | Notes |
| --- | --- | --- |
| `split(sep)` | `List<string>` | splits on `sep`, keeping empty pieces; an empty `sep` gives one piece |
| `lines()` | `List<string>` | splits into lines |

```beans
let parts: List<string> = "a,b,,c".split(",")
// ["a", "b", "", "c"]
```

## Parsing to numbers

| Method | Returns | Notes |
| --- | --- | --- |
| `to_int()` | `Result<int>` | parse as a whole number |
| `to_float()` | `Result<float>` | parse as a float |
| `to_decimal()` | `Result<decimal>` | parse as a decimal |

Each returns a `Result` because the text may not be a number. See
[Option, Result, and Error](/reference/builtins/option-result/).

## Characters (UTF-8)

`len()` counts bytes. These methods work with whole UTF-8 characters.

| Method | Returns | Notes |
| --- | --- | --- |
| `chars()` | `List<string>` | each UTF-8 character as its own string |
| `count_chars(from, to)` | `int` | number of characters in the byte range `[from, to)` |

## Low-level helpers

These work directly on bytes and use plain return values (not `Option`).

| Method | Returns | Notes |
| --- | --- | --- |
| `find_byte(byte, from)` | `int` | index of `byte` at or after `from`; `-1` when absent |
| `range_equals(from, to, other)` | `bool` | does the byte range `[from, to)` equal `other` |
| `parse_int_range_or(from, to, fallback)` | `int` | parse the byte range as an int, or `fallback` if it is not a number |

## See also

- [Bytes](/reference/builtins/bytes/) — a changeable byte buffer.
- [Numbers and decimal](/reference/builtins/numbers/) — the parse targets.
- [Collections](/reference/builtins/collections/) — `List<string>` and `join`.
