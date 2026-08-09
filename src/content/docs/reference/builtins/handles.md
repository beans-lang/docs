---
title: Ownership handles
description: The built-in handle types for owning, sharing, locking, and moving values across threads.
---

An **ownership handle** is a builtin type that owns a value and controls how you
reach it. Different handles give different rules: one owner, shared owners,
locked access, or a value sent between threads. This page lists each handle and
its methods. For the full ownership model, read [the memory model](/guide/memory/).
For threads and channels in context, see [concurrency](/guide/concurrency/).

`Box`, `Arena`, `Shared`, and `Mutex` are move-only outer handles, like `List` and
`Map`. When you bind, assign, or return one, use `move`. Function parameters borrow
by default.

## Box&lt;T&gt;

`Box<T>` owns one value on the heap. It is a move-only handle.

| Member | Signature | Notes |
| --- | --- | --- |
| make | `new Box(value)` | takes ownership of `value` |
| `get()` | `-> T` | read the value |
| `set(value)` | | replace the value |

```beans
let b: Box<int> = new Box(10)
b.set(20)
let n: int = b.get()
```

## Arena&lt;T&gt;

`Arena<T>` holds many values and hands back a stable integer handle for each. It is
move-only.

| Member | Signature | Notes |
| --- | --- | --- |
| make | `new Arena(capacity)` | start with room for `capacity` items |
| `add(value)` | `-> int` | store `value`, return its handle |
| `at(handle)` | `-> T` | read by handle; panics if the handle is bad |
| `get(handle)` | `-> Option<T>` | read by handle, or `none` |
| `len()` | `-> int` | number of items |
| `clear()` | | remove all items |

## Shared&lt;T&gt;

`Shared<T>` gives thread-safe shared ownership. Many owners can hold the same
value; the value lives until the last owner is gone.

| Member | Signature | Notes |
| --- | --- | --- |
| make | `new Shared(value)` | |
| `get()` | `-> T` | read the value |
| `downgrade()` | `-> Weak<T>` | make a weak reference that does not keep the value alive |

`Shared<T>` is `Send` and `Sync` only when `T` is both.

## Weak&lt;T&gt;

`Weak<T>` points at a `Shared<T>` value without keeping it alive. Use it to break
reference cycles.

| Member | Signature | Notes |
| --- | --- | --- |
| `upgrade()` | `-> Option<Shared<T>>` | get a real owner back, or `none` if the value is gone |
| `is_expired()` | `-> bool` | true if the value is already gone |

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

| Member | Signature | Notes |
| --- | --- | --- |
| make | `new Mutex(value)` | |
| `with_lock(fn(T) -> unit)` | | lock, run your function on the value, then unlock |

```beans
let m: Mutex<int> = new Mutex(0)
m.with_lock(fn(v: int) -> unit {
    io.println("locked value is {v}")
})
```

## Channel&lt;T&gt;

`Channel<T>` sends values between threads. It holds up to `capacity` items.

| Member | Signature | Notes |
| --- | --- | --- |
| make | `new Channel(capacity)` | |
| `send(x)` | | put a value in |
| `receive()` | `-> Option<T>` | take a value out; `none` when the channel is closed and empty |
| `close()` | | no more values will be sent |

## Thread&lt;T&gt;

`Thread<T>` is a running thread. You do not make one with `new`; you get it from
`thread.spawn` (see [concurrency](/guide/concurrency/) and the
[standard library](/reference/stdlib/)).

| Member | Signature | Notes |
| --- | --- | --- |
| `join()` | `-> T` | wait for the thread to finish and get its result |

## AtomicInt

`AtomicInt` is a single integer that many threads can update safely. Its
operations are sequentially consistent.

| Member | Signature | Notes |
| --- | --- | --- |
| make | `new AtomicInt(0)` | start at a value |
| `load()` | `-> int` | read |
| `store(v)` | | write |
| `add_and_get(v)` | `-> int` | add `v` and return the new value |

```beans
let count: AtomicInt = new AtomicInt(0)
let now: int = count.add_and_get(1)
```

:::note[AtomicInt is not Atomic]
`AtomicInt` is a simple, always sequentially consistent counter. For fine control
over memory ordering and more operations, use
[`Atomic<T>`](/reference/builtins/atomics/) instead.
:::

## See also

- [The memory model](/guide/memory/) — ownership, move, and borrowing.
- [Concurrency](/guide/concurrency/) — threads, channels, and locks in use.
- [Atomics](/reference/builtins/atomics/) — `Atomic<T>` and `MemoryOrder`.
