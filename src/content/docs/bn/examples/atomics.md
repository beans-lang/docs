---
title: Atomics
description: examples/atomics.b লাইন ধরে ধরে ঘুরে দেখা — explicit memory ordering সহ typed atomic cell।
---

atomic হলো একটা shared cell — একটা integer বা bool ধরে রাখে, আর কয়েকটা thread
একসাথে সেটায় হাত দিতে পারে, নিরাপদে, কোনো lock ছাড়াই। Beans-এ এটাকে লেখা হয়
`Atomic<T>`, আর প্রতিটা operation বলে দেয় ওর কোন **memory order** লাগবে।
[`atomics.b`](https://github.com/beans-lang/beans/blob/main/examples/atomics.b)
পুরোটা ঘুরে দেখায়। এই পেজটা ফাইলটাকে ঠিক ওই ক্রমেই ধরে এগোয়।

## ordering-টা কীসের জন্য

order বলে দেয় — এই access-টার এদিক-ওদিক processor আর compiler আর কী কী সরাতে
পারবে। এটা লেখা হয় call করার জায়গাতেই, আর এটা **কোনো variable হতে পারবে না** —
কারণ LLVM ordering-টা instruction-এর ভেতরেই বসিয়ে দেয়। একটা call site হলো একটা
instruction, আর যেই combination-টার কোনো অর্থ হয় না সেটা compiler নাকচ করে দিতে পারে।

order-গুলো হলো `MemoryOrder.relaxed`, `.release`, `.acquire`, `.acq_rel`, আর
`.seq_cst`।

## একটা relaxed counter

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

দুইটা thread, প্রত্যেকে দশ হাজার বার করে ১ যোগ করে। `fetch_add` হলো একটা
ভাঙা যায় না এমন একটা যোগ, তাই কোনো update হারায় না। এখানে `relaxed`-ই ঠিক order:
দুইটা thread শেষ হওয়ার আগে কেউ counter পড়ছে না, তাই ordering-এর কোনো গ্যারান্টি
দরকার নেই — শুধু দরকার এটা যেন ভাগ না হয়ে যায়। শেষের `load` প্রিন্ট করে `20000`।

## Release আর acquire

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

এটাই সেই চেনা publish/subscribe প্যাটার্ন। writer আগে payload-টা store করে, তারপর
`release` দিয়ে `ready`-টা উল্টে দেয়। যেই reader `acquire` দিয়ে `ready`-কে true
দেখে, তার payload-টাও দেখা নিশ্চিত। এখানে দুইজনই যদি `relaxed` ব্যবহার করত, তাহলে
reader flag-টা set দেখেও একটা পুরনো payload দেখতে পারত।

## compare_exchange

```beans
let slot: Atomic<i32> = new Atomic<i32>(1)
let took: bool = slot.compare_exchange(1, 2, MemoryOrder.acq_rel, MemoryOrder.acquire)
let missed: bool = slot.compare_exchange(1, 3, MemoryOrder.acq_rel, MemoryOrder.acquire)
io.println("cas {took} {missed} value {slot.load(MemoryOrder.relaxed)}")
```

`compare_exchange(expected, new, ...)` তখনই `new` লেখে যখন cell-টায় এখন `expected`
আছে। এটা **দুইটা** order নেয়: একটা যেই পথ লিখল তার জন্য, আরেকটা যেই পথ ভিন্ন একটা
value পেয়ে কিছুই করল না তার জন্য। প্রথম call সফল হয় (`1` → `2`, `took` হয় `true`);
দ্বিতীয়টা fail করে (`slot` এখন `2`, `1` না, তাই `missed` হয় `false`)।

## exchange

```beans
let held: Atomic<bool> = new Atomic<bool>(false)
io.println("lock {held.exchange(true, MemoryOrder.acq_rel)} then {held.exchange(true, MemoryOrder.acq_rel)}")
```

`exchange` একটা নতুন value store করে আর **আগের** value-টা ফেরত দেয়। ওই ফেরত-দেওয়া
আগের value-টাই এটাকে একটা lock বানিয়ে দেয়: প্রথম `exchange` `false` দেয় (lock
পাওয়া গেল), দ্বিতীয়টা `true` দেয় (কেউ একজন আগেই নিয়ে বসে আছে)।

## Bit operation

```beans
let bits: Atomic<u32> = new Atomic<u32>(12)
io.println("or {bits.fetch_or(3, MemoryOrder.relaxed)}")
io.println("and {bits.fetch_and(6, MemoryOrder.relaxed)}")
io.println("xor {bits.fetch_xor(1, MemoryOrder.relaxed)}")
io.println("bits {bits.load(MemoryOrder.relaxed)}")
```

`fetch_or`, `fetch_and`, আর `fetch_xor` প্রত্যেকে operation-টা চালায় আর যেই
value-কে বদলে দিল সেটা ফেরত দেয়।

## Width মেশিনের মতোই wrap করে

```beans
let small: Atomic<u8> = new Atomic<u8>(250)
io.println("u8 {small.fetch_add(10, MemoryOrder.relaxed)} wraps to {small.load(MemoryOrder.relaxed)}")
let signed: Atomic<i16> = new Atomic<i16>(32760)
io.println("i16 {signed.fetch_add(10, MemoryOrder.relaxed)} wraps to {signed.load(MemoryOrder.relaxed)}")
```

একটা সরু cell তার নিজের width-এর ভেতরেই wrap করে, ঠিক hardware যেমন করে তেমন।
একটা `u8`-এ `250 + 10` wrap করে হয়ে যায় `4`।

## একটা আলাদা fence

```beans
Atomic.fence(MemoryOrder.seq_cst)
io.println("fenced")
```

`Atomic.fence` হলো একটা barrier — কোনো একটা নির্দিষ্ট cell-এ হাত না দিয়েই এর
এদিক-ওদিকের access-গুলোকে ক্রমে সাজায়।

## wait আর notify

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

`wait(value, order)` cell-টায় যতক্ষণ `value` থাকে ততক্ষণ block করে থাকে;
`notify_all` অপেক্ষারতদের জাগিয়ে দেয়। একটা wakeup শুধু একটা ইঙ্গিত, কখনো পাকা কথা
না: value বদলে গিয়ে আবার আগের জায়গায় ফিরে আসতে পারে, কিংবা wakeup-টা হয়তো অন্য কোনো
cell-এর জন্য ছিল। তাই check-টা একটা loop-এর ভেতরে রাখা হয়। এটা spin করার চেয়ে
সস্তা, কারণ অপেক্ষারত thread-টাকে OS পার্ক করে রাখে — একটা core জ্বালিয়ে বসে থাকতে হয় না।

## সময়-বাঁধা wait

```beans
let still: Atomic<i32> = new Atomic<i32>(3)
io.println("timed out {!still.wait_timeout(3, 2000000, MemoryOrder.acquire)}")
io.println("no wait needed {still.wait_timeout(99, 2000000, MemoryOrder.acquire)}")
io.println("woke {still.notify_all()} and {still.notify_one()}")
```

`wait_timeout` ঝুলে থাকতে পারে না: cell-টায় `3` আছে আর কখনো বদলায় না, তাই বাজেটটা
(২০,০০,০০০ ns) ফুরিয়ে গিয়ে timeout জানায়। cell-এ এখন নেই এমন একটা value-এর জন্য
wait করলে সাথে সাথেই ফিরে আসে। আর যেই cell-এ কেউ পার্ক হয়ে নেই তার উপর `notify_all`
/ `notify_one` করলে কাউকেই জাগায় না, চুপচাপ।

চালান:

```bash
beansc run examples/atomics.b
```

[Atomics আর MemoryOrder](/bn/reference/builtins/atomics/) হলো পুরো reference।
[Thread আর channel](/bn/examples/threads/)-এ আছে উপরের level-এর tool-গুলো, আর
[concurrency guide](/bn/guide/concurrency/) এগুলোকে জায়গামতো বসিয়ে বোঝায়।
