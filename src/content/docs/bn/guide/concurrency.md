---
title: Concurrency
description: Beans-এ OS thread, channel, mutex আর atomic — সাথে check করা Send ও Sync bound।
---

Beans-এর thread হলো **OS thread**। `thread.spawn` একটা closure-কে নতুন একটা
OS thread-এ চালায়, আর এই model-এ এখনো কোনো green thread বা coroutine নেই —
fiber-ভিত্তিক একটা model পরিকল্পনায় আছে। `thread.spawn` হলো CPU-ভারী বা
blocking কাজের জন্য tool। closure আর `std.thread` মিলেই পুরো কাজটা সেরে দেয়।

```beans
import std.thread

// spawn: run a closure on another thread
let t: Thread<int> = thread.spawn(fn() -> int {
    return heavy_work()
})
let n: int = t.join()               // wait, then take the value

// a mutex wraps the data itself, so you cannot touch it without the lock
let ledger: Mutex<Ledger> = new Mutex(new Ledger())
ledger.with_lock(fn(l: Ledger) {
    l.post(entry)                   // locked for exactly this block, auto-unlock
})

// channels move work between threads
let ch: Channel<string> = new Channel(64)      // buffered
ch.send("job")
let job: Option<string> = ch.receive()         // none when closed and empty

// atomics for plain counters
let hits: AtomicInt = new AtomicInt(0)
hits.add_and_get(1)
```

## spawn আর join

`thread.spawn(fn() -> T)` একটা closure-কে নতুন OS thread-এ চালায় আর একটা
`Thread<T>` ফেরত দেয়। `join()` thread-টা শেষ হওয়া পর্যন্ত অপেক্ষা করে আর তার
value ফেরত দেয়; `detach()` result ফেলে worker-কে নিজের মতো শেষ হতে দেয়। ফেরত আসা value `T`-কে `Send` হতে হবে, আর closure যা যা
capture করে সেগুলোকেও।

## Send আর Sync

type system data race ঘটার আগেই সেটা থামিয়ে দেয়। কোনো `thread.spawn`
closure শুধু `Send` value capture করতে পারে আর অবশ্যই একটা `Send` value
return করতে হয়।

- **Local:** সাধারণ class reference আর plain `fn` closure।
- **Conditional:** `List<T>`, `Box<T>`, `Arena<T>`-এর `T` `Send` হতে হবে;
  `Map<K, V>` আর `OrderedMap<K, V>`-এর দুই type-ই `Send` হতে হবে।
- **Move-only owner:** `Bytes`, `File`, `MMap`, TCP/UDP, poller, HTTP/HTTP2 আর
  WebSocket handle `Send`, কিন্তু mutable owner `Sync` না।
- **Shared tool:** scalar, immutable string, atomic, `Send` value-এর
  `Mutex`/`Channel`, আর `Send & Sync` value-এর `Shared`/`Weak`।

এতেই একটা `class` default-এ local reference হয়ে যায়। spawn করা কোনো
closure-এ non-`Send` value capture করলে সেটা compile error — যে value আর তার
type, দুটোই বলে দেয়:

<!-- beans:expect-error -->
```beans
import std.thread

class Local {}

fn main() {
    let item: Local = new Local()
    var xs: List<Local> = [item]
    let t: Thread<int> = thread.spawn(fn() -> int {
        return xs.len()            // error: List<Local> is not Send
    })
    t.join()
}
```

thread-জুড়ে mutable data ভাগ করতে চাইলে সেটাকে একটা `Mutex`-এ মুড়ে নিতে হয় —
`Mutex` `Send`। দেখুন [Memory আর ownership](/bn/guide/memory/)।

এক owner worker-কে দিতে closure-এ move করুন। direct `spawn` closure `send fn`
হিসেবে infer হয়:

```beans
let data: Bytes = Bytes.filled(4096, 0)
let work: send fn() -> int =
    fn() move(data) -> int { return data.len() }
let worker: Thread<int> = thread.spawn(move work)
```

## Mutex

`Mutex<T>` value-টাকে নিজের ভেতরেই ধরে রাখে। `with_lock` lock করে,
closure-টা চালায়, আর যেকোনো পথে বের হলেই unlock করে দেয় — তাই unlock করতে ভুলে
যাওয়ার কোনো সুযোগ নেই। value-টা শুধু closure-এর ভেতরেই নাগালে, আর এই কারণেই
lock এড়ানো অসম্ভব।

## Channel

`Channel<T>` thread-এর মাঝে value চালাচালি করে। `new Channel(capacity)`
একটা buffered channel বানায়; `send(x)` একটা value ভেতরে দেয়, `receive()`
`some(v)` ফেরত দেয়, অথবা channel বন্ধ ও খালি হলে `none`, আর `close()` সেটা
বন্ধ করে। channel-এর সাথে `defer ch.close()` জুড়ে দিলে যেকোনো পথে বের হলেই
সেটা বন্ধ হয়ে যায়।

## Atomic

সাধারণ counter আর flag-এর জন্য atomic ব্যবহার করা হয়:

- `AtomicInt` হলো একটা সরল sequentially-consistent integer: `new AtomicInt(0)`,
  `load()`, `store(v)`, `add_and_get(v)`।
- `Atomic<T>` হলো যেকোনো integer বা `bool`-এর উপর একটা typed atomic — সাথে
  স্পষ্ট memory order আর `compare_exchange`, `fetch_add`, wait/notify আর
  `Atomic.fence`। দেখুন [Atomics আর MemoryOrder](/bn/reference/builtins/atomics/)।

## একটা পুরো program

একটা worker spawn করা হয়, shared state-কে `Mutex` দিয়ে পাহারা দেওয়া হয়, আর একটা
value একটা `Channel`-এর ভেতর দিয়ে পাঠানো হয়:

<!-- beans:compile -->
```beans
import std.io
import std.thread

class Ledger {
    total: int = 0
    fn add(n: int) { self.total += n }
}

fn main() {
    let t: Thread<int> = thread.spawn(fn() -> int {
        return 21 * 2
    })
    io.println("worker said {t.join()}")

    let ledger: Mutex<Ledger> = new Mutex(new Ledger())
    ledger.with_lock(fn(l: Ledger) {
        l.add(10)
    })

    let ch: Channel<int> = new Channel(4)
    ch.send(7)
    ch.close()
    match ch.receive() {
        some(v) => io.println("got {v}"),
        none    => io.println("empty"),
    }

    let hits: AtomicInt = new AtomicInt(0)
    hits.add_and_get(1)
    io.println("hits {hits.load()}")
}
```

## Readiness wait

এক thread থেকে অনেক socket-এর জন্য অপেক্ষা করতে চাইলে descriptor-গুলো
[`std.poll`](/bn/reference/stdlib/poll/) poller-এ register করে তার readiness
event-এর জন্য wait করুন।
