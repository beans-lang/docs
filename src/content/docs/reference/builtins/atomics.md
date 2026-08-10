---
title: Atomics
description: The Atomic type for lock-free integer and bool cells, memory ordering, fences, and wait/notify.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 2 types · 1 static method · 13 instance methods · 5 enum variants.
<!-- coverage:summary:end -->

`Atomic<T>` is a single cell that many threads can read and change safely, without
a lock. Each change is one indivisible step. This page lists every operation, the
five memory orders, and the wait/notify calls. For threads in general, see
[concurrency](/guide/concurrency/).

## What Atomic holds

An `Atomic<T>` holds exactly one integer or one `bool`. It cannot hold a `decimal`
or a float.

```beans
let counter: Atomic<i64> = new Atomic<i64>(0)
```

A narrow cell wraps within its width. `Atomic<bool>` is a one-byte cell holding 0
or 1.

## Operations

Every read-modify-write operation returns the value it replaced (the old value).

```beans
Atomic<T>.load(MemoryOrder) -> T
Atomic<T>.store(T, MemoryOrder)
Atomic<T>.exchange(T, MemoryOrder) -> T
Atomic<T>.fetch_add(T, MemoryOrder) -> T
Atomic<T>.fetch_sub(T, MemoryOrder) -> T
Atomic<T>.fetch_and(T, MemoryOrder) -> T
Atomic<T>.fetch_or(T, MemoryOrder) -> T
Atomic<T>.fetch_xor(T, MemoryOrder) -> T
Atomic<T>.compare_exchange(T, T, MemoryOrder, MemoryOrder) -> bool
```

- `load(order)` reads the value; `store(v, order)` writes `v`.
- `exchange(v, order)` sets `v` and returns the old value.
- `fetch_add(v, order)` and `fetch_sub(v, order)` add or subtract and return the
  old value. Both need an integer cell.
- `fetch_and`, `fetch_or`, and `fetch_xor` do a bitwise operation and return the
  old value.
- `compare_exchange(expected, desired, success_order, failure_order)` compares the
  cell with `expected`; if they match it sets `desired` and returns `true`,
  otherwise it leaves the cell alone and returns `false`. It takes two orders: one
  for the path that wrote, one for the path that found a different value and did
  nothing.

The bitwise and exchange operations also work on `Atomic<bool>`; `fetch_add` and
`fetch_sub` do not.

## MemoryOrder

Each operation takes a memory order that says how strict its ordering must be.
`MemoryOrder` has exactly five selectors:

- `MemoryOrder.relaxed`
- `MemoryOrder.acquire`
- `MemoryOrder.release`
- `MemoryOrder.acq_rel`
- `MemoryOrder.seq_cst`

:::caution[MemoryOrder is not a type]
`MemoryOrder` is not a type you can declare, and not a value you can store. The
order is always written directly at the call site, like `MemoryOrder.acquire`.
:::

### Ordering rules

The compiler rejects orders that do not make sense:

- A `load` cannot use `release` or `acq_rel`.
- A `store` cannot use `acquire` or `acq_rel`.
- A `compare_exchange` failure order cannot use `release`, and cannot be stronger
  than its success order.

Breaking any of these is a compile error.

## Fences

`Atomic.fence(order)` is a static call that orders memory without touching any one
cell. Its signature in the registry is:

```beans
Atomic<T>.fence(MemoryOrder)
```

You call it on the type, naming the order at the call site:

```beans
Atomic.fence(MemoryOrder.seq_cst)
```

## Wait and notify

These let a thread sleep until a cell changes.

```beans
Atomic<T>.wait(T, MemoryOrder)
Atomic<T>.wait_timeout(T, int, MemoryOrder) -> bool
Atomic<T>.notify_one() -> int
Atomic<T>.notify_all() -> int
```

- `wait(expected, order)` blocks while the cell still holds `expected`.
- `wait_timeout(expected, nanos, order)` waits up to `nanos` nanoseconds and
  returns `true` if it timed out.
- `notify_one()` wakes one waiter and `notify_all()` wakes all of them; each
  returns how many were woken.

A wakeup is only a hint. Always recheck the value in a loop after waking.

## Full example

A relaxed counter run from two threads, then read back:

<!-- beans:compile -->
```beans
import std.io
import std.thread

fn main() {
    let counter: Atomic<i64> = new Atomic<i64>(0)

    let first: Thread<int> = thread.spawn(fn() -> int {
        var i: int = 0
        for i < 10000 {
            counter.fetch_add(1, MemoryOrder.relaxed)
            i += 1
        }
        return 0
    })
    let second: Thread<int> = thread.spawn(fn() -> int {
        var i: int = 0
        for i < 10000 {
            counter.fetch_add(1, MemoryOrder.relaxed)
            i += 1
        }
        return 0
    })
    first.join()
    second.join()

    let took: bool = counter.compare_exchange(20000, 0, MemoryOrder.acq_rel, MemoryOrder.acquire)
    Atomic.fence(MemoryOrder.seq_cst)
    io.println("counted {counter.load(MemoryOrder.acquire)} reset {took}")
}
```

## See also

- [Ownership handles](/reference/builtins/handles/), `AtomicInt` is a simpler,
  always sequentially consistent counter.
- [Concurrency](/guide/concurrency/), threads, channels, and locks.
