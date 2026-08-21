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

## Default parameter values

A trailing parameter may declare a constant default — a literal, a negated
numeric literal, or `none`. A call that leaves trailing arguments out gets the
declared constants; the checker fills them in at each call site, so nothing
about the ABI or function values changes.

<!-- beans:compile -->
```beans
package main

import std.io

fn greet(name: string, punct: string = "!", times: int = 1) -> string {
    var parts: List<string> = []
    for index: int in 0..times {
        parts.push("{name}{punct}")
    }
    return parts.join(" ")
}

fn main() {
    io.println(greet("hi"))          // hi!
    io.println(greet("yo", "?"))     // yo?
    io.println(greet("go", ".", 3))  // go. go. go.
}
```

Every parameter after a defaulted one needs a default too, defaults are
by-value only (`move` and `inout` parameters cannot have them), and
`extern "C"` signatures never have them. A function used as a value keeps its
full arity. There are **no named arguments** and **no overloading** — one
name, one signature; a defaulted tail is the one sanctioned way to make an
argument optional.

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
value (closure *parameters* do not carry ownership modes yet).

### Capture by move

`fn(...) move(a, b)` captures the listed locals by move: the closure owns
them, the enclosing bindings are spent, and each owned capture is released
exactly once when the closure value dies. This is how a move-only value — a
socket, a `Box`, a `List` — lives inside a callback and is torn down with it.

<!-- beans:compile -->
```beans
package main

import std.io

fn make_counter() -> fn() -> int {
    var seen: List<int> = []
    return fn() move(seen) -> int {
        seen.push(1)
        return seen.len()
    }
}

fn main() {
    let tick: fn() -> int = make_counter()
    io.println("{tick()} {tick()}")   // 1 2
}
```

Each listed name must be an enclosing local the body actually uses. After the
closure is built, using the moved local is a use-after-move error. Copying the
closure value shares the same closure and its captures — fn values are shared,
so single ownership of the capture is never violated.

### Sendable function values

`send fn(...) -> T` is the function type for moving work to another thread. It
is move-only and implements `Send`, but not `Sync` or `Clone`. Every capture
must be `Send`; a mutable, move-only, or non-`Sync` capture must also appear in
`move(...)`.

```beans
let bytes: Bytes = Bytes.filled(1024, 0)
let work: send fn() -> int =
    fn() move(bytes) -> int { return bytes.len() }
```

A named function can become a `send fn` when its signature fits. A plain
closure value never silently converts; a direct closure passed to
`thread.spawn` is inferred in that sendable context.

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
