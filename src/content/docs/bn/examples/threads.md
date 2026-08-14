---
title: Threads and channels
description: examples/threads.b ঘুরে দেখা, আর channel পেরিয়ে ও mutex-এর মধ্য দিয়ে পুরো struct আর enum value কীভাবে যায় সেটা।
---

Beans আসল OS thread ব্যবহার করে (কোনো green thread নেই)। এই পেজে আগে
[`threads.b`](https://github.com/beans-lang/beans/blob/main/examples/threads.b)
ঘুরে দেখব, তারপর দেখব পুরো struct আর enum value কীভাবে channel পেরিয়ে
([`wide_concurrency.b`](https://github.com/beans-lang/beans/blob/main/examples/wide_concurrency.b))
আর mutex-এর মধ্য দিয়ে
([`wide_sync.b`](https://github.com/beans-lang/beans/blob/main/examples/wide_sync.b)) যায়।

concurrency-র তিনটা tool হলো `Thread`, `Channel`, আর `Mutex` — সব `std.thread` থেকে।

## threads.b

`threads.b`-এর বেশিরভাগটাই ভাষার একটা recap (generic, enum, `Option`,
`decimal`); concurrency-র অংশটা একদম শেষে।

### একটা thread spawn করা

```beans
import std.thread

let t: Thread<int> = thread.spawn(fn() -> int {
    return 21 * 2
})
io.println(t.join())
```

`thread.spawn` একটা function নেয় আর সেটাকে একটা নতুন OS thread-এ চালায়। ফেরত দেয়
একটা `Thread<int>`, কারণ function-টা `int` ফেরত দেয়। `t.join()` thread-টা শেষ
হওয়া পর্যন্ত অপেক্ষা করে, তারপর ওর return value (`42`) ফেরত দেয়।

### একটা mutex

```beans
let shared: Mutex<Counter> = new Mutex(new Counter("shared"))
shared.with_lock(fn(c: Counter) {
    c.bump(5)
})
```

একটা `Mutex<Counter>` একটা value-কে মুড়ে রাখে, যাতে একসাথে শুধু একটা thread-ই
সেটায় হাত দিতে পারে। lock আর unlock হাতে করতে হয় না। একটা function দিয়ে
`with_lock` call করা হয়, আর lock-টা ঠিক ওই function-এর জন্যই ধরা থাকে, শেষ হলে ছেড়ে
দেয়। lock-করা value-টা `c` হিসেবে ভেতরে চলে আসে।

### একটা channel

```beans
let ch: Channel<string> = new Channel(8)
ch.send("job")
defer ch.close()
```

একটা `Channel<string>` হলো thread-দের মধ্যে একটা queue। `new Channel(8)` এমন একটা
বানায় যাতে ৮টা message buffer হয়ে থাকতে পারে। `send` ভেতরে একটা value রাখে।
`defer ch.close()` এখনকার scope শেষ হলে channel-টা বন্ধ করে দেয়; `defer` ওর
statement-টা scope থেকে বেরোনোর সময় চালায় — যেভাবেই বেরোনো হোক না কেন।

চালান:

```bash
beansc run examples/threads.b
```

## channel পেরিয়ে wide value: wide_concurrency.b

"wide" value বলতে একটা পুরো value type বোঝায়: একটা `struct` কিংবা payload সহ একটা
`enum` — শুধু একটা number বা pointer না। `wide_concurrency.b` দেখায় এগুলো
channel আর thread-এর সীমানা পেরিয়ে অক্ষত অবস্থায় যায়।

```beans
import std.io
import std.thread

struct Event {
    label: string
    value: int
}

fn send_one(ch: Channel<Event>, e: Event) {
    ch.send(e)
}

fn main() {
    let messages: Channel<Event> = new Channel(1)
    let sender: Thread<[i64; 2]> = thread.spawn(fn() -> [i64; 2] {
        send_one(messages, Event { label: "from worker", value: 41 })
        return [7, 8]
    })
    let event: Event = messages.receive().expect("event")
    let result: [i64; 2] = sender.join()
    io.println("channel {event.label} {event.value}")
    io.println("thread array {result[0]} {result[1]}")
    messages.close()
    io.println("channel closed {messages.receive().is_none()}")
}
```

যা যা খেয়াল করার মতো:

- channel-টা একটা পুরো `Event` struct বহন করে। `receive()` একটা `Option<Event>`
  ফেরত দেয়, আর `.expect("event")` সেটা খুলে দেয় — না পেলে ওই message দিয়ে panic করে।
- একটা thread একটা fixed-size array (`[i64; 2]`) ফেরত দিতে পারে; `join()` সেটা
  ফিরিয়ে দেয়।
- `close()`-এর পরে `receive()` `none` দেয়, তাই `.is_none()` হয় `true`। এভাবেই
  reader বোঝে channel-টা শেষ।

উদাহরণটা `int`, `decimal`, এমনকি একটা `Result<Pair>`-ও channel দিয়ে পাঠায়;
যেকোনো type-ই চলে:

```beans
let guarded: Channel<Result<Pair>> = new Channel(1)
guarded.send(err("channel error"))
match guarded.receive().expect("result") {
    ok(pair) => { io.println("bad {pair.left}") },
    err(error) => { io.println("channel result {error.msg}") },
}
```

চালান:

```bash
beansc run examples/wide_concurrency.b
```

## mutex-এর মধ্য দিয়ে wide value: wide_sync.b

`wide_sync.b` shared state-এর ক্ষেত্রে ঠিক একই কাজ করে: wide value-গুলোকে
`Shared`, `Weak`, আর `Mutex`-এর পেছনে রাখে।

```beans
let mutex: Mutex<Event> = guard(Event { label: "locked", value: 9 })
mutex.with_lock(fn(value: Event) {
    io.println("mutex {value.label} {value.value}")
})
```

lock ধরা থাকা অবস্থায় `with_lock` guard-করা `Event`-টা function-এর হাতে তুলে দেয়।

```beans
let worker: Thread<int> = thread.spawn(fn() -> int {
    let event: Event = shared.get()
    return event.value + 1
})
io.println("thread {worker.join()}")
```

`Shared<T>` হলো একটা reference-counted value, অনেক thread একসাথে যেটা ধরে রাখতে
পারে; `shared.get()` সেটা পড়ে। ফাইলটা `Weak<T>`-ও দেখায় (একটা non-owning
reference, যেটা expire হয়ে যেতে পারে) — `downgrade()`, `upgrade()`, আর
`is_expired()` দিয়ে।

চালান:

```bash
beansc run examples/wide_sync.b
```

[Atomics](/bn/examples/atomics/)-এ আছে explicit ordering সহ lock-free shared cell,
আর [concurrency guide](/bn/guide/concurrency/)-এ পুরো ছবিটা আছে।
[Ownership handle](/bn/reference/builtins/handles/)-এ `Shared`, `Weak`, `Box`, আর
এদের বন্ধুবান্ধব নিয়ে লেখা আছে।
