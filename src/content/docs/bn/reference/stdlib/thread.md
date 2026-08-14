---
title: std.thread
description: একটা নতুন OS thread-এ একটা closure চালানো, আর join দিয়ে তার result ফেরত নেওয়া।
---

<!-- coverage:summary -->
**API সারমর্ম** (Beans source থেকে `npm run coverage` দিয়ে বানানো): 1টা package function।
<!-- coverage:summary:end -->

`std.thread` একটা সত্যিকারের operating-system thread-এ একটা closure চালায়। এগুলো green thread না; প্রতিটাই একটা পুরো OS thread। এটা একটা native module, compiler আর runtime-এর ভেতরেই বানানো।

```beans
import std.thread
```

## Spawn আর join করা

| Function | ফেরত দেয় | কী করে |
| --- | --- | --- |
| `thread.spawn(fn() -> T) -> Thread<T>` | `Thread<T>` | একটা নতুন thread-এ একটা closure চালায় |

পাস করা closure শুধু `Send` value capture করতে পারে আর একটা `Send` value-ই return করতে হবে। `Send` বলতে বোঝায় "অন্য thread-এ move করা নিরাপদ"। এই নিয়মের জন্যই move-only socket আর file handle-কে একটা thread-এ capture করা যায় না।

`Thread<T>`-এর একটা method ব্যবহার করা হয়:

- `join() -> T`: thread শেষ হওয়ার জন্য অপেক্ষা করে তার return করা value-টা নিয়ে নেওয়া হয়।

```beans
import std.io
import std.thread

fn main() {
    let worker: Thread<int> = thread.spawn(fn() -> int {
        var total: int = 0
        for i in 0..1000 { total += i }
        return total
    })
    let result: int = worker.join()
    io.println(result)                       // 499500
}
```

## Thread-এর মধ্যে data ভাগাভাগি করা

`spawn`/`join` একা শুধু শেষে একটা value পাস করে দেয়। thread চলাকালীন state ভাগ করতে হলে sync tool-গুলো ব্যবহার করতে হয়, যেগুলো builtin type আর builtin reference-এ documented:

- `Mutex`: shared state-এর চারপাশে lock।
- `Channel`: thread-এর মধ্যে value পাঠাও।
- `Atomic`: lock ছাড়াই single value।

দেখুন [Ownership handles](/bn/reference/builtins/handles/) আর
[Atomics](/bn/reference/builtins/atomics/)।

## আরও দেখুন

- [Concurrency guide](/bn/guide/concurrency/), thread, `Send`, আর sync tool-এর পুরো ছবি।
