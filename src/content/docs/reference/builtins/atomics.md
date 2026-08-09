---
title: Atomics
description: The Atomic type for lock-free integer and bool cells, memory ordering, fences, and wait/notify.
---

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

| Operation | Signature | Notes |
| --- | --- | --- |
| `load(order)` | `-> T` | read the value |
| `store(v, order)` | | write `v` |
| `exchange(v, order)` | `-> T` | set `v`, return the old value |
| `fetch_add(v, order)` | `-> T` | add `v`, return the old value (integer only) |
| `fetch_sub(v, order)` | `-> T` | subtract `v`, return the old value (integer only) |
| `fetch_and(v, order)` | `-> T` | bitwise and, return the old value |
| `fetch_or(v, order)` | `-> T` | bitwise or, return the old value |
| `fetch_xor(v, order)` | `-> T` | bitwise xor, return the old value |
| `compare_exchange(expected, desired, success_order, failure_order)` | `-> bool` | if the cell equals `expected`, set it to `desired` and return `true` |

`fetch_add` and `fetch_sub` need an integer cell. The rest also work on
`Atomic<bool>`.

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
cell.

```beans
Atomic.fence(MemoryOrder.seq_cst)
```

## Wait and notify

These let a thread sleep until a cell changes.

| Operation | Signature | Notes |
| --- | --- | --- |
| `wait(expected, order)` | | block while the cell still holds `expected` |
| `wait_timeout(expected, nanos, order)` | `-> bool` | wait up to `nanos` nanoseconds |
| `notify_one()` | `-> int` | wake one waiter; returns how many were woken |
| `notify_all()` | `-> int` | wake all waiters; returns how many were woken |

A wakeup is only a hint. Always recheck the value in a loop after waking.

## Full example

```beans
let counter: Atomic<i64> = new Atomic<i64>(0)
counter.fetch_add(1, MemoryOrder.relaxed)
let seen: i64 = counter.load(MemoryOrder.acquire)
let took: bool = counter.compare_exchange(0, 1, MemoryOrder.acq_rel, MemoryOrder.acquire)
Atomic.fence(MemoryOrder.seq_cst)
```

## See also

- [Ownership handles](/reference/builtins/handles/) — `AtomicInt` is a simpler,
  always sequentially consistent counter.
- [Concurrency](/guide/concurrency/) — threads, channels, and locks.
