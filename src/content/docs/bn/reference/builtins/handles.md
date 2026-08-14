---
title: Ownership handles
description: value-এর মালিকানা রাখা, শেয়ার করা, lock করা, আর thread-এর মধ্যে সরানোর builtin handle type গুলো।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 8 types · 21 instance methods.
<!-- coverage:summary:end -->

**Ownership handle** হলো এমন একটা builtin type যেটা একটা value-এর মালিক, আর
কীভাবে সেটাতে পৌঁছানো যাবে তা নিয়ন্ত্রণ করে। একেক handle-এর একেক নিয়ম: এক মালিক,
শেয়ার করা মালিক, lock-করা access, বা thread-এর মধ্যে পাঠানো একটা value। এই পেজে
প্রতিটা handle আর তার method দেওয়া আছে। পুরো ownership model-এর জন্য
[memory model](/bn/guide/memory/) পড়ুন। প্রসঙ্গসহ thread আর channel দেখতে
[concurrency](/bn/guide/concurrency/) পড়ুন।

`Box`, `Arena`, `Shared`, আর `Mutex` হলো move-only outer handle, ঠিক `List` আর
`Map`-এর মতো। এদের bind, assign, বা return করার সময় `move` ব্যবহার করা হয়।
function parameter default-এ borrow করে।

## Box&lt;T&gt;

`Box<T>` heap-এ একটা value-এর মালিক। এটা একটা move-only handle।

```beans
new Box(value)
Box<T>.get() -> T
Box<T>.set(T)
```

- `new Box(value)` heap-এ একটা slot নেয় আর `value`-এর মালিকানা নেয়।
- `get()` value-টার একটা copy দেয়; `set(value)` সেটা বদলে দেয়।

```beans
let b: Box<int> = new Box(10)
b.set(20)
let n: int = b.get()
```

## Arena&lt;T&gt;

`Arena<T>` অনেকগুলো value রাখে আর প্রতিটার জন্য একটা স্থির integer handle ফেরত দেয়।
এটা move-only।

```beans
new Arena(capacity)
Arena<T>.add(T) -> int
Arena<T>.at(int) -> T
Arena<T>.get(int) -> Option<T>
Arena<T>.len() -> int
Arena<T>.clear()
```

- `new Arena(capacity)` `capacity`টা item-এর জায়গা নিয়ে শুরু করে।
- `add(value)` `value` জমায় আর তার handle ফেরত দেয়।
- `at(handle)` handle দিয়ে পড়ে, আর handle খারাপ হলে panic করে; `get(handle)`
  handle দিয়ে পড়ে, তবে panic-এর বদলে `none` দেয়।
- `len()` item-এর সংখ্যা; `clear()` সবগুলো সরিয়ে দেয়।

## Shared&lt;T&gt;

`Shared<T>` thread-safe শেয়ার-করা মালিকানা দেয়। অনেক মালিক একই value ধরে রাখতে
পারে; শেষ মালিক চলে যাওয়া পর্যন্ত value-টা বেঁচে থাকে। handle copy করলে একটা নতুন
মালিক যোগ হয়।

```beans
new Shared(value)
Shared<T>.get() -> T
Shared<T>.downgrade() -> Weak<T>
```

- `get()` value-টার একটা copy দেয়।
- `downgrade()` একটা `Weak<T>` বানায়, যেটা value-কে বাঁচিয়ে রাখে না।

`Shared<T>` `Send` আর `Sync` শুধু তখনই, যখন `T` দুইটাই।

## Weak&lt;T&gt;

`Weak<T>` একটা `Shared<T>` value-এর দিকে তাকায়, কিন্তু সেটাকে বাঁচিয়ে রাখে না।
reference cycle ভাঙতে এটা ব্যবহার করা হয়।

```beans
Weak<T>.upgrade() -> Option<Shared<T>>
Weak<T>.is_expired() -> bool
```

- `upgrade()` আবার একটা আসল মালিক ফেরত দেয়, আর value আগেই চলে গেলে `none` দেয়।
- `is_expired()` true হয় value চলে যাওয়ার পর।

```beans
let s: Shared<int> = new Shared(1)
let w: Weak<int> = s.downgrade()
match w.upgrade() {
    some(owner) => io.println("{owner.get()}"),
    none => io.println("gone"),
}
```

## Mutex&lt;T&gt;

`Mutex<T>` একটা value পাহারা দেয়, যাতে একবারে শুধু একটা thread সেটাতে হাত দিতে
পারে। এটা move-only।

```beans
new Mutex(value)
Mutex<T>.with_lock(fn(T) -> unit)
```

- `with_lock` lock-টা নেয়, value-এর ওপর দেওয়া function চালায়, তারপর lock ছেড়ে
  দেয়। lock শুধু call-টা যতক্ষণ চলে ততক্ষণই ধরে রাখা হয়।

```beans
let m: Mutex<int> = new Mutex(0)
m.with_lock(fn(v: int) -> unit {
    io.println("locked value is {v}")
})
```

## Channel&lt;T&gt;

`Channel<T>` thread-এর মধ্যে value পাঠায়। এটা `capacity`টা পর্যন্ত item ধরে রাখে।

```beans
new Channel(capacity)
Channel<T>.send(T)
Channel<T>.receive() -> Option<T>
Channel<T>.close()
```

- `send(x)` একটা value ভেতরে দেয়।
- `receive()` একটা value বের করে নেয়; channel বন্ধ আর খালি হয়ে গেলে `none` দেয়।
- `close()` জানায় যে আর কোনো value পাঠানো হবে না।

## Thread&lt;T&gt;

`Thread<T>` হলো একটা চলমান thread। এটা `new` দিয়ে তৈরি করা হয় না; এটা পাওয়া যায়
`thread.spawn` থেকে ([concurrency](/bn/guide/concurrency/) আর
[standard library](/bn/reference/stdlib/) দেখুন)।

```beans
Thread<T>.join() -> T
```

- `join()` thread-টা শেষ হওয়া পর্যন্ত অপেক্ষা করে আর তার result ফেরত দেয়।

## AtomicInt

`AtomicInt` হলো একটা মাত্র integer, যেটা অনেক thread নিরাপদে update করতে পারে। এর
operation গুলো sequentially consistent।

```beans
new AtomicInt(0)
AtomicInt.load() -> int
AtomicInt.store(int)
AtomicInt.add_and_get(int) -> int
```

- `new AtomicInt(0)` counter-টা একটা মান থেকে শুরু করে।
- `load()` সেটা পড়ে; `store(v)` সেটা লেখে।
- `add_and_get(v)` `v` যোগ করে আর নতুন মানটা ফেরত দেয়।

```beans
let count: AtomicInt = new AtomicInt(0)
let now: int = count.add_and_get(1)
```

:::note[AtomicInt আর Atomic এক না]
`AtomicInt` হলো একটা সাধারণ, সব সময় sequentially consistent counter। memory
ordering-এর সূক্ষ্ম নিয়ন্ত্রণ আর আরও বেশি operation লাগলে বরং
[`Atomic<T>`](/bn/reference/builtins/atomics/) ব্যবহার করা হয়।
:::

## Handle গুলো একসাথে কাজ করছে

দুইটা thread-এর মধ্যে পাহারা দেওয়া একটা counter, যেটা `Thread.join` দিয়ে জোড়া
লাগানো:

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

## আরও দেখুন

- [memory model](/bn/guide/memory/), ownership, move, আর borrowing।
- [Concurrency](/bn/guide/concurrency/), thread, channel, আর lock কাজে।
- [Atomics](/bn/reference/builtins/atomics/), `Atomic<T>` আর `MemoryOrder`।
