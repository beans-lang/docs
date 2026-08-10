---
title: Functions and closures
description: Declaring functions, the explicit-return rule, and anonymous functions (closures) in Beans.
---

A function is declared with `fn`:

```beans
fn add(a: int, b: int) -> int {
    return a + b
}

pub fn log_line(msg: string) {      // no -> means no return value
    io.println(msg)
}
```

A `->` gives the return type. No `->` means the function returns nothing.
Parameters state their types, like every other binding.

## Every path must return

**There is no implicit tail return.** A trailing expression is a statement like
any other; its value is discarded, not returned. A function with a `->` must
`return` on every path:

```beans
fn wrong() -> int {
    var sum: int = 0
    if flag() { sum = 1 }
    sum                             // error: 'wrong' must return int
}
```

The checker rejects a body that can finish without returning. A path counts as
returning if it ends in `return`, an `if`/`else` where both sides return, a
statement `match` whose arms all return, or a `for { }` with no `break` (which
never finishes at all).

## Parameter modes

Parameters **borrow** by default. Add `move` to take ownership, or `inout` to
alias a mutable caller local. See [Variables and constants](/guide/variables/)
for the rules.

```beans
fn enqueue(move jobs: List<Job>) { /* ... */ }
fn bump(inout n: int) { n += 1 }
```

## Anonymous functions (closures)

`fn` without a name is a closure. It captures the variables around it.
`fn(int) -> int` is also the *type* of a function value.

```beans
let double: fn(int) -> int = fn(x: int) -> int { return x * 2 }
xs.map(fn(x: int) -> int { return x * 2 })
```

Closures capture their surrounding variables by reference to a shared cell, so
mutation and escaping both work. A closure cannot capture an `inout` parameter,
and a function with `move` or `inout` parameters cannot be stored as a closure
value (function values do not carry ownership modes yet).

## Methods and statics

Functions defined inside a class are methods; `static fn` declares a class
static. Those are covered in [Classes](/guide/classes/). A module-level function
is for work that yields no object, such as `io.println`, `os.args`, and
`fmt.pad_left`. Anything that produces an object belongs on that object's class,
as `new` or a named static.

## A complete example

```beans
import std.io

fn add(a: int, b: int) -> int {
    return a + b
}

fn apply(f: fn(int) -> int, x: int) -> int {
    return f(x)
}

fn main() {
    let sum: int = add(2, 3)
    let square: fn(int) -> int = fn(n: int) -> int { return n * n }
    io.println("{sum} {apply(square, sum)}")
}
```
