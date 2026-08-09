---
title: Threads and channels
description: A walk through examples/threads.b, and how wide struct and enum values move across channels and through a mutex.
---

Beans uses real OS threads (there are no green threads). This page walks through
[`threads.b`](https://github.com/beans-lang/beans/blob/main/examples/threads.b)
and then shows how full struct and enum values travel across channels
([`wide_concurrency.b`](https://github.com/beans-lang/beans/blob/main/examples/wide_concurrency.b))
and through a mutex
([`wide_sync.b`](https://github.com/beans-lang/beans/blob/main/examples/wide_sync.b)).

The three concurrency tools are `Thread`, `Channel`, and `Mutex`, from
`std.thread`.

## threads.b

Most of `threads.b` is a recap of the language (generics, enums, `Option`,
`decimal`); the concurrency part is at the end.

### Spawning a thread

```beans
import std.thread

let t: Thread<int> = thread.spawn(fn() -> int {
    return 21 * 2
})
io.println(t.join())
```

`thread.spawn` takes a function and runs it on a new OS thread. It returns a
`Thread<int>` because the function returns `int`. `t.join()` waits for the
thread to finish and hands back its return value (`42`).

### A mutex

```beans
let shared: Mutex<Counter> = new Mutex(new Counter("shared"))
shared.with_lock(fn(c: Counter) {
    c.bump(5)
})
```

A `Mutex<Counter>` wraps a value so only one thread touches it at a time. You do
not lock and unlock by hand — you call `with_lock` with a function, and the lock
is held for exactly that function and released after. The locked value is passed
in as `c`.

### A channel

```beans
let ch: Channel<string> = new Channel(8)
ch.send("job")
defer ch.close()
```

A `Channel<string>` is a queue between threads. `new Channel(8)` makes one with
room for 8 buffered messages. `send` puts a value in. `defer ch.close()` closes
the channel when the current scope ends — `defer` runs its statement on the way
out, no matter how you leave.

Run it:

```bash
beansc run examples/threads.b
```

## Wide values across a channel: wide_concurrency.b

"Wide" means a full value type — a `struct` or an `enum` with payload — not just
a number or a pointer. `wide_concurrency.b` proves these travel across channels
and thread boundaries intact.

```beans
import std.io
import std.thread

struct Event {
    label: string
    value: int
}

fn send_one(ch: Channel<Event>, e: Event) {
    ch.send(e)
}

fn main() {
    let messages: Channel<Event> = new Channel(1)
    let sender: Thread<[i64; 2]> = thread.spawn(fn() -> [i64; 2] {
        send_one(messages, Event { label: "from worker", value: 41 })
        return [7, 8]
    })
    let event: Event = messages.receive().expect("event")
    let result: [i64; 2] = sender.join()
    io.println("channel {event.label} {event.value}")
    io.println("thread array {result[0]} {result[1]}")
    messages.close()
    io.println("channel closed {messages.receive().is_none()}")
}
```

Things to notice:

- The channel carries a whole `Event` struct. `receive()` returns an
  `Option<Event>` — `.expect("event")` unwraps it or panics with that message.
- A thread can return a fixed-size array (`[i64; 2]`); `join()` gives it back.
- After `close()`, `receive()` returns `none`, so `.is_none()` is `true`. That
  is how a reader learns the channel is done.

The example also sends `int`, `decimal`, and even a `Result<Pair>` through
channels — any type works:

```beans
let guarded: Channel<Result<Pair>> = new Channel(1)
guarded.send(err("channel error"))
match guarded.receive().expect("result") {
    ok(pair) => { io.println("bad {pair.left}") },
    err(error) => { io.println("channel result {error.msg}") },
}
```

Run it:

```bash
beansc run examples/wide_concurrency.b
```

## Wide values through a mutex: wide_sync.b

`wide_sync.b` does the same for shared state: it puts wide values behind
`Shared`, `Weak`, and `Mutex`.

```beans
let mutex: Mutex<Event> = guard(Event { label: "locked", value: 9 })
mutex.with_lock(fn(value: Event) {
    io.println("mutex {value.label} {value.value}")
})
```

`with_lock` hands the guarded `Event` to the function while the lock is held.

```beans
let worker: Thread<int> = thread.spawn(fn() -> int {
    let event: Event = shared.get()
    return event.value + 1
})
io.println("thread {worker.join()}")
```

`Shared<T>` is a reference-counted value many threads can hold; `shared.get()`
reads it. The file also shows `Weak<T>` (a non-owning reference that can expire)
via `downgrade()`, `upgrade()`, and `is_expired()`.

Run it:

```bash
beansc run examples/wide_sync.b
```

## Where to go next

- [Atomics](/examples/atomics/) — lock-free shared cells with explicit ordering.
- [Concurrency](/guide/concurrency/) — the full concurrency guide.
- [Ownership handles](/reference/builtins/handles/) — `Shared`, `Weak`, `Box`, and friends.
