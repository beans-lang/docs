---
title: std.bytes
description: Bytes বাফারের উপর CRC-32 checksum আর unsigned varint helper।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 6 package functions.
<!-- coverage:summary:end -->

`std.bytes` builtin [`Bytes`](/bn/reference/builtins/bytes/) বাফারের উপর একটা CRC-32
checksum আর unsigned varint helper যোগ করে। এটা Beans দিয়ে লেখা; পড়ুন
[`stdlib/std/bytes/bytes.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/bytes/bytes.b)-তে।

```beans
import std.bytes
```

একটা **varint** হলো একটা integer জমা রাখার একটা compact উপায়, ছোট value-র জন্য কম
byte লাগে। এখানে unsigned রূপটা হলো LEB128।

## Checksum

```beans
pub fn crc32(data: Bytes) -> u32
```

- `crc32` হলো IEEE CRC-32 checksum, polynomial `0xedb88320` ব্যবহার করে।

## Unsigned varint

```beans
pub fn uvarint_size(value: u64) -> int
pub fn encode_uvarint(value: u64) -> Bytes
pub fn append_uvarint(data: Bytes, value: u64)
pub fn decode_uvarint(data: Bytes) -> Option<u64>
pub fn decode_uvarint_at_or(data: Bytes, start: int, fallback: u64) -> u64
```

- `uvarint_size` জানায় unsigned varint হিসেবে `value`-এর কয় byte লাগবে।
- `encode_uvarint` একটা নতুন বাফার ফেরত দেয় যেটাতে `value` unsigned varint হিসেবে
  থাকে।
- `append_uvarint` `value`-কে varint হিসেবে `data`-এর শেষে জায়গামতো যোগ করে, আর
  কিছু ফেরত দেয় না।
- `decode_uvarint` `data`-এর শুরু থেকে একটা varint পড়ে। data যদি কাটা পড়ে থাকে বা
  value 64 bit ছাড়িয়ে যায়, তাহলে `none` ফেরত দেয়, আর এটা বড়জোর 10 byte পড়ে।
- `decode_uvarint_at_or` `start` থেকে শুরু করে একটা varint পড়ে। `start` range-এর
  বাইরে হলে, অথবা value কাটা পড়লে বা ছাড়িয়ে গেলে `fallback` ফেরত দেয়।

```beans
import std.io
import std.bytes

fn main() {
    let buf: Bytes = bytes.encode_uvarint(300)
    io.println(buf.len())                       // 2
    let value: Option<u64> = bytes.decode_uvarint(buf)
    io.println(value)                            // some(300)
    io.println(bytes.crc32(Bytes.from("hello")))
}
```

## আরও দেখুন

- [Bytes](/bn/reference/builtins/bytes/) — বাফার type, যার নিজেরও `crc32` আর
  `append_uvarint` method আছে।
- [std.encoding.binary](/bn/reference/stdlib/binary/) — fixed-width আর varint read-write
  করার আরও পূর্ণ একটা সেট।
