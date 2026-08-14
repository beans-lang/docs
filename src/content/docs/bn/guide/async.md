---
title: Async and await
description: Beans-এ গোছানো async/await — callable-এর উপর একটা effect, একটা লুকানো single-threaded executor চালায়।
---

Beans-এ async হলো **callable-এর উপর একটা effect**, কোনো type না।
`async fn f() -> R` দিয়ে এমন একটা function ঘোষণা করা হয় যার call-কে await
করতেই হবে; তবে call-টার type কিন্তু এখনও `R`-ই। এখানে কোনো public task,
future, executor বা polling protocol নেই। compiler আর runtime সবকিছু পর্দার
পেছনে সাজায় — সেই একটাই thread-এ, যেটা `main`-এ ঢুকেছিল। CPU-ভারী বা blocking
কাজের জন্য [`thread.spawn`](/bn/guide/concurrency/) ব্যবহার করুন, ওসব async
executor করে না।

```beans
import std.io

async fn double_later(a: int) -> int {
    return a * 2
}

async fn fetch_size(a: int) -> Result<int> {
    let doubled: int = await double_later(a)   // doubled: int
    return ok(doubled)
}

async fn main() {
    let n: Result<int> = await fetch_size(21)
    io.println("{n.or(-1)}")
}
```

## async আর await contextual

`async` আর `await` **keyword না**। `async`-এর অর্থ থাকে শুধু `fn`-এর ঠিক
আগে; আর `await`-এর অর্থ শুধু কোনো async body-র ভেতরে। বাকি সব জায়গায় দুটোই
সাধারণ identifier হয়ে থাকে, তাই ওই নামের পুরনো function, local বা field —
সব আগের মতোই চলে, এমনকি `Task` বা `Future` নামের user class-ও।

## প্রতিটা async call-কে await করতে হয়

কোনো async function-এর call বৈধ ঠিক দুই জায়গায়:

1. সরাসরি `await`-এর নিচে, অথবা
2. কোনো `async let`-এর initializer হিসেবে।

আর যেকোনো জায়গায় সেটা নাকচ। কোনো synchronous function একটা async function-কে
মোটেও call করতে পারে না, আর কোনো async function-কে সাধারণ `fn` value হিসেবে
store করা যায় না। sync কোডে ফিরে যাওয়ার কোনো `run`/`block_on` চোরা দরজা নেই।

```beans
async fn double_later(n: int) -> int { return n * 2 }

async fn main() {
    let x: int = await double_later(21)   // ok: directly awaited
    async let y: int = double_later(9)    // ok: starts a child
    let z: int = await y                  // await the child exactly once
}
```

- `await f(x)` `R` বানায় — ঘোষিত result type।
- `await` প্রতিটা binary operator-এর চেয়ে শক্ত করে বাঁধে, আর call, field ও
  index-এর চেয়ে ঢিলা। `?` আর `as` await যে value বানায় তার উপর কাজ করে, তাই
  `await f(x)?` কোনো বন্ধনী ছাড়াই await করা `Result`-টা unwrap করে।

## async let একটা গোছানো child শুরু করে

`async let x: R = f(args)` এখনকার async body-র ভেতরে একটা child task শুরু
করে। এর argument-গুলো ঠিক ওখানেই parent-এ evaluate হয়, আর child-টা তাকে
ঘিরে থাকা lexical scope-এর অংশ। যে type লেখা আছে সেটাই শেষমেশ যে result আসবে
তার: `await x` `R` বানায় — ঠিক একবার।

await না করেই scope থেকে বেরিয়ে গেলে parent নিজের result পাওয়ার আগেই
অসম্পূর্ণ child-টা **cancel** হয়ে যায়। এর মধ্যে আগেভাগে `return`, `?`,
`break`, `continue`, বা কোড শেষ হয়ে বেরিয়ে যাওয়া — সবই পড়ে। তার armed
`defer`-গুলো নতুন থেকে পুরনো ক্রমে চলে, তারপর তার জীবিত value-গুলো
শেষে-বানানো-আগে ক্রমে drop হয়, আর সে যেসব child শুরু করেছিল সেগুলোও ধারাবাহিক
ভাবে cancel হয়। কোনো child যতক্ষণ চলছে বা পরিষ্কার হচ্ছে, parent ততক্ষণ শেষ
হয় না।

## Scheduling লুকানো আর সহযোগিতামূলক

- কোনো async call শুধু `await` point-এ থেমে যায়; তার মাঝখানে সেটা
  executor-এর সেই একটা thread-এ synchronous ভাবেই চলে। দীর্ঘ CPU কাজ বাকি
  সব task-কে আটকে দেয়, তাই ওটা `std.thread`-এ পাঠাতে হয়।
- cancellation সহযোগিতামূলক: এটা কাজ করে suspension point-এ, কখনও কোনো
  statement-এর মাঝখানে না।
- `async fn main()` নিজেই নিজেকে চালায়: entry point-কে `async` ঘোষণা করা হয়, আর
  একটা লুকানো single-threaded executor সেটাকে শেষ পর্যন্ত চালিয়ে দেয়। একটা
  synchronous `fn main()` ঠিক আগের মতোই থাকে; শুধু সে কোনো async function
  call করতে পারে না।

## Readiness

`await net.readable(handle)` (আর `writable`) একটা descriptor তৈরি না হওয়া
পর্যন্ত থেমে থাকে। একটা socket-এর `poll_handle()` পাস করা হয়, অথবা POSIX-এ
যেকোনো pollable descriptor (Windows-এ readiness শুধু socket-handle-এর জন্য)।
একটা child যখন থেমে থাকে, তার চলতে-পারা ভাইবোনেরা চলতেই থাকে; যখন কিছুই আর
এগোতে পারে না কিন্তু কিছু একটা থেমে আছে, তখন লুকানো driver platform poller-এ
block করে। আর যখন কিছুই এগোতে পারে না আর কিছুই থেমেও নেই, তখন program থেমে
যায় এই বলে: `async deadlock: every task is waiting and none is parked on
readiness`। বন্ধ বা অকেজো কোনো descriptor-এর উপর await `false` দিয়ে শেষ হয়।

## async fn যা যা পারে না

- `inout` parameter নিতে,
- `extern "C"` হতে (C call-টাকে একটা async Beans function-এ মুড়ে নিতে হয়),
- `feature`-gated হতে, অথবা
- কোনো `unique class`-এর instance method হতে (static ঠিক আছে)।

`await` কোনো `defer`, কোনো closure বা string interpolation-এর ভেতরে বসতে
পারে না (আগে value-টা একটা local-এ bind করে নিন), আর `init`/`deinit` async হতে
পারে না। কোনো async body-র ভেতরে panic হলে program মূল source-এর ঠিক সেই
জায়গায় থেমে যায় — অন্য সব panic-এর মতোই।

:::note[প্রথম version]
এটা async-এর প্রথম version। dynamic task group, detached task, async closure,
আর সরাসরি await করা কোনো call-এ `inout` — এগুলো **এখনও** নেই। এগুলো এই
model-কে না বদলেই তার উপর যোগ হবে।
:::

## একটা পুরো program

`async let` প্রতিটা child সাথে সাথে শুরু করে দেয়, তাই দুটো একসাথে চলে আর শুধু
`await`-টাই অপেক্ষা করে:

<!-- beans:compile -->
```beans
import std.io

async fn work(id: int, n: int) -> int {
    return id * n
}

async fn main() {
    async let a: int = work(2, 10)
    async let b: int = work(3, 10)
    let sum: int = await a + await b
    io.println("sum {sum}")
}
```

আসল socket-এ readiness helper-এর জন্য দেখুন [std.net](/bn/reference/stdlib/net/)।
async ছাড়াই একটা thread থেকে অনেক descriptor-এর উপর অপেক্ষা করতে চাইলে দেখুন
[std.poll](/bn/reference/stdlib/poll/)।
