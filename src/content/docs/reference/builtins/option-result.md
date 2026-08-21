---
title: Option, Result, and Error
description: How Beans handles missing values and failures with Option, Result, Error, the ? operator, and combinators.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 3 types · 11 instance methods · 2 public fields · 4 prelude values.
<!-- coverage:summary:end -->

Beans has no null and no exceptions. Instead it gives you two builtin enums and one
builtin class for "maybe" and "failed" answers. This page explains all three and
the tools to work with them. For the wider picture, see
[error handling](/guide/errors/) in the language guide.

`Error` is `Send`. `Option<T>` and `Result<T, E>` are `Send` when their payload
types are, so a worker can use `?` and return a typed failure.

## Option&lt;T&gt;

`Option<T>` is a value that may be missing. It is a builtin enum with two variants:

- `some(value: T)`: there is a value.
- `none`: there is nothing.

You make one with the prelude names `some` and `none`, and read it with `match`:

```beans
let found: Option<int> = some(42)
match found {
    some(v) => io.println("got {v}"),
    none => io.println("nothing"),
}
```

## Result&lt;T, E&gt;

`Result<T, E>` is either a value or an error. It is a builtin enum:

- `ok(value: T)`: success, with a value.
- `err(error: E)`: failure, with an error.

`Result<T>` on its own means `Result<T, Error>`, using the standard `Error` type.

```beans
fn parse(s: string) -> Result<int> {
    s.to_int()
}
```

## Error

`Error` is the standard builtin error class. It has these fields:

- `msg: string`: a human-readable message.
- `kind: string`: a short slug naming the kind of error, like `"eof"`.
- a `cause`: an optional underlying error.

## some, none, ok, err are prelude names

`some`, `none`, `ok`, and `err` are ordinary names from the prelude. They are not
keywords. You call them like functions.

Ways to make an `err`:

| Form | Meaning |
| --- | --- |
| `err(message)` | an `Error` with that message |
| `err(message, kind)` | an `Error` with a message and a kind slug |
| `err(value)` | a custom error type, for your own `E` |

```beans
fn read_more() -> Result<Bytes> {
    err("closed", "eof")
}
```

## The ? operator

The `?` operator unwraps a `Result`. If the value is `err`, `?` returns that error
up to the caller right away. If it is `ok`, `?` gives you the inner value.

```beans
fn total(a: string, b: string) -> Result<int> {
    let x: int = a.to_int()?
    let y: int = b.to_int()?
    ok(x + y)
}
```

Use `match` when you want to handle both arms yourself instead.

## panic

`panic(message: string)` is a prelude function for an error you cannot recover
from. It reports the call location and your message, exits with status 3, and never
returns. It does **not** run defers.

```beans
panic("unreachable state")
```

Prefer `Option` and `Result` for errors you can handle. Use `panic` only for bugs
that should never happen. See [Prelude functions](/reference/builtins/functions/).

## Option methods

```beans
Option<T>.or(T) -> T
Option<T>.expect(string) -> T
Option<T>.is_some() -> bool
Option<T>.is_none() -> bool
```

- `or(fallback)` returns the value, or `fallback` if `none`.
- `expect(msg)` returns the value, or panics with `msg` if `none`.
- `is_some()` is true when there is a value; `is_none()` is true when there is
  not.

`Option<T>` also has three higher-order combinators, generic over the closure's
result:

- `map(fn(T) -> U) -> Option<U>` applies `fn` to the value if present.
- `and_then(fn(T) -> Option<U>) -> Option<U>` applies an `fn` that itself returns
  an `Option`.
- `filter(fn(T) -> bool) -> Option<T>` keeps the value only if `fn` returns true.

```beans
let n: int = "7".to_int().or(0)
let name: Option<string> = some("ann")
let upper: Option<string> = name.map(fn(s: string) -> string { s.to_upper() })
```

## Result methods

```beans
Result<T>.or(T) -> T
Result<T>.expect(string) -> T
Result<T>.is_ok() -> bool
```

- `or(fallback)` returns the value, or `fallback` if `err`.
- `expect(msg)` returns the value, or panics with `msg` if `err`.
- `is_ok()` is true on success.

`Result<T>` has three higher-order combinators as well:

- `map(fn(T) -> U) -> Result<U>` applies `fn` to the value on success.
- `and_then(fn(T) -> Result<U>) -> Result<U>` applies an `fn` that itself returns
  a `Result`.
- `recover(fn(Error) -> T) -> T` turns an error into a value.

```beans
let count: int = "42".to_int().recover(fn(e: Error) -> int { 0 })
```

:::note[Combinators copy the payload]
`map`, `and_then`, `filter`, and the other combinators copy the active value, so
its type must implement `Clone`. There is no `std.option` or `std.result` package;
these are builtin methods.
:::

## A worked example

`?` propagates the first error; `match` handles both arms; `err(msg, kind)` sets a
kind slug you can read back off `Error`:

<!-- beans:compile -->
```beans
import std.io

fn parse_qty(s: string) -> Result<int> {
    let n: int = s.to_int()?
    if n < 0 {
        return err("quantity cannot be negative", "invalid")
    }
    return ok(n)
}

fn main() {
    match parse_qty("42") {
        ok(n) => io.println("qty {n}"),
        err(e) => io.println("{e.kind}: {e.msg}"),
    }
    match parse_qty("-3") {
        ok(n) => io.println("qty {n}"),
        err(e) => io.println("{e.kind}: {e.msg}"),
    }

    let fallback: int = parse_qty("nope").or(0)
    io.println("fallback {fallback}")
}
```

## See also

- [Error handling](/guide/errors/) in the language guide.
- [Prelude functions](/reference/builtins/functions/), `panic` in full.
- [string](/reference/builtins/string/), `to_int`, `to_float`, `to_decimal` return `Result`.
