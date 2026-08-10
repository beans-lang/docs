---
title: Atomics
description: A line-by-line walk through examples/atomics.b, covering typed atomic cells with explicit memory ordering.
---

An atomic is a shared cell holding one integer or bool that several threads may
touch at once, safely, without a lock. Beans spells this `Atomic<T>`, and every
operation names the **memory order** it needs.
[`atomics.b`](https://github.com/beans-lang/beans/blob/main/examples/atomics.b)
walks through all of it. This page follows the file in order.

## What the ordering is for

The order says what else the processor and compiler may move across this access.
It is written at the call site and **cannot be a variable**, because LLVM puts
the ordering inside the instruction. One call site is one instruction, and the
compiler can reject a combination that makes no sense.

The orders are `MemoryOrder.relaxed`, `.release`, `.acquire`, `.acq_rel`, and
`.seq_cst`.

## A relaxed counter

```beans
let counter: Atomic<i64> = new Atomic<i64>(0)

let first: Thread<int> = thread.spawn(fn() -> int {
    var i: int = 0
    for i < 10000 {
        counter.fetch_add(1, MemoryOrder.relaxed)
        i += 1
    }
    return 0
})
// ... a second identical thread ...
first.join()
second.join()

io.println("counted {counter.load(MemoryOrder.seq_cst)}")
```

Two threads each add 1 ten thousand times. `fetch_add` is one indivisible add,
so no update is lost. `relaxed` is the right order here: nobody reads the
counter until both threads have finished, so no ordering guarantee is needed,
only the indivisibility. The final `load` prints `20000`.

## Release and acquire

```beans
let payload: Atomic<i64> = new Atomic<i64>(0)
let ready: Atomic<bool> = new Atomic<bool>(false)
let writer: Thread<int> = thread.spawn(fn() -> int {
    payload.store(42, MemoryOrder.relaxed)
    ready.store(true, MemoryOrder.release)
    return 0
})

let reader: Thread<int> = thread.spawn(fn() -> int {
    for !ready.load(MemoryOrder.acquire) {
    }
    return 0
})
```

This is the standard publish/subscribe pattern. The writer stores the payload,
then flips `ready` with `release`. A reader that sees `ready` true with
`acquire` is guaranteed to also see the payload. If both used `relaxed` here,
the reader could see the flag set but a stale payload.

## compare_exchange

```beans
let slot: Atomic<i32> = new Atomic<i32>(1)
let took: bool = slot.compare_exchange(1, 2, MemoryOrder.acq_rel, MemoryOrder.acquire)
let missed: bool = slot.compare_exchange(1, 3, MemoryOrder.acq_rel, MemoryOrder.acquire)
io.println("cas {took} {missed} value {slot.load(MemoryOrder.relaxed)}")
```

`compare_exchange(expected, new, ...)` writes `new` only if the cell currently
holds `expected`. It takes **two** orders: one for the path that wrote, one for
the path that found a different value and did nothing. The first call succeeds
(`1` → `2`, `took` is `true`); the second fails (`slot` is now `2`, not `1`,
so `missed` is `false`).

## exchange

```beans
let held: Atomic<bool> = new Atomic<bool>(false)
io.println("lock {held.exchange(true, MemoryOrder.acq_rel)} then {held.exchange(true, MemoryOrder.acq_rel)}")
```

`exchange` stores a new value and returns the **previous** one. That returned
previous value is what makes it a lock: the first `exchange` returns `false`
(you got it), the second returns `true` (someone already had it).

## Bit operations

```beans
let bits: Atomic<u32> = new Atomic<u32>(12)
io.println("or {bits.fetch_or(3, MemoryOrder.relaxed)}")
io.println("and {bits.fetch_and(6, MemoryOrder.relaxed)}")
io.println("xor {bits.fetch_xor(1, MemoryOrder.relaxed)}")
io.println("bits {bits.load(MemoryOrder.relaxed)}")
```

`fetch_or`, `fetch_and`, and `fetch_xor` each apply the operation and return the
value they replaced.

## Width wraps like the machine

```beans
let small: Atomic<u8> = new Atomic<u8>(250)
io.println("u8 {small.fetch_add(10, MemoryOrder.relaxed)} wraps to {small.load(MemoryOrder.relaxed)}")
let signed: Atomic<i16> = new Atomic<i16>(32760)
io.println("i16 {signed.fetch_add(10, MemoryOrder.relaxed)} wraps to {signed.load(MemoryOrder.relaxed)}")
```

A narrow cell wraps inside its own width, exactly as the hardware does. `250 +
10` in a `u8` wraps to `4`.

## A standalone fence

```beans
Atomic.fence(MemoryOrder.seq_cst)
io.println("fenced")
```

`Atomic.fence` is a barrier that orders the accesses around it without touching
any single cell.

## wait and notify

```beans
let gate: Atomic<i32> = new Atomic<i32>(0)
let worker: Thread<int> = thread.spawn(fn() -> int {
    for gate.load(MemoryOrder.acquire) == 0 {
        gate.wait(0, MemoryOrder.acquire)
    }
    return gate.load(MemoryOrder.acquire) as int
})
gate.store(9, MemoryOrder.release)
gate.notify_all()
io.println("worker saw {worker.join()}")
```

`wait(value, order)` blocks while the cell still holds `value`; `notify_all`
wakes waiters. A wakeup is a hint, never a promise: the value may have moved and
moved back, or the wakeup may be meant for another cell, so the check goes in a
loop. This is cheaper than spinning because the waiter is parked by the OS
instead of burning a core.

## Bounded waits

```beans
let still: Atomic<i32> = new Atomic<i32>(3)
io.println("timed out {!still.wait_timeout(3, 2000000, MemoryOrder.acquire)}")
io.println("no wait needed {still.wait_timeout(99, 2000000, MemoryOrder.acquire)}")
io.println("woke {still.notify_all()} and {still.notify_one()}")
```

`wait_timeout` cannot hang: the cell holds `3` and never changes, so the budget
(2,000,000 ns) runs out and it reports the timeout. Waiting for a value the cell
does not currently hold returns at once. And `notify_all` / `notify_one` on a
cell nobody is parked on simply wake nothing.

Run it:

```bash
beansc run examples/atomics.b
```

[Atomics and MemoryOrder](/reference/builtins/atomics/) is the full reference.
[Threads and channels](/examples/threads/) covers the higher-level tools, and
the [concurrency guide](/guide/concurrency/) puts them in context.
