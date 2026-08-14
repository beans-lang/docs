---
title: std.time and std.random
description: clock আর sleep করা, সাথে OS থেকে নিরাপদ random বাইট আর সংখ্যা।
---

<!-- coverage:summary -->
**API সারমর্ম** (Beans source থেকে `npm run coverage` দিয়ে বানানো): 9টা package function।
<!-- coverage:summary:end -->

এই দুটো native module time আর randomness সামলায়। দুটোই compiler আর runtime-এর ভেতরে বানানো, তাই এদের function-গুলো checker-এ typed থাকে positional parameter সহ, যাদের কোনো নাম নেই।

## std.time

```beans
import std.time
```

দুই ধরনের clock আছে। **monotonic** clock শুধু সামনেই এগোয়; কিছু করতে কতক্ষণ লাগল সেটা মাপতে এটা ব্যবহার করা হয়। **wall** clock হলো আসল ক্যালেন্ডারের সময়; system clock adjust হলে এটা পেছনে বা সামনে লাফ দিতে পারে।

```beans
monotonic_nanos() -> int
monotonic_millis() -> int
wall_nanos() -> int
wall_millis() -> int
sleep_nanos(int)
sleep_millis(int)
```

- `monotonic_nanos` আর `monotonic_millis` monotonic clock পড়ে। শুধু পার্থক্যটাই অর্থপূর্ণ; একটা রিডিং নিছক একটা আন্দাজি শুরু থেকে গোনা একটা সংখ্যা।
- `wall_nanos` 1970 (Unix epoch) থেকে ন্যানোসেকেন্ড ফেরত দেয়, আর `wall_millis` 1970 থেকে মিলিসেকেন্ড। wall clock লাফ দিতে পারে, তাই duration মাপতে এটা ব্যবহার করা যাবে না।
- `sleep_nanos` আর `sleep_millis` চাওয়া সময়টুকু অন্তত ততক্ষণ sleep করে, আর একটা signal মাঝখানে বাধা দিলে sleep নিজে থেকেই আবার চেষ্টা করে।

<!-- beans:compile -->
```beans
import std.io
import std.time

fn main() {
    let start: int = time.monotonic_nanos()
    time.sleep_millis(10)
    let elapsed: int = time.monotonic_nanos() - start
    io.println("waited {elapsed} ns")
}
```

## std.random

```beans
import std.random
```

`std.random` শুধু operating system থেকেই cryptographically secure random data দেয়। কোনো pseudo-random fallback নেই। source হলো macOS-এ `arc4random_buf` আর Linux-এ `getrandom`।

```beans
bytes(int) -> Result<Bytes>
u64() -> Result<int>
below(int) -> Result<int>
```

- `bytes(n)` `n`টা random বাইট ফেরত দেয়।
- `u64()` একটা random 64-bit value ফেরত দেয়।
- `below(limit)` `[0, limit)`-এর মধ্যে একটা uniform value ফেরত দেয়। এটা রেমাইন্ডার নিয়ে নয়, rejection sampling দিয়ে uniform, তাই এতে কোনো modulo bias নেই।

খারাপ input (negative count, বা শূন্য-বা-কম bound) `invalid` kind-এর error হয়ে ফেরে।

<!-- beans:compile -->
```beans
import std.io
import std.random

fn main() {
    let roll: int = random.below(6).expect("random") + 1
    io.println("you rolled {roll}")
}
```
