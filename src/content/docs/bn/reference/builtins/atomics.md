---
title: Atomics
description: lock-free integer আর bool cell-এর জন্য Atomic type, memory ordering, fence, আর wait/notify।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 2 types · 1 static method · 13 instance methods · 5 enum variants.
<!-- coverage:summary:end -->

`Atomic<T>` হলো একটা মাত্র cell, যেটা অনেক thread কোনো lock ছাড়াই নিরাপদে পড়তে আর
বদলাতে পারে। প্রতিটা বদল একটাই ভাঙা যায় না এমন ধাপ। এই পেজে প্রতিটা operation,
পাঁচটা memory order, আর wait/notify call গুলো দেওয়া আছে। thread নিয়ে সাধারণ
আলোচনার জন্য [concurrency](/bn/guide/concurrency/) দেখুন।

## Atomic কী ধরে রাখে

একটা `Atomic<T>` ঠিক একটা integer বা একটা `bool` ধরে রাখে। এটা কোনো `decimal` বা
float ধরতে পারে না।

```beans
let counter: Atomic<i64> = new Atomic<i64>(0)
```

একটা সরু cell তার চওড়ার মধ্যে wrap করে। `Atomic<bool>` হলো এক-byte-এর cell, যেটা
0 বা 1 ধরে রাখে।

## Operation গুলো

প্রতিটা read-modify-write operation যে value-টাকে বদলে দিল সেটাই (পুরনো value) ফেরত
দেয়।

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

- `load(order)` value-টা পড়ে; `store(v, order)` `v` লেখে।
- `exchange(v, order)` `v` বসায় আর পুরনো value-টা ফেরত দেয়।
- `fetch_add(v, order)` আর `fetch_sub(v, order)` যোগ বা বিয়োগ করে আর পুরনো
  value-টা ফেরত দেয়। দুইটার জন্যই একটা integer cell লাগে।
- `fetch_and`, `fetch_or`, আর `fetch_xor` একটা bitwise operation করে আর পুরনো
  value-টা ফেরত দেয়।
- `compare_exchange(expected, desired, success_order, failure_order)` cell-টাকে
  `expected`-এর সাথে মেলায়; মিলে গেলে `desired` বসায় আর `true` দেয়, না মিললে
  cell-টাকে যেমন আছে তেমন রেখে দিয়ে `false` দেয়। এটা দুইটা order নেয়: একটা সেই
  পথের জন্য যেটা লিখল, আরেকটা সেই পথের জন্য যেটা অন্য value পেয়ে কিছুই করল না।

bitwise আর exchange operation গুলো `Atomic<bool>`-এও কাজ করে; `fetch_add` আর
`fetch_sub` করে না।

## MemoryOrder

প্রতিটা operation একটা memory order নেয়, যেটা বলে দেয় তার ordering কতটা কড়া হতে
হবে। `MemoryOrder`-এ ঠিক পাঁচটা selector আছে:

- `MemoryOrder.relaxed`
- `MemoryOrder.acquire`
- `MemoryOrder.release`
- `MemoryOrder.acq_rel`
- `MemoryOrder.seq_cst`

:::caution[MemoryOrder কোনো type না]
`MemoryOrder` এমন একটা type না যেটা declare করা যায়, আর এমন কোনো value-ও না
যেটা জমিয়ে রাখা যায়। order-টা সব সময় call site-এ সরাসরি লেখা হয়, যেমন
`MemoryOrder.acquire`।
:::

### Ordering-এর নিয়ম

যেসব order-এর কোনো অর্থ নেই, compiler সেগুলো বাতিল করে দেয়:

- একটা `load` `release` বা `acq_rel` ব্যবহার করতে পারে না।
- একটা `store` `acquire` বা `acq_rel` ব্যবহার করতে পারে না।
- একটা `compare_exchange`-এর failure order `release` ব্যবহার করতে পারে না, আর তার
  success order-এর চেয়ে কড়া হতে পারে না।

এগুলোর যেকোনোটা ভাঙলে compile error হয়।

## Fence

`Atomic.fence(order)` হলো একটা static call, যেটা কোনো একটা cell-এ হাত না দিয়ে
memory-কে order করে। registry-তে এর signature হলো:

```beans
Atomic<T>.fence(MemoryOrder)
```

এটা type-এর ওপর call করা হয়, আর call site-এ order-টা নাম ধরে বলা হয়:

```beans
Atomic.fence(MemoryOrder.seq_cst)
```

## Wait আর notify

এগুলো একটা thread-কে ঘুমাতে দেয়, একটা cell বদলানো পর্যন্ত।

```beans
Atomic<T>.wait(T, MemoryOrder)
Atomic<T>.wait_timeout(T, int, MemoryOrder) -> bool
Atomic<T>.notify_one() -> int
Atomic<T>.notify_all() -> int
```

- `wait(expected, order)` block করে থাকে যতক্ষণ cell-টা এখনো `expected` ধরে
  রাখে।
- `wait_timeout(expected, nanos, order)` `nanos` ন্যানোসেকেন্ড পর্যন্ত অপেক্ষা
  করে, আর সময় ফুরিয়ে গেলে `true` দেয়।
- `notify_one()` একজন waiter-কে জাগায় আর `notify_all()` সবাইকে জাগায়; প্রতিটা কতজন
  জাগল সেটা ফেরত দেয়।

একটা wakeup শুধুই একটা ইঙ্গিত। জাগার পর সব সময় একটা loop-এ value-টা আবার যাচাই
করতে হয়।

## পুরো উদাহরণ

দুইটা thread থেকে চালানো একটা relaxed counter, তারপর সেটা পড়ে নেওয়া:

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

## আরও দেখুন

- [Ownership handle](/bn/reference/builtins/handles/), `AtomicInt` একটা সহজ, সব সময়
  sequentially consistent counter।
- [Concurrency](/bn/guide/concurrency/), thread, channel, আর lock।
