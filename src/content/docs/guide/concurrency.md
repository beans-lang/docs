---
title: Concurrency
description: OS threads, channels, mutexes, and atomics in Beans, with checked Send and Sync bounds.
---

Beans uses **OS threads, not green threads**. Green threads make every C/C++
call expensive (Go's cgo problem — the stack switch at the boundary). Beans is
built to interoperate with C++ and to write databases, so it uses real threads.
Closures plus `std.thread` do the whole job.

```beans
import std.thread

// spawn: run a closure on another thread
let t: Thread<int> = thread.spawn(fn() -> int {
    return heavy_work()
})
let n: int = t.join()               // wait, then take the value

// a mutex wraps the data itself — no way to touch it without holding the lock
let ledger: Mutex<Ledger> = new Mutex(new Ledger())
ledger.with_lock(fn(l: Ledger) {
    l.post(entry)                   // locked for exactly this block, auto-unlock
})

// channels move work between threads
let ch: Channel<string> = new Channel(64)      // buffered
ch.send("job")
let job: Option<string> = ch.receive()         // none when closed and empty

// atomics for plain counters
let hits: AtomicInt = new AtomicInt(0)
hits.add_and_get(1)
```

## spawn and join

`thread.spawn(fn() -> T)` runs a closure on a new OS thread and returns a
`Thread<T>`. `join()` waits for it and returns the value.

## Send and Sync

The type system stops data races before they happen. A `thread.spawn` closure
may capture only `Send` values and must return a `Send` value.

- **Not `Send`:** plain class references, `List`, `Map`, `Box`, `Arena`,
  `Bytes`, `File`, `MMap`. These are local reference values.
- **Can cross:** scalars, immutable strings, `AtomicInt`, `Mutex`, a `Channel`
  of `Send` values, and `Shared<T>`/`Weak<T>` where `T` is `Send & Sync`.

This makes a `class` a local reference by default. To share mutable data across
threads, wrap it in a `Mutex` — you cannot silently race it. See
[Memory and ownership](/guide/memory/).

## Mutex

`Mutex<T>` holds the value inside it. `with_lock` locks, runs your closure, and
unlocks on any exit path — there are no forgotten unlocks.

## Channels

`Channel<T>` moves values between threads. `new Channel(capacity)` makes a
buffered channel; `send(x)` puts a value in, `receive()` returns `some(v)` or
`none` when the channel is closed and empty, and `close()` closes it.

## Atomics

For plain counters and flags, use atomics:

- `AtomicInt` — a simple sequentially-consistent integer:
  `new AtomicInt(0)`, `load()`, `store(v)`, `add_and_get(v)`.
- `Atomic<T>` — a typed atomic over any integer or `bool`, with explicit memory
  orders and `compare_exchange`, `fetch_add`, wait/notify, and `Atomic.fence`.
  See [Atomics and MemoryOrder](/reference/builtins/atomics/).

## Readiness waits

To wait for a socket without blocking a thread, use the [async](/guide/async/)
model together with `std.net`'s `readable`/`writable`, or the
[`std.poll`](/reference/stdlib/poll/) poller for many descriptors at once.

## Next

- [Async and await](/guide/async/)
- [Atomics and MemoryOrder](/reference/builtins/atomics/)
- [Ownership handles](/reference/builtins/handles/)
- [std.thread](/reference/stdlib/thread/)

Source: [`spec/SYNTAX.md`](https://github.com/beans-lang/beans/blob/main/spec/SYNTAX.md).
