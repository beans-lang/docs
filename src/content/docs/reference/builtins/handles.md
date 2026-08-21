---
title: Ownership handles
description: The built-in handle types for owning, sharing, locking, and moving values across threads.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 8 types · 22 instance methods.
<!-- coverage:summary:end -->

An **ownership handle** is a builtin type that owns a value and controls how you
reach it. Different handles give different rules: one owner, shared owners,
locked access, or a value sent between threads. This page lists each handle and
its methods. For the full ownership model, read [the memory model](/guide/memory/).
For threads and channels in context, see [concurrency](/guide/concurrency/).

`Box`, `Arena`, `Shared`, and `Mutex` are move-only outer handles, like `List` and
`Map`. When you bind, assign, or return one, use `move`. Function parameters borrow
by default.

`Box<T>` and `Arena<T>` implement `Send` when `T` does. `List<T>` follows the
same rule; `Map<K, V>` and `OrderedMap<K, V>` require both stored types to be
`Send`.

## Box&lt;T&gt;

`Box<T>` owns one value on the heap. It is a move-only handle.

```beans
new Box(value)
Box<T>.get() -> T
Box<T>.set(T)
```

- `new Box(value)` allocates one heap slot and takes ownership of `value`.
- `get()` returns a copy of the value; `set(value)` replaces it.

```beans
let b: Box<int> = new Box(10)
b.set(20)
let n: int = b.get()
```

## Arena&lt;T&gt;

`Arena<T>` holds many values and hands back a stable integer handle for each. It is
move-only.

```beans
new Arena(capacity)
Arena<T>.add(T) -> int
Arena<T>.at(int) -> T
Arena<T>.get(int) -> Option<T>
Arena<T>.len() -> int
Arena<T>.clear()
```

- `new Arena(capacity)` starts with room for `capacity` items.
- `add(value)` stores `value` and returns its handle.
- `at(handle)` reads by handle and panics if the handle is bad; `get(handle)`
  reads by handle and returns `none` instead of panicking.
- `len()` is the number of items; `clear()` removes them all.

## Shared&lt;T&gt;

`Shared<T>` gives thread-safe shared ownership. Many owners can hold the same
value; the value lives until the last owner is gone. Copying the handle adds an
owner.

```beans
new Shared(value)
Shared<T>.get() -> T
Shared<T>.downgrade() -> Weak<T>
```

- `get()` returns a copy of the value.
- `downgrade()` makes a `Weak<T>` that does not keep the value alive.

`Shared<T>` is `Send` and `Sync` only when `T` is both.

## Weak&lt;T&gt;

`Weak<T>` points at a `Shared<T>` value without keeping it alive. Use it to break
reference cycles.

```beans
Weak<T>.upgrade() -> Option<Shared<T>>
Weak<T>.is_expired() -> bool
```

- `upgrade()` returns a real owner again, or `none` if the value is already gone.
- `is_expired()` is true once the value is gone.

```beans
let s: Shared<int> = new Shared(1)
let w: Weak<int> = s.downgrade()
match w.upgrade() {
    some(owner) => io.println("{owner.get()}"),
    none => io.println("gone"),
}
```

## Mutex&lt;T&gt;

`Mutex<T>` guards a value so only one thread touches it at a time. It is move-only.

```beans
new Mutex(value)
Mutex<T>.with_lock(fn(T) -> unit)
```

- `with_lock` takes the lock, runs your function on the value, then releases the
  lock. The lock is held only for the length of the call.

```beans
let m: Mutex<int> = new Mutex(0)
m.with_lock(fn(v: int) -> unit {
    io.println("locked value is {v}")
})
```

## Channel&lt;T&gt;

`Channel<T>` sends values between threads. It holds up to `capacity` items.

```beans
new Channel(capacity)
Channel<T>.send(T)
Channel<T>.receive() -> Option<T>
Channel<T>.close()
```

- `send(x)` puts a value in.
- `receive()` takes a value out; it returns `none` once the channel is closed and
  empty.
- `close()` says no more values will be sent.

## Thread&lt;T&gt;

`Thread<T>` is a running thread. You do not make one with `new`; you get it from
`thread.spawn` (see [concurrency](/guide/concurrency/) and the
[standard library](/reference/stdlib/)).

```beans
Thread<T>.join() -> T
Thread<T>.detach()
```

- `join()` waits for the thread to finish and returns its result.
- `detach()` lets the worker finish on its own and discards its result. Use it
  only when no later work depends on completion.

## AtomicInt

`AtomicInt` is a single integer that many threads can update safely. Its
operations are sequentially consistent.

```beans
new AtomicInt(0)
AtomicInt.load() -> int
AtomicInt.store(int)
AtomicInt.add_and_get(int) -> int
```

- `new AtomicInt(0)` starts the counter at a value.
- `load()` reads it; `store(v)` writes it.
- `add_and_get(v)` adds `v` and returns the new value.

```beans
let count: AtomicInt = new AtomicInt(0)
let now: int = count.add_and_get(1)
```

:::note[AtomicInt is not Atomic]
`AtomicInt` is a simple, always sequentially consistent counter. For fine control
over memory ordering and more operations, use
[`Atomic<T>`](/reference/builtins/atomics/) instead.
:::

## Handles working together

A counter guarded across two threads, joined with `Thread.join`:

<!-- beans:compile -->
```beans
import std.io
import std.thread

fn main() {
    let counter: AtomicInt = new AtomicInt(0)

    let a: Thread<int> = thread.spawn(fn() -> int {
        var i: int = 0
        for i < 1000 {
            counter.add_and_get(1)
            i += 1
        }
        return 0
    })
    let b: Thread<int> = thread.spawn(fn() -> int {
        var i: int = 0
        for i < 1000 {
            counter.add_and_get(1)
            i += 1
        }
        return 0
    })
    a.join()
    b.join()

    io.println("counted {counter.load()}")
}
```

## See also

- [The memory model](/guide/memory/), ownership, move, and borrowing.
- [Concurrency](/guide/concurrency/), threads, channels, and locks in use.
- [Atomics](/reference/builtins/atomics/), `Atomic<T>` and `MemoryOrder`.
