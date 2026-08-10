---
title: Option and Result
description: Beans has no null and no exceptions. Absence is Option, failure is Result, and ? propagates errors.
---

Beans has **no null** and **no exceptions**. Two builtin enums cover their jobs:

- `Option<T>`: a value that may be absent, either `some(value)` or `none`.
- `Result<T, E>`: an operation that may fail, either `ok(value)` or `err(error)`.

The core rule: **a function that can fail says so in its return type.**

```beans
fn find(users: List<User>, name: string) -> Option<User> {
    for u: User in users {
        if u.name == name {
            return some(u)
        }
    }
    return none
}

fn parse_age(s: string) -> Result<int> {
    let n: int = s.to_int()?         // ? = if err, return it up; else unwrap
    if n < 0 {
        return err("negative age")
    }
    return ok(n)
}
```

`some`, `none`, `ok`, and `err` are ordinary prelude names, not keywords.

## Result and Error

`Result<T>` is short for `Result<T, Error>`. `Error` is a builtin class with a
message and a slug:

- `msg: string`: the human-readable message.
- `kind: string`: a short slug like `not_found`, `eof`, `timeout`, or `invalid`.

Build an error in three ways:

```beans
return err("file is gone")                 // just a message
return err("closed after 3 of 8 bytes", "eof")   // message + kind slug
return err(my_custom_error)                // a custom error type: Result<T, MyError>
```

The `msg`/`kind` form is only for the builtin `Error`. A custom error type
carries its own fields, so `err(value)` is the form there.

## The `?` operator

`?` propagates an error up. On `err`, it returns that error from the current
function; on `ok`, it unwraps the value.

```beans
fn load_and_parse(path: string) -> Result<int> {
    let text: string = fs.read(path)?      // returns the error on failure
    return text.to_int()
}
```

## Handling with match

```beans
match parse_age(input) {
    ok(n)  => io.println("age {n}"),
    err(e) => io.println("bad: {e.msg}"),
}
```

## Helper methods

```beans
let age: int = parse_age(input).or(18)                    // fallback
let u: User = find(users, "jul").expect("must exist")     // crash with message

let adult: Option<User> = find(users, "jul").filter(fn(u: User) -> bool {
    return u.age >= 18
})
let label: Option<string> = adult.map(fn(u: User) -> string {
    return u.name
})
let parsed: Result<int> = load_text().and_then(fn(s: string) -> Result<int> {
    return s.to_int()
})
let count: int = parsed.recover(fn(e: Error) -> int { return 0 })
```

- `Option` has `map`, `and_then`, `filter`, `or`, `expect`, `is_some`,
  `is_none`.
- `Result` has `map`, `and_then`, `recover`, `or`, `expect`, `is_ok`.

These combinators copy the active payload, so its type must implement `Clone`.
They are instance methods on the value; there is no `std.option` or
`std.result` package.

## panic

For the truly unrecoverable, `panic(message)` reports the call location and
message, then exits with status 3. It never returns and does not run
[`defer`](/guide/control-flow/) blocks. Use it for bugs. Expected failures are
what `Result` is for.

## A complete example

Propagating with `?`, then handling with `match`:

```beans
import std.io

fn parse_positive(s: string) -> Result<int> {
    let n: int = s.to_int()?          // returns the error up on failure
    if n < 0 {
        return err("negative", "invalid")
    }
    return ok(n)
}

fn main() {
    match parse_positive("42") {
        ok(n)  => io.println("got {n}"),
        err(e) => io.println("bad: {e.msg} ({e.kind})"),
    }
}
```

The full method list lives in the
[Option and Result reference](/reference/builtins/option-result/).
