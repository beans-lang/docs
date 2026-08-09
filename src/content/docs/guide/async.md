---
title: Async and await
description: Structured async/await in Beans — an effect on the callable, driven by a hidden single-threaded executor.
---

Async in Beans is an **effect on the callable**, not a type. `async fn f() -> R`
declares a function whose calls must be waited on; the call still has type `R`.
There is no public task, future, executor, or polling protocol — the compiler
and runtime schedule everything behind the scenes, on the one thread that
entered `main`. Use [`thread.spawn`](/guide/concurrency/) for CPU-heavy or
blocking work.

```beans
import std.io

async fn double_later(a: int) -> int {
    return a * 2
}

async fn fetch_size(a: int) -> Result<int> {
    let doubled: int = await double_later(a)   // doubled: int
    return ok(doubled)
}

async fn main() {
    let n: Result<int> = await fetch_size(21)
    io.println("{n.or(-1)}")
}
```

## async and await are contextual

`async` and `await` are **not keywords**. `async` means something only
immediately before `fn`; `await` only inside an async body. Everywhere else
both stay ordinary identifiers, so existing functions, locals, and fields by
those names keep working — including user classes named `Task` or `Future`.

## Every async call is waited on

A call to an async function is legal in exactly two places:

1. directly under `await`, or
2. as the initializer of an `async let`.

Anywhere else it is refused. A synchronous function cannot call an async one at
all, and an async function cannot be stored as a plain `fn` value. There is no
`run`/`block_on` escape hatch back into sync code.

```beans
async fn double_later(n: int) -> int { return n * 2 }

async fn main() {
    let x: int = await double_later(21)   // ok: directly awaited
    async let y: int = double_later(9)    // ok: starts a child
    let z: int = await y                  // await the child exactly once
}
```

- `await f(x)` produces `R`, the declared result type.
- `await` binds tighter than every binary operator and looser than call, field,
  and index. `?` and `as` apply to the value the await produced, so
  `await f(x)?` unwraps the awaited `Result` without parentheses.

## async let starts a structured child

`async let x: R = f(args)` starts a child task inside the current async body. Its
arguments evaluate right there in the parent, and the child belongs to the
enclosing lexical scope. The written type is the eventual result: `await x`
produces `R` exactly once.

Leaving the scope without awaiting — an early `return`, `?`, `break`,
`continue`, or falling off the end — **cancels** the unfinished child before the
parent's own result lands. Its armed `defer`s run newest first, then its live
values drop last-created-first, and children it started cancel in cascade. The
parent never finishes while a child is still running or cleaning up.

## Scheduling is hidden and cooperative

- An async call suspends only at `await` points; between them it runs
  synchronously on the executor's one thread. Long CPU work blocks every other
  task — put it on `std.thread`.
- Cancellation is cooperative: it takes effect at suspension points, never
  mid-statement.
- `async fn main()` drives itself: declare the entry point `async` and a hidden
  single-threaded executor runs it to completion. A synchronous `fn main()`
  stays exactly as it was; it just cannot call async functions.

## Readiness

`await net.readable(handle)` (and `writable`) suspends until a descriptor is
ready — a socket's `poll_handle()`, or any pollable descriptor on POSIX
(Windows readiness is socket-handle only). While one child is parked, its
runnable siblings keep running; when nothing can move and something is parked,
the hidden driver blocks in the platform poller. When nothing can move and
nothing is parked, the program stops with `async deadlock: every task is waiting
and none is parked on readiness`. An await on a closed or invalid descriptor
finishes with `false`.

## What an async fn cannot do

- take `inout` parameters,
- be `extern "C"` (wrap the C call in an async Beans function instead),
- be `feature`-gated, or
- be an instance method on a `unique class` (statics are fine).

`await` cannot sit inside a `defer`, a closure, or string interpolation (bind
the value to a local first), and `init`/`deinit` cannot be async. A panic inside
an async body stops the program at the original source position, like every
other panic.

:::note[First version]
This is the first version of async. Dynamic task groups, detached tasks, async
closures, and `inout` on a directly awaited call are **not yet** available. They
layer on this model without changing it.
:::

## Next

- [Concurrency](/guide/concurrency/)
- [std.net](/reference/stdlib/net/)
- [std.poll](/reference/stdlib/poll/)

Source: [`spec/SYNTAX.md`](https://github.com/beans-lang/beans/blob/main/spec/SYNTAX.md).
