---
title: Option, Result, and Error
description: How Beans handles missing values and failures with Option, Result, Error, the ? operator, and combinators.
---

Beans has no null and no exceptions. Instead it gives you two builtin enums and one
builtin class for "maybe" and "failed" answers. This page explains all three and
the tools to work with them. For the wider picture, see
[error handling](/guide/errors/) in the language guide.

## Option&lt;T&gt;

`Option<T>` is a value that may be missing. It is a builtin enum with two variants:

- `some(value: T)` — there is a value.
- `none` — there is nothing.

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

- `ok(value: T)` — success, with a value.
- `err(error: E)` — failure, with an error.

`Result<T>` on its own means `Result<T, Error>`, using the standard `Error` type.

```beans
fn parse(s: string) -> Result<int> {
    s.to_int()
}
```

## Error

`Error` is the standard builtin error class. It has these fields:

- `msg: string` — a human-readable message.
- `kind: string` — a short slug naming the kind of error, like `"eof"`.
- a `cause` — an optional underlying error.

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

| Method | Returns | Notes |
| --- | --- | --- |
| `or(fallback)` | `T` | the value, or `fallback` if `none` |
| `expect(msg)` | `T` | the value, or panic with `msg` if `none` |
| `is_some()` | `bool` | true if there is a value |
| `is_none()` | `bool` | true if empty |
| `map(fn)` | `Option<U>` | apply `fn` to the value if present |
| `and_then(fn)` | `Option<U>` | apply `fn` that itself returns an `Option` |
| `filter(fn)` | `Option<T>` | keep the value only if `fn` returns true |

```beans
let n: int = "7".to_int().or(0)
let name: Option<string> = some("ann")
let upper: Option<string> = name.map(fn(s: string) -> string { s.to_upper() })
```

## Result methods

| Method | Returns | Notes |
| --- | --- | --- |
| `or(fallback)` | `T` | the value, or `fallback` if `err` |
| `expect(msg)` | `T` | the value, or panic with `msg` if `err` |
| `is_ok()` | `bool` | true on success |
| `map(fn)` | `Result<U>` | apply `fn` to the value on success |
| `and_then(fn)` | `Result<U>` | apply `fn` that itself returns a `Result` |
| `recover(fn(Error) -> T)` | `T` | turn an error into a value |

```beans
let count: int = "42".to_int().recover(fn(e: Error) -> int { 0 })
```

:::note[Combinators copy the payload]
`map`, `and_then`, `filter`, and the other combinators copy the active value, so
its type must implement `Clone`. There is no `std.option` or `std.result` package;
these are builtin methods.
:::

## See also

- [Error handling](/guide/errors/) in the language guide.
- [Prelude functions](/reference/builtins/functions/) — `panic` in full.
- [string](/reference/builtins/string/) — `to_int`, `to_float`, `to_decimal` return `Result`.
