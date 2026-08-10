---
title: Control flow
description: The single for loop, if and match as values, and defer in Beans.
---

Beans keeps control flow small: one loop keyword, `if`, `match`, and `defer`.
There is no `do-while`, no `switch`, no ternary, and no `++`/`--`.

## The for loop

`for` has three shapes:

```beans
for { }                        // forever
for x < 10 { }                 // while: run while the condition holds
for i: int in 0..10 { }        // range, exclusive. 0..=10 is inclusive
for u: User in users { }       // over any iterable
```

`break`, `continue`, and `return` work as usual. The loop variable states its
type (`i: int`, `u: User`). Conditions take no parentheses, and braces are
always required.

## if and match as values

`if` and `match` can produce a value:

```beans
let grade: string = if score >= 90 { "a" } else { "b" }
```

There is no `return` inside these branches. `return` always means "leave the
function", so a `return` in a branch would exit the whole function instead of
producing the branch value. The rule is:

- **Statement position:** branches hold statements; `return` leaves the
  function as usual.
- **Value position:** each branch is exactly one expression, and that
  expression is the value. Need several statements? Use a `var` and the
  statement form.

`match` works the same way. [Pattern matching](/guide/pattern-matching/) covers
the pattern shapes:

```beans
let label: string = match code {
    200        => "ok",
    301 | 302  => "moved",
    400..=499  => "client bug",
    _          => "who knows",
}
```

## defer

`defer` schedules an expression to run when the function exits, including
through `return` and `?`. Deferred expressions run newest first, and before
local destruction:

```beans
fn read_config(path: string) -> Result<string> {
    let f: File = File.open(path, "r")?
    defer f.close()
    return read_all(f)              // f.close() runs on the way out
}
```

Rules:

- `defer` must sit at the top level of the function body, not inside an `if`, a
  `for`, or a nested block. It is a function-exit hook, and the checker rejects
  registering one from a nested position.
- A **panic** exits the process without running defers, and a panic inside a
  defer is itself fatal.
- `?` is not allowed inside a deferred expression, because the function's return
  path is already being processed.

Use `defer` to pair a cleanup with the acquisition it undoes, so the cleanup
runs on every exit path. It is the usual way to close a `File`, unlock a
resource, or close a `Channel`.

## A complete program

This puts the loop, `match`, `if`, and value position together:

<!-- beans:compile -->
```beans
import std.io

fn classify(n: int) -> string {
    return match n {
        0        => "zero",
        1 | 2    => "small",
        3..=9    => "medium",
        _        => "large",
    }
}

fn main() {
    for i: int in 0..5 {
        let word: string = classify(i)
        let parity: string = if i % 2 == 0 { "even" } else { "odd" }
        io.println("{i}: {word}, {parity}")
    }
}
```
