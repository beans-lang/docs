---
title: Fibers and brew
description: Beans-এ green thread — brew একটা child fiber শুরু করে, scope সেটাকে join করে, আর panic শুধু নিজের fiber-টাকেই থামায়।
---

**fiber** হলো একটা green thread: নিজের stack আছে, আর operating system না —
Beans runtime নিজেই একে worker thread-এর উপর চালায়। `brew f(args)` `f`-কে
বর্তমান scope-এর একটা child fiber-এ শুরু করে। fiber এত সস্তা যে প্রতিটা
connection-কে একটা করে দেওয়া যায়, আর এরা block না করে park করে — socket,
channel বা timer-এর অপেক্ষায় থাকা fiber তার worker-এর কিছুই খরচ করে না।

এখানে কোনো **colored function নেই**। যেকোনো function park করতে পারে, আর
caller-এর তা জানার বা ভাবার দরকার নেই; কোনো `async` keyword নেই, `await`
করারও কিছু নেই। যে code অপেক্ষা করে সেটা হুবহু সাধারণ code-এর মতোই পড়া যায়।

```beans
import std.io

fn handle(order: Order) -> Result<int> {
    brew warm_cache(order)              // a child fiber, no handle kept
    let price: Brew<int> = brew quote(order)   // a child, handle kept
    let stock: int = count_stock(order)?       // parks if it must; reads like sync code
    match price.join() {                // park until the child finishes
        ok(value) => { return ok(value + stock) }
        err(problem) => { return err(problem.msg, problem.kind) }
    }
}                                       // scope exit joins warm_cache
```

## brew

`brew` একটা call নেয়। argument-গুলো এখনই হিসাব করে, তারপর call-টা বর্তমান
scope-এর একটা child fiber-এ চালায় — বর্তমান worker thread-এই আটকানো।

- **statement** হিসেবে `brew side(9)` একটা নামহীন child শুরু করে। কেউ handle
  ধরে রাখে না, তাই scope exit সেটাকে join করে।
- **initializer** হিসেবে `let h: Brew<int> = brew work(21)` handle-টা রাখে।

`brew` contextual, `unique` আর `packed`-এর মতো: এটা শুধু statement বা
initializer position-এ, সরাসরি একটা call-এর আগেই বিশেষ। `brew` নামের local,
field বা parameter আগের মতোই কাজ করে — এজন্যই নিচের `TaskGroup` method-টা
`group.brew(...)` হিসেবে লেখা যায়। আর কোথাও — কোনো বড় expression-এর ভেতরে —
`brew` নাকচ হয়, কারণ এটা যে handle বানায় সেটা scope-এর সাথে বাঁধা।

method-ও brew হয়, আর move-only argument child-এর ভেতরে move হয়ে যায়:

<!-- beans:fragment -->
```beans
let counter: Counter = new Counter(10)
let bumped: Brew<int> = brew counter.bump(5)

let data: List<int> = [1, 2, 3, 4]
let total: Brew<int> = brew sum(move data)
```

## Brew&lt;T&gt;

`Brew<T>` হলো একটা child-এর handle। এটা move-only আর scope-bound।

```beans
Brew<T>.join() -> Result<T>
Brew<T>.cancel()
```

- `join()` child শেষ না হওয়া পর্যন্ত caller-কে park করে, তারপর `ok(value)` দেয়;
  child panic করলে (`panic` kind) বা cancel হলে (`cancelled` kind) `err` দেয়।
  দ্বিতীয়বার join করলে `closed` kind-এ `err` — প্রথম join-ই outcome নিয়ে নিয়েছে।
- `cancel()` cancel-এর অনুরোধ জানিয়ে সাথে সাথে ফিরে আসে। যে কাজ আগেই শেষ হয়ে
  গেছে সেটা কখনো cancel হয় না, আর দুবার cancel করলে কিছুই হয় না।

`Brew<T>` `Send` না: child-টা যে scope আর যে worker তাকে brew করেছে তাদেরই।
অন্য thread-এ কাজ পাঠাতে [`thread.spawn`](/bn/guide/concurrency/) ব্যবহার করুন।

handle-টা নিজের scope ছেড়ে যেতেও পারে না। একে field-এ রাখা, closure-এ capture
করা, return করা, বা collection-এ রাখা যায় না — হারিয়ে যাওয়া fiber এখানে
লেখাই যায় না:

<!-- beans:expect-error -->
```beans
class Job {
    pending: Brew<int>              // error: a Brew handle is scope-bound
}
```

## scope-ই তার fiber-এর মালিক

একটা scope যত fiber brew করে সব তারই, আর সেগুলো ছাড়া scope শেষ হয় না।

- **স্বাভাবিক exit join করে।** scope-এর শেষে পৌঁছালে বা সেখান থেকে return করলে
  প্রতিটা না-join করা child শেষ হওয়া পর্যন্ত park করে — নতুন থেকে পুরোনো দিকে,
  scope যে order-এ `defer` সাজিয়েছে তার সাথে মিলিয়ে।
- **error-এ exit আগে cancel, তারপর join।** `?` propagation বা panic দিয়ে বের
  হলে আগে প্রতিটা না-join করা child-কে cancel করে, তারপর join করে। cancel একটা
  অনুরোধ মাত্র; join তবু প্রতিটা child-এর unwind শেষ হওয়ার অপেক্ষা করে।
- **কেউ না দেখা failure উপরে ওঠে।** scope exit যদি এমন child join করে যেটা
  panic করেছিল আর কোনো `join()` সেই failure দেখেনি, তাহলে parent scope
  exit-এই child-এর message আর position নিয়ে panic করে। failure হয় handle করা
  যায়, নয়তো সেটা উপরে ওঠে — কিন্তু হাওয়ায় মিলিয়ে যেতে পারে না।

join যেহেতু scope exit-এ হয়, না-join করা child scope-এর শেষ statement-এর
*পরে* চলে:

<!-- beans:compile -->
```beans
import std.io

fn side(x: int) {
    io.println("side {x}")
}

fn main() {
    brew side(9)
    io.println("end of main")
}
```

এই program আগে `end of main`, তারপর `side 9` ছাপে।

## Cancellation

Cancellation **cooperative আর park-scoped**। cancel-এর অনুরোধ fiber-এর পরের
park-এ দেখা হয়, আর আগে থেকেই park করা থাকলে সাথে সাথেই। দুই park-এর মাঝের
সোজা code কখনো মাঝপথে থামানো হয় না, তাই যে child কখনো park-ই করে না সে
নিজের মতো শেষ হয়ে যায়:

<!-- beans:fragment -->
```beans
let spinner: Brew<int> = brew spin()
spinner.cancel()
match spinner.join() {
    ok(value) => { io.println("finished anyway {value}") }
    err(problem) => { io.println("cancelled: {problem.kind}") }
}
```

cancel হওয়া park যে code park করেছিল তাকে কোনো value ফেরত দেয় না। fiber-টা
বরং unwind করে — সাজানো defer নতুন থেকে পুরোনো দিকে ঠিক একবার চলে, owned
value drop হয়, আর তার নিজের child-রাও পরপর cancel হয়। এরপর join `cancelled`
kind জানায়। যে code protocol-এর মাঝপথে cancel হতে পারে না, সে protocol-এর
মাঝপথে park করে না — synchronous code-এর যে নিয়ম, সেই একই নিয়ম।

## panic শুধু একটা fiber থামায়

**panic শুধু যে fiber-এ হয়েছে সেটাকেই শেষ করে।** সেই fiber-এর stack unwind
হয়, তার defer চলে আর value drop হয়; failure-টা — message আর source position —
তার join-এ একটা সাধারণ ধরার মতো error হিসেবে পৌঁছায়। আর কিছুই থামে না।

<!-- beans:compile -->
```beans
import std.io

fn boom(a: int) -> int {
    if a > 0 {
        panic("boom at {a}")
    }
    return a
}

fn main() {
    let risky: Brew<int> = brew boom(5)
    match risky.join() {
        ok(value) => { io.println("value {value}") }
        err(problem) => { io.println("caught {problem.kind}: {problem.msg}") }
    }
    io.println("still running")
}
```

main fiber panic করলে আর ধরার কেউ না থাকলে program আগের মতোই শেষ হয়, তাই
সাধারণ program-এর কিছু বদলায় না। একটা ধারালো দিক আছে: `Mutex` ধরে রাখা
অবস্থায় panic হলে lock-টা **poison** হয়ে যায়, আর তার উপর পরের প্রতিটা
`with_lock` `poisoned` kind-এ panic করে। ক্ষতির পরিধি ঠিক ততটুকুই — যে
fiber-রা ওই poisoned data ছোঁয়।

## TaskGroup&lt;T&gt;

child-এর সংখ্যা যখন runtime-এ ঠিক হয়, তখন `TaskGroup<T>` ব্যবহার করুন।

```beans
new TaskGroup<T>()
TaskGroup<T>.next() -> Option<Result<T>>
TaskGroup<T>.try_next() -> Option<Result<T>>
TaskGroup<T>.wait_all() -> Result<List<T>>
TaskGroup<T>.cancel_all()
```

- `group.brew(f(x))` ঠিক একটা একক `brew`-র মতোই child শুরু করে। একক `brew`-র
  মতো না — এটা যেকোনো block depth-এ বৈধ।
- `next()` সবচেয়ে আগে শেষ হওয়া অদাবিকৃত completion-এর জন্য park করে আর
  `some(ok(v))`, `some(err(e))`, নয়তো বহর খালি হলে `none` দেয়। delivery হয়
  **completion order**-এ — বহর তো এজন্যই, উত্তর যেমন আসে তেমন নেওয়ার জন্য।
- `try_next()` সাথে সাথেই উত্তর দেয়; কিছু না এলে `none`।
- `wait_all()` বাকিদের join করে **spawn order**-এ list দেয়, নয়তো spawn
  order-এর প্রথম failure দেয়।
- `cancel_all()` নতুন থেকে পুরোনো দিকে cancel করে, join করে, আর সব outcome
  ফেলে দেয়।

খালি হয়ে যাওয়া group আবার ব্যবহার করা যায়। group-ও `Brew` handle-এর মতো
scope-bound নিয়ম মানে, আর তার scope exit প্রথম না-দেখা panic উপরে তোলে।

<!-- beans:compile -->
```beans
import std.io

fn double(n: int) -> int {
    return n * 2
}

fn main() {
    let group: TaskGroup<int> = new TaskGroup<int>()
    var n: int = 1
    for n <= 3 {
        group.brew(double(n))
        n += 1
    }
    match group.wait_all() {
        ok(values) => { io.println("sum of {values.len()} answers") }
        err(problem) => { io.println("fleet failed {problem.kind}") }
    }
}
```

## Gate

`Gate` হলো একটা sticky broadcast flag। একটা `open()` park হয়ে থাকা সব
waiter-কে একসাথে জাগায়, আর gate-টা পরের সব `wait()`-এর জন্য খোলা থাকে।

```beans
new Gate()
Gate.wait()
Gate.open()
Gate.is_open() -> bool
```

- `wait()` gate না খোলা পর্যন্ত park করে; আগে থেকে খোলা থাকলে সাথে সাথেই ফেরে।
- `open()` gate খুলে দেয় আর পুরো অপেক্ষার সারিকে FIFO order-এ জাগায়।
- `is_open()` park না করেই flag-টা পড়ে।

`Brew` handle-এর মতো না — `Gate` `Send`, তাই কোনো OS thread এমন gate খুলতে
পারে যেখানে fiber park করে আছে।

## fiber আর thread একসাথে

fiber আর [OS thread](/bn/guide/concurrency/) আলাদা প্রশ্নের উত্তর দেয়। fiber
অপেক্ষার জন্য — হাজার হাজার fiber socket আর timer-এ প্রায় বিনা খরচে park করে
থাকে, কিন্তু সবাই একটা worker thread ভাগ করে নেয়, তাই নিজেরা আরেকটা core
ব্যবহার করতে পারে না। thread CPU-ভারী বা সত্যিকারের blocking কাজের জন্য, আর
আরেকটা core-এ পৌঁছানোর জন্য।

এরা একসাথে কাজ করে: `main()` চলে root fiber হিসেবে, প্রতিটা thread নিজের
fiber রাখতে পারে, আর channel, `Gate`, timer আর `sleep` worker block না করে
fiber-কে park করে।

## fiber কোথায় নেই

সীমিত target-এ কোনো scheduler নেই। wasm আর freestanding build check-এর সময়ই
`brew`, `Brew` আর প্রতিটা parking operation নাকচ করে — freestanding যেভাবে
এখনই timer আর channel wait নাকচ করে, ঠিক সেভাবে। সেখানে সাধারণ synchronous
Beans পুরোপুরি চলে — concurrency সৎভাবে অনুপস্থিত, চুপচাপ ভাঙা নয়। যে program
কখনো brew করে না সে কখনো park করে না আর কিছুই খরচ করে না।

## আরও দেখুন

- [Concurrency](/bn/guide/concurrency/), OS thread, channel, mutex, atomic।
- [Ownership handle](/bn/reference/builtins/handles/), `Brew`, `TaskGroup`,
  `Gate` আর বাকি builtin handle।
- [Error](/bn/guide/errors/), এই join-গুলো যে `Result` আর `Error` দিয়ে উত্তর দেয়।
