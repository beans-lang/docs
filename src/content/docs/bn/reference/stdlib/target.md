---
title: std.target
description: যে target-এর জন্য build করা হচ্ছে তার তথ্য, compile-time constant হিসেবে পাওয়া যায়।
---

<!-- coverage:summary -->
**API সারমর্ম** (Beans source থেকে `npm run coverage` দিয়ে বানানো): 10টা package function।
<!-- coverage:summary:end -->

`std.target` বলে দেয় যে target-এর জন্য compile করা হচ্ছে তার কথা। প্রতিটা value একটা compile-time constant, তাই compiler build করার সময়েই সেটা program-এ বসিয়ে দেয়। এটা একটা native module, আর এর function-গুলো checker-এ typed; একটাও কোনো argument নেয় না।

```beans
import std.target
```

এগুলো compile-time constant বলে, এরা **বেছে নেওয়া** target-এর কথা বলে, যে machine-এ কাজ করা হচ্ছে তার নয়। `beansc run`-এর নিচে বেছে নেওয়া target সবসময় host-ই, তাই ওখানে দুটো মিলে যায়।

## String তথ্য

```beans
triple() -> string
arch() -> string
os() -> string
env() -> string
object_format() -> string
endian() -> string
```

- `triple()` হলো পুরো target triple।
- `arch()` হলো CPU architecture, যেমন `x86_64` বা `aarch64`।
- `os()` হলো operating system।
- `env()` হলো triple-এর environment/ABI অংশ।
- `object_format()` হলো object file-এর format।
- `endian()` হলো byte order, `little` বা `big`।

## Number তথ্য

```beans
pointer_bits() -> int
pointer_size() -> int
stack_align() -> int
max_simd_bits() -> int
```

- `pointer_bits()` হলো bit-এ pointer-এর size, যেমন 64।
- `pointer_size()` হলো বাইটে pointer-এর size, যেমন 8।
- `stack_align()` হলো বাইটে stack alignment।
- `max_simd_bits()` হলো bit-এ সবচেয়ে চওড়া SIMD vector। এটা `--cpu` আর `--features` flag দিয়ে build করা মেনে চলে, কারণ ওগুলোই ঠিক করে কোন কোন vector width পাওয়া যাবে।

<!-- beans:compile -->
```beans
import std.io
import std.target

fn main() {
    io.println(target.arch())            // e.g. aarch64
    io.println(target.pointer_size())    // e.g. 8
    io.println(target.endian())          // e.g. little
}
```

## আরও দেখুন

- [Compile-time guide](/bn/guide/compile-time/), build-এর সময় constant-গুলো কীভাবে fold হয়।
- [std.encoding.binary](/bn/reference/stdlib/binary/), এর `native` byte order এই module দিয়েই resolve হয়।
