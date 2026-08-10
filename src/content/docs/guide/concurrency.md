---
title: Concurrency
description: OS threads, channels, mutexes, and atomics in Beans, with checked Send and Sync bounds.
---

Beans threads are **OS threads**. `thread.spawn` runs a closure on a new OS
thread, and there are no green threads or coroutines in this model. For
cooperative, single-threaded concurrency instead, see [async and
await](/guide/async/); `thread.spawn` is the tool for CPU-heavy or blocking
work. Closures plus `std.thread` do the whole job.

```beans
import std.thread

// spawn: run a closure on another thread
let t: Thread<int> = thread.spawn(fn() -> int {
    return heavy_work()
})
let n: int = t.join()               // wait, then take the value

// a mutex wraps the data itself, so you cannot touch it without the lock
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
`Thread<T>`. `join()` waits for the thread to finish and returns its value. The
returned value `T` must be `Send`, and so must everything the closure captures.

## Send and Sync

The type system stops data races before they happen. A `thread.spawn` closure
may capture only `Send` values and must return a `Send` value.

- **Not `Send`:** plain class references, `List`, `Map`, `Box`, `Arena`,
  `Bytes`, `File`, `MMap`. These are local reference values.
- **Can cross:** scalars, immutable strings, `AtomicInt`, `Mutex`, a `Channel`
  of `Send` values, and `Shared<T>`/`Weak<T>` where `T` is `Send & Sync`.

This makes a `class` a local reference by default. Capturing a non-`Send` value
in a spawned closure is a compile error that names the value and its type:

<!-- beans:expect-error -->
```beans
import std.thread

fn main() {
    var xs: List<int> = [1, 2, 3]
    let t: Thread<int> = thread.spawn(fn() -> int {
        return xs.len()            // error: cannot capture non-Send List<int>
    })
    t.join()
}
```

To share mutable data across threads, wrap it in a `Mutex`, which is `Send`. See
[Memory and ownership](/guide/memory/).

## Mutex

`Mutex<T>` holds the value inside it. `with_lock` locks, runs your closure, and
unlocks on any exit path, so there are no forgotten unlocks. The value is
reachable only inside the closure, which is what makes the lock impossible to
skip.

## Channels

`Channel<T>` moves values between threads. `new Channel(capacity)` makes a
buffered channel; `send(x)` puts a value in, `receive()` returns `some(v)` or
`none` when the channel is closed and empty, and `close()` closes it. Pairing
`defer ch.close()` with the channel closes it on every exit path.

## Atomics

For plain counters and flags, use atomics:

- `AtomicInt` is a simple sequentially-consistent integer: `new AtomicInt(0)`,
  `load()`, `store(v)`, `add_and_get(v)`.
- `Atomic<T>` is a typed atomic over any integer or `bool`, with explicit memory
  orders and `compare_exchange`, `fetch_add`, wait/notify, and `Atomic.fence`.
  See [Atomics and MemoryOrder](/reference/builtins/atomics/).

## A complete program

Spawn a worker, guard shared state with a `Mutex`, and hand a value over a
`Channel`:

<!-- beans:compile -->
```beans
import std.io
import std.thread

class Ledger {
    total: int = 0
    fn add(n: int) { self.total += n }
}

fn main() {
    let t: Thread<int> = thread.spawn(fn() -> int {
        return 21 * 2
    })
    io.println("worker said {t.join()}")

    let ledger: Mutex<Ledger> = new Mutex(new Ledger())
    ledger.with_lock(fn(l: Ledger) {
        l.add(10)
    })

    let ch: Channel<int> = new Channel(4)
    ch.send(7)
    ch.close()
    match ch.receive() {
        some(v) => io.println("got {v}"),
        none    => io.println("empty"),
    }

    let hits: AtomicInt = new AtomicInt(0)
    hits.add_and_get(1)
    io.println("hits {hits.load()}")
}
```

## Readiness waits

To wait for a socket without blocking a thread, use the [async](/guide/async/)
model together with `std.net`'s `readable`/`writable`, or the
[`std.poll`](/reference/stdlib/poll/) poller for many descriptors at once.
