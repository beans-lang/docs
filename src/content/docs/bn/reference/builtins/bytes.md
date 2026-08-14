---
title: Bytes
description: বাড়তে পারা, বদলানো যায় এমন byte buffer Bytes, আর binary data বানানো ও পড়ার তার method গুলো।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 1 type · 3 static methods · 29 instance methods.
<!-- coverage:summary:end -->

`Bytes` হলো raw byte-এর একটা buffer, যেটা বাড়তে পারে আর বদলানো যায়। binary data
বানাতে, একটা buffer থেকে নির্দিষ্ট চওড়ার integer পড়তে, বা `string` বানানোর আগে
text জমাতে এটা ব্যবহার করা হয়।

[`string`](/bn/reference/builtins/string/)-এর মতো না — একটা `Bytes` value জায়গায়
বসেই বদলাতে পারে। buffer-টা বদলায় এমন প্রতিটা method একই buffer ফেরত দেয়, তাই
call গুলো চেইন করা যায়।

`Bytes` একটা native builtin, এর কোনো `.b` source নেই, আর runtime ABI table দিয়ে
এতে পৌঁছানো হয় —
[`compiler/beans/expression.b`](https://github.com/beans-lang/beans/blob/main/compiler/beans/expression.b)-তে।
এর signature গুলো positional: প্রতিটা জায়গায় type-টা fixed, নাম গুলো না।

## একটা Bytes বানানো

নতুন একটা buffer তৈরি করা হয় `new Bytes(n)` দিয়ে, যেটা `n`টা শূন্য-করা byte দেয়
আর `n` negative হলে panic করে। তিনটা static buffer বানায় বা মাপে:

```beans
Bytes.from(string) -> Bytes
Bytes.from_raw(RawPtr<u8>, int) -> Bytes
Bytes.uvarint_size(int) -> int
```

- `Bytes.from(s)` একটা নতুন buffer দেয়, যার মধ্যে string `s`-এর byte গুলোর একটা
  copy থাকে।
- `Bytes.from_raw(pointer, len)` একটা raw pointer থেকে `len` byte copy করে, তবে
  ownership নেয় না। এটার জন্য `unsafe` লাগে; null pointer শুধু তখনই চলে যখন `len`
  শূন্য।
- `Bytes.uvarint_size(v)` `v`-কে unsigned varint হিসেবে লিখলে কত byte লাগবে সেটা
  দেয়, কিছু না লিখেই।

```beans
let buf: Bytes = new Bytes(0)
let text: Bytes = Bytes.from("hello")
```

## Method গুলো

```beans
Bytes.len() -> int
Bytes.as_ptr() -> RawPtr<u8>
Bytes.reserve(int) -> Bytes
Bytes.resize(int) -> Bytes
Bytes.fill(int) -> Bytes
Bytes.get(int) -> int
Bytes.set(int, int) -> Bytes
Bytes.push(int) -> Bytes
Bytes.get_u8(int) -> int
Bytes.get_u16(int) -> int
Bytes.get_u32(int) -> int
Bytes.get_u64(int) -> int
Bytes.get_i64(int) -> int
Bytes.put_u8(int, int) -> Bytes
Bytes.put_u16(int, int) -> Bytes
Bytes.put_u32(int, int) -> Bytes
Bytes.put_u64(int, int) -> Bytes
Bytes.put_i64(int, int) -> Bytes
Bytes.slice(int, int) -> Bytes
Bytes.copy_from(Bytes, int) -> Bytes
Bytes.append(Bytes) -> Bytes
Bytes.append_string(string) -> Bytes
Bytes.append_i64(int) -> Bytes
Bytes.append_range(Bytes, int, int) -> Bytes
Bytes.to_string() -> string
Bytes.to_string_until_nul() -> string
Bytes.append_uvarint(int) -> Bytes
Bytes.get_uvarint(int) -> int
Bytes.crc32(int, int) -> int
```

### Size আর আকার

- `len()` হলো byte-এর সংখ্যা।
- `as_ptr()` buffer-এর raw pointer ধার দেয়, আর এটার জন্য `unsafe` লাগে। খালি
  buffer-এর জন্য pointer-টা null। `Bytes`-টাকে বাঁচিয়ে রাখতে হয়, pointer-টা free
  করা যাবে না, আর এটা ব্যবহার করার সময় resize, reserve, append, বা push করা যাবে
  না।
- `reserve(n)` length না বদলে অন্তত `n` byte-এর জায়গা বানিয়ে রাখে।
- `resize(n)` buffer-টাকে `n` byte-এ বাড়ায় বা কমায়; নতুন byte গুলো শূন্য হিসেবে
  পড়া যায়।
- `fill(v)` প্রতিটা বর্তমান byte-কে `v` করে দেয়।

### একেকটা byte

- `get(i)` `i`-এর byte-টাকে integer হিসেবে দেয়, আর `i` সীমার বাইরে হলে panic হয়।
- `set(i, v)` `i`-তে byte লেখে, আর `i` সীমার বাইরে হলে panic হয়।
- `push(v)` শেষে একটা byte যোগ করে, buffer-টাকে বাড়িয়ে।

### নির্দিষ্ট চওড়ার integer (little-endian)

`get_*` reader গুলো একটা byte-অবস্থানে পূর্ণসংখ্যা পড়ে, আর `put_*` writer গুলো
একটা অবস্থানে একটা লেখে। সবগুলোই little-endian, আর অবস্থান আর চওড়া যোগ করলে
buffer-এর শেষ পেরিয়ে গেলে panic করে। `put_*` buffer-টা ফেরত দেয়, তাই লেখা গুলো
চেইন হয়।

### copy আর append

- `slice(from, to)` `[from, to)`-এর byte গুলো নিয়ে একটা নতুন buffer দেয়।
- `copy_from(src, at)` `src`-এর সব byte এই buffer-এ `at` থেকে শুরু করে copy করে।
- `append(other)` আরেকটা buffer-এর byte গুলো শেষে যোগ করে; `append_string(s)`
  একটা string-এর byte যোগ করে; `append_i64(v)` `v`-কে 8টা little-endian byte
  হিসেবে যোগ করে; আর `append_range(src, from, to)` `src`-এর `[from, to)` byte
  গুলো যোগ করে।

### byte কে text বানানো

- `to_string()` প্রতিটা byte-কে একটা string হিসেবে দেয়, যার মধ্যে যেকোনো NUL
  byte-ও থাকে।
- `to_string_until_nul()` প্রথম NUL byte-এ গিয়ে থেমে যায়। নাম দুইটা বলে দেয় কোনটা
  পাওয়া যাচ্ছে, তাই একটা binary-safe reader ভুলে truncate করা রূপটা বেছে নিতে
  পারবে না।

### Varint আর checksum

varint হলো একটা integer কম byte-এ জমানোর কমপ্যাক্ট উপায়, ছোট সংখ্যার জন্য কম byte
লাগে। Beans পুরো 64-bit pattern-এর ওপর unsigned LEB128 ব্যবহার করে, তাই একটা
negative value 10 byte নেয়।

- `append_uvarint(v)` `v`-কে unsigned varint হিসেবে যোগ করে।
- `get_uvarint(pos)` `pos` থেকে শুরু হওয়া একটা unsigned varint পড়ে। পরেরটা পড়তে
  নিজের অবস্থানটা `Bytes.uvarint_size(v)` দিয়ে এগিয়ে নিতে হয়।
- `crc32(from, to)` `[from, to)`-এর byte গুলোর IEEE CRC-32 checksum দেয়।

## তুলনা

`==` আর `!=` দুইটা `Bytes`-কে value দিয়ে তুলনা করে: একই length আর একই byte।

## উদাহরণ

চেইন করে একটা record তৈরি করা, তারপর সেটা আবার পড়া:

<!-- beans:compile -->
```beans
import std.io

fn main() {
    let buf: Bytes = new Bytes(0)
    buf.append_string("id=").append_i64(42).push(10)
    io.println("{buf.len()} bytes")

    let header: Bytes = new Bytes(8)
    header.put_u32(0, 65535).put_u32(4, 7)
    io.println("{header.get_u32(0)} {header.get_u32(4)}")

    let text: Bytes = Bytes.from("hello")
    io.println(text.to_string())
}
```

কয়েকটা varint পরপর লেখা, তারপর `uvarint_size` দিয়ে সেগুলো একটা একটা করে পড়া:

<!-- beans:compile -->
```beans
import std.io

fn main() {
    var rec: Bytes = new Bytes(0)
    rec.append_uvarint(1).append_uvarint(300).append_uvarint(70000)

    var pos: int = 0
    var seen: List<int> = []
    for seen.len() < 3 {
        let v: int = rec.get_uvarint(pos)
        seen.push(v)
        pos = pos + Bytes.uvarint_size(v)
    }
    io.println(seen)

    let check: Bytes = Bytes.from("123456789")
    io.println("crc32 {check.crc32(0, check.len())}")
}
```

## আরও দেখুন

- [string](/bn/reference/builtins/string/), immutable text।
- [File আর mapping](/bn/reference/builtins/files/), `File.read` আর `File.write` `Bytes` ব্যবহার করে।
