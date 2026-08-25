---
title: Fibers and brew
description: Green threads in Beans — brew starts a child fiber, the scope joins it, and a panic stops only the fiber it happened on.
---

A **fiber** is a green thread: its own stack, scheduled by the Beans runtime on
a worker thread rather than by the operating system. `brew f(args)` starts `f`
on a child fiber of the current scope. Fibers are cheap enough to give one to
every connection, and they park instead of blocking — a fiber waiting on a
socket, a channel, or a timer costs its worker nothing.

There are **no colored functions**. Any function may park, and the caller
neither knows nor cares; there is no `async` keyword and nothing to `await`.
Code that waits reads exactly like code that does not.

```beans
import std.io

fn handle(order: Order) -> Result<int> {
    brew warm_cache(order)              // a child fiber, no handle kept
    let price: Brew<int> = brew quote(order)   // a child, handle kept
    let stock: int = count_stock(order)?       // parks if it must; reads like sync code
    match price.join() {                // park until the child finishes
        ok(value) => { return ok(value + stock) }
        err(problem) => { return err(problem.msg, problem.kind) }
    }
}                                       // scope exit joins warm_cache
```

## brew

`brew` takes a call. It evaluates the arguments now and runs the call on a
child fiber of the current scope, pinned to the current worker thread.

- As a **statement**, `brew side(9)` starts an anonymous child. Nobody holds a
  handle, so the scope exit joins it.
- As an **initializer**, `let h: Brew<int> = brew work(21)` keeps the handle.

`brew` is contextual, like `unique` and `packed`: it is special only directly
before a call, in statement or initializer position. A local, field, or
parameter named `brew` keeps working, which is why the `TaskGroup` method below
reads `group.brew(...)`. A `brew` anywhere else — inside a larger expression —
is refused, because the handle it makes is bound to the scope.

Methods brew too, and a move-only argument moves into the child:

<!-- beans:fragment -->
```beans
let counter: Counter = new Counter(10)
let bumped: Brew<int> = brew counter.bump(5)

let data: List<int> = [1, 2, 3, 4]
let total: Brew<int> = brew sum(move data)
```

## Brew&lt;T&gt;

`Brew<T>` is the handle for one child. It is move-only and scope-bound.

```beans
Brew<T>.join() -> Result<T>
Brew<T>.cancel()
```

- `join()` parks the caller until the child finishes, then answers `ok(value)`,
  or an `err` when the child panicked (kind `panic`) or was cancelled (kind
  `cancelled`). Joining twice answers an `err` of kind `closed` — the first
  join consumed the outcome.
- `cancel()` requests cancellation and returns immediately. It never cancels
  work that already finished, and cancelling twice does nothing.

A `Brew<T>` is not `Send`: the child belongs to the scope and the worker that
brewed it. Use [`thread.spawn`](/guide/concurrency/) to hand work to another
thread.

The handle also cannot escape its scope. It may not be stored in a field,
captured by a closure, returned, or put in a collection — a leaked fiber is not
representable:

<!-- beans:expect-error -->
```beans
class Job {
    pending: Brew<int>              // error: a Brew handle is scope-bound
}
```

## The scope owns its fibers

Every fiber a scope brews belongs to that scope, and the scope will not exit
without it.

- **Normal exit joins.** Falling off the end of a scope, or returning from it,
  parks until every un-joined child has finished — newest first, interleaved
  with `defer` in the order the scope armed them.
- **Error exit cancels, then joins.** Leaving through `?` propagation or a
  panic first cancels every un-joined child, then joins them. Cancellation is a
  request; the join still waits for each child to unwind.
- **An unseen failure escalates.** If the scope exit joins a child that
  panicked and no `join()` ever saw that failure, the parent panics at the
  scope exit with the child's message and position. A failure can be handled or
  it propagates — it cannot evaporate.

Because the join happens at scope exit, an un-joined child runs *after* the
last statement of the scope:

<!-- beans:compile -->
```beans
import std.io

fn side(x: int) {
    io.println("side {x}")
}

fn main() {
    brew side(9)
    io.println("end of main")
}
```

That program prints `end of main`, then `side 9`.

## Cancellation

Cancellation is **cooperative and park-scoped**. A cancel request is observed at
the fiber's next park, or immediately if it is parked already. Straight-line
code between parks is never interrupted, so a child that never parks simply
finishes:

<!-- beans:fragment -->
```beans
let spinner: Brew<int> = brew spin()
spinner.cancel()
match spinner.join() {
    ok(value) => { io.println("finished anyway {value}") }
    err(problem) => { io.println("cancelled: {problem.kind}") }
}
```

A cancelled park does not return a value to the code that parked. The fiber
unwinds instead — armed defers run newest-first exactly once, owned values
drop, and its own children cancel in cascade. The join then reports kind
`cancelled`. Code that must not be cancelled mid-protocol does not park
mid-protocol, the same discipline synchronous code already has.

## A panic stops one fiber

**A panic terminates only the fiber it happened on.** That fiber's stack
unwinds, running its defers and dropping its values; the failure — message and
source position — is delivered at its join as an ordinary catchable error.
Nothing else stops.

<!-- beans:compile -->
```beans
import std.io

fn boom(a: int) -> int {
    if a > 0 {
        panic("boom at {a}")
    }
    return a
}

fn main() {
    let risky: Brew<int> = brew boom(5)
    match risky.join() {
        ok(value) => { io.println("value {value}") }
        err(problem) => { io.println("caught {problem.kind}: {problem.msg}") }
    }
    io.println("still running")
}
```

The main fiber panicking with nobody to catch it still ends the program exactly
as before, so plain programs are unchanged. One sharp edge: a panic while
holding a `Mutex` **poisons** the lock, and every later `with_lock` on it panics
with kind `poisoned`. The blast radius is exactly the fibers that touch the
poisoned data.

## TaskGroup&lt;T&gt;

When the number of children is a runtime value, use a `TaskGroup<T>`.

```beans
new TaskGroup<T>()
TaskGroup<T>.next() -> Option<Result<T>>
TaskGroup<T>.try_next() -> Option<Result<T>>
TaskGroup<T>.wait_all() -> Result<List<T>>
TaskGroup<T>.cancel_all()
```

- `group.brew(f(x))` starts a child exactly as a lone `brew` does. Unlike a
  lone `brew`, it is legal at any block depth.
- `next()` parks for the earliest unclaimed completion and answers
  `some(ok(v))`, `some(err(e))`, or `none` once the fleet is drained. Delivery
  is in **completion order** — a fleet exists to take answers as they land.
- `try_next()` answers immediately, `none` when nothing has landed yet.
- `wait_all()` joins the rest and answers `ok` of a list in **spawn order**, or
  the first failure in spawn order.
- `cancel_all()` cancels newest-first, joins, and discards every outcome.

A drained group is reusable. The group carries the same scope-bound walls a
`Brew` handle does, and its scope exit escalates the first unseen panic.

<!-- beans:compile -->
```beans
import std.io

fn double(n: int) -> int {
    return n * 2
}

fn main() {
    let group: TaskGroup<int> = new TaskGroup<int>()
    var n: int = 1
    for n <= 3 {
        group.brew(double(n))
        n += 1
    }
    match group.wait_all() {
        ok(values) => { io.println("sum of {values.len()} answers") }
        err(problem) => { io.println("fleet failed {problem.kind}") }
    }
}
```

## Gate

`Gate` is a sticky broadcast flag. One `open()` wakes every parked waiter at
once, and the gate stays open for every later `wait()`.

```beans
new Gate()
Gate.wait()
Gate.open()
Gate.is_open() -> bool
```

- `wait()` parks until the gate opens, and returns immediately once it is open.
- `open()` opens the gate and wakes the whole waiting line in FIFO order.
- `is_open()` reads the flag without parking.

Unlike a `Brew` handle, a `Gate` is `Send`, so an OS thread can open a gate that
fibers are parked on.

## Fibers and threads together

Fibers and [OS threads](/guide/concurrency/) answer different questions. A fiber
is for waiting — thousands of them park on sockets and timers at almost no cost,
but they all share one worker thread and cannot use a second core by themselves.
A thread is for CPU-heavy or genuinely blocking work, and for reaching another
core.

They compose: `main()` runs as the root fiber, every thread can host fibers of
its own, and channels, `Gate`, timers, and `sleep` park a fiber instead of
blocking its worker.

## Where fibers are not available

Restricted targets have no scheduler. wasm and freestanding builds refuse
`brew`, `Brew`, and every parking operation at check time, the same way
freestanding already refuses timer and channel waits. Plain synchronous Beans is
fully supported there — concurrency is honestly absent rather than quietly
broken. A program that never brews never parks and pays for nothing.

## See also

- [Concurrency](/guide/concurrency/), OS threads, channels, mutexes, atomics.
- [Ownership handles](/reference/builtins/handles/), `Brew`, `TaskGroup`,
  `Gate`, and the rest of the builtin handles.
- [Errors](/guide/errors/), the `Result` and `Error` these joins answer with.
