---
title: std.thread
description: Run a closure on a new OS thread and get its result back with join.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 1 package function.
<!-- coverage:summary:end -->

`std.thread` runs a closure on a real operating-system thread. These are not
green threads; each one is a full OS thread. It is a native module, built into the
compiler and runtime.

```beans
import std.thread
```

## Spawning and joining

| Function | Returns | What it does |
| --- | --- | --- |
| `thread.spawn(fn() -> T) -> Thread<T>` | `Thread<T>` | run a closure on a new thread |

The closure you pass may only capture `Send` values and must return a `Send`
value. `Send` means "safe to move to another thread." This rule is why move-only
socket and file handles cannot be captured into a thread.

`Thread<T>` has one method you use:

- `join() -> T`: wait for the thread to finish and take its returned value.

```beans
import std.io
import std.thread

fn main() {
    let worker: Thread<int> = thread.spawn(fn() -> int {
        var total: int = 0
        for i in 0..1000 { total += i }
        return total
    })
    let result: int = worker.join()
    io.println(result)                       // 499500
}
```

## Sharing data between threads

`spawn`/`join` alone only pass a value out at the end. To share state while
threads run, use the sync tools, which are builtin types documented in the
builtin reference:

- `Mutex`: lock around shared state.
- `Channel`: send values between threads.
- `Atomic`: lock-free single values.

See [Ownership handles](/reference/builtins/handles/) and
[Atomics](/reference/builtins/atomics/).

## See also

- [Concurrency guide](/guide/concurrency/), the full picture of threads, `Send`,
  and the sync tools.
