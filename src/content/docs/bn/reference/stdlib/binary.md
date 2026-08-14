---
title: std.encoding.binary
description: একটা Bytes buffer-এর উপর নির্দিষ্ট-প্রস্থের integer, float, আর varint পড়া-লেখা, নিজের বেছে নেওয়া byte order-এ।
---

<!-- coverage:summary -->
**API সারমর্ম** (Beans source থেকে `npm run coverage` দিয়ে বানানো): 36টা package function · 5টা type · 2টা constructor · 25টা instance method · 6টা public field · 3টা enum variant।
<!-- coverage:summary:end -->

`std.encoding.binary` দিয়ে একটা [`Bytes`](/bn/reference/builtins/bytes/) buffer-এ নির্দিষ্ট-প্রস্থের সংখ্যা আর varint পড়া-লেখা করা যায়, byte order-টা নিজে ঠিক করে দেওয়া যায়। পুরোটাই খাঁটি Beans, `Bytes`-এর উপরে বসানো। ভেতরে native `Bytes`-এর word accessor-গুলোই storage-এর মূল কাজ করে (ওরা little-endian, আর range-এর বাইরে গেলে panic করে), আর এই package তার উপর একটা checked layer বসায়: byte order নিজে বলে দেওয়া যায়, panic-এর বদলে `Result` error আসে, float bit ঠিক রেখে convert হয়, আর cursor থাকে। source দেখুন এখানে:
[`stdlib/std/encoding/binary/binary.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/encoding/binary/binary.b)।

```beans
import std.encoding.binary
```

পড়া বা লেখা কখনোই checked range-এর বাইরের memory ছোঁয় না। buffer-এর শেষ পেরিয়ে পড়তে গেলে `eof` kind-এর error, আর যে লেখা fit হবে না সেটা `range` kind-এর error — panic কখনো না।

## ByteOrder

`ByteOrder` ঠিক করে দেয় multi-byte সংখ্যাগুলো কীভাবে সাজানো থাকবে।

```beans
pub enum ByteOrder
little
big
native
```

`native`-টা compile-time-এই [std.target](/bn/reference/stdlib/target/) দিয়ে fold হয়ে যায়, অর্থাৎ target machine যে order ব্যবহার করে সেটাই হয়ে যায়। Single-byte function-গুলো (`read_u8`, `read_i8`, `write_u8`, `write_i8`, `append_u8`, `append_i8`) কোনো order নেয় না, কারণ এক বাইটের তো কোনো order-ই নেই।

## Uvarint আর Varint

varint read-গুলো একটা ছোট struct ফেরত দেয়, যেটায় decode হওয়া value আর কত বাইট লেগেছে — দুটোই থাকে, যাতে caller ওটার পরে এগিয়ে যেতে পারে।

```beans
pub struct Uvarint
pub value: u64
pub size: int

pub struct Varint
pub value: int
pub size: int
```

## Positional read

একটা byte position থেকে সংখ্যা পড়া হয়। buffer শুধু borrow হয়, consume হয় না, আর কিছুই বদলায় না। width-এর তুলনায় buffer ছোট হলে `eof` kind-এর error আসে।

```beans
pub fn read_u8(data: Bytes, pos: int) -> Result<u8>
pub fn read_i8(data: Bytes, pos: int) -> Result<i8>
pub fn read_u16(data: Bytes, pos: int, order: ByteOrder) -> Result<u16>
pub fn read_i16(data: Bytes, pos: int, order: ByteOrder) -> Result<i16>
pub fn read_u32(data: Bytes, pos: int, order: ByteOrder) -> Result<u32>
pub fn read_i32(data: Bytes, pos: int, order: ByteOrder) -> Result<i32>
pub fn read_u64(data: Bytes, pos: int, order: ByteOrder) -> Result<u64>
pub fn read_i64(data: Bytes, pos: int, order: ByteOrder) -> Result<i64>
pub fn read_f32(data: Bytes, pos: int, order: ByteOrder) -> Result<f32>
pub fn read_f64(data: Bytes, pos: int, order: ByteOrder) -> Result<float>
```

Float read-এ bit হুবহু থাকে: ঠিক যে বাইটগুলো ছিল সেগুলোই ঠিক float হয়ে ফেরে, তাই infinity, quiet NaN payload, negative zero — সব round trip-এ টিকে যায়।

## Positional write

আগে থেকেই থাকা জায়গায় একটা byte position-এ সংখ্যা লেখা হয়। current length-এর মধ্যে width fit না হলে `range` kind-এর error আসে। সবগুলোই `Result<bool>` ফেরত দেয়।

```beans
pub fn write_u8(data: Bytes, pos: int, value: u8) -> Result<bool>
pub fn write_i8(data: Bytes, pos: int, value: i8) -> Result<bool>
pub fn write_u16(data: Bytes, pos: int, value: u16, order: ByteOrder) -> Result<bool>
pub fn write_i16(data: Bytes, pos: int, value: i16, order: ByteOrder) -> Result<bool>
pub fn write_u32(data: Bytes, pos: int, value: u32, order: ByteOrder) -> Result<bool>
pub fn write_i32(data: Bytes, pos: int, value: i32, order: ByteOrder) -> Result<bool>
pub fn write_u64(data: Bytes, pos: int, value: u64, order: ByteOrder) -> Result<bool>
pub fn write_i64(data: Bytes, pos: int, value: i64, order: ByteOrder) -> Result<bool>
pub fn write_f32(data: Bytes, pos: int, value: f32, order: ByteOrder) -> Result<bool>
pub fn write_f64(data: Bytes, pos: int, value: float, order: ByteOrder) -> Result<bool>
```

## Append

buffer-এর একদম শেষে একটা সংখ্যা যোগ করা হয়, তাতে buffer value-র width-এর সমান বড় হয়। এগুলো কিছু ফেরত দেয় না, আর কখনো fail করে না।

```beans
pub fn append_u8(data: Bytes, value: u8)
pub fn append_i8(data: Bytes, value: i8)
pub fn append_u16(data: Bytes, value: u16, order: ByteOrder)
pub fn append_i16(data: Bytes, value: i16, order: ByteOrder)
pub fn append_u32(data: Bytes, value: u32, order: ByteOrder)
pub fn append_i32(data: Bytes, value: i32, order: ByteOrder)
pub fn append_u64(data: Bytes, value: u64, order: ByteOrder)
pub fn append_i64(data: Bytes, value: i64, order: ByteOrder)
pub fn append_f32(data: Bytes, value: f32, order: ByteOrder)
pub fn append_f64(data: Bytes, value: float, order: ByteOrder)
```

একটা নির্দিষ্ট-প্রস্থের integer append করে সাথে সাথেই আবার পড়ে ফেরত আনা:

<!-- beans:compile -->
```beans
import std.io
import std.encoding.binary

fn main() {
    var buf: Bytes = new Bytes(0)
    binary.append_u32(buf, 1000, binary.ByteOrder.little)
    let value: u32 = binary.read_u32(buf, 0, binary.ByteOrder.little).expect("read")
    io.println(value)                        // 1000
}
```

## Varint

varint ছোট integer-কে কম বাইটে প্যাক করে ফেলে।

```beans
pub fn uvarint_size(value: u64) -> int
pub fn varint_size(value: int) -> int
pub fn append_uvarint(data: Bytes, value: u64)
pub fn read_uvarint(data: Bytes, pos: int) -> Result<Uvarint>
pub fn append_varint(data: Bytes, value: int)
pub fn read_varint(data: Bytes, pos: int) -> Result<Varint>
```

- `uvarint_size` আর `varint_size` বলে দেয় একটা encoding কত বাইট নেবে — 1 থেকে 10-এর মধ্যে।
- `append_uvarint` / `read_uvarint` হলো 64-bit pattern-এর উপর unsigned LEB128: এটাই `Bytes.append_uvarint` আর Go-র `encoding/binary`-র `PutUvarint` / `Uvarint`-এর wire format।
- `append_varint` / `read_varint` হলো signed zigzag form, যা Go-র `PutVarint`-এর সাথে মেলে: `-1` হয় `1`, `1` হয় `2`, আর প্রতিটা value তার নিজের zigzag width নেয় — সব negative-এর জন্য দশ বাইট লাগে না।
- `read_uvarint` truncated input-এ `eof` kind দেয়, আর varint দশ বাইট পেরিয়ে গেলে বা 64 bit overflow করলে `overflow` kind দেয়। `read_varint` আগে unsigned form-টা decode করে, তাই ওটাও একই kind-গুলো দেয়।

দুটো read-ই value-র সাথে তার byte width ফেরত দেয়, তাই `pos`-কে প্রতিটার পরে এগিয়ে দিয়ে read-গুলো একের পর এক chain করা যায়:

<!-- beans:compile -->
```beans
import std.io
import std.encoding.binary

fn main() {
    var buf: Bytes = new Bytes(0)
    binary.append_uvarint(buf, 300)
    binary.append_varint(buf, -5)

    let first: binary.Uvarint = binary.read_uvarint(buf, 0).expect("uvarint")
    io.println(first.value)                  // 300
    io.println(binary.uvarint_size(300))     // 2

    let second: binary.Varint = binary.read_varint(buf, first.size).expect("varint")
    io.println(second.value)                 // -5
}
```

## class Reader

একটা `Reader` buffer-এর মধ্য দিয়ে সামনে এগিয়ে চলে, read position-টা নিজে থেকে মনে রাখে। যে byte order দিয়ে সব multi-byte read হবে, সেটা দিয়েই একে তৈরি করা হয়:

```beans
new Reader(order: ByteOrder)
```

`Bytes` একটা move-only buffer, তাই reader ওটাকে own করে না। প্রতিটা method call-এর জন্য buffer-টা borrow করে, আর reader-এ শুধু position থাকে — তাই একই buffer-এর অন্য যেকোনো ব্যবহারের পাশে একটা `Reader` কোনো clone ছাড়াই দিব্যি বসে থাকে।

```beans
pub position: int

pub fn remaining(data: Bytes) -> int
pub fn skip(data: Bytes, count: int) -> Result<bool>
pub fn read_u8(data: Bytes) -> Result<u8>
pub fn read_i8(data: Bytes) -> Result<i8>
pub fn read_u16(data: Bytes) -> Result<u16>
pub fn read_i16(data: Bytes) -> Result<i16>
pub fn read_u32(data: Bytes) -> Result<u32>
pub fn read_i32(data: Bytes) -> Result<i32>
pub fn read_u64(data: Bytes) -> Result<u64>
pub fn read_i64(data: Bytes) -> Result<i64>
pub fn read_f32(data: Bytes) -> Result<f32>
pub fn read_f64(data: Bytes) -> Result<float>
pub fn read_uvarint(data: Bytes) -> Result<u64>
pub fn read_varint(data: Bytes) -> Result<int>
```

- `position` হলো পরের read কোথা থেকে শুরু হবে; প্রতিটা সফল read-এর পর ওটা সেই read-এর width-এর সমান এগিয়ে যায়।
- `remaining` হলো `position`-এর পরে কত বাইট বাকি, কখনো negative হয় না।
- `skip` সামনে `count` বাইট এগোয়; negative count হলে `range` kind, আর শেষ পেরিয়ে skip করলে `eof` kind।
- `read_*` method-গুলো `position`-এ পড়ে ওটাকে এগিয়ে দেয়, আর তাদের positional সংস্করণের মতোই একই kind-এ fail করে। `read_uvarint` value-টা `Uvarint` struct থেকে খুলে দেয় আর `read_varint` `Varint` struct থেকে, কারণ reader size-টা এমনিতেই মনে রাখছে।

## class Writer

একটা `Writer` আগে থেকেই থাকা জায়গায় একের পর এক সংখ্যা লেখে, position-টাও একইভাবে মনে রাখে। তার multi-byte write-এর জন্য byte order দিয়ে একে তৈরি করা হয়:

```beans
new Writer(order: ByteOrder)
```

```beans
pub position: int

pub fn remaining(data: Bytes) -> int
pub fn write_u8(data: Bytes, value: u8) -> Result<bool>
pub fn write_i8(data: Bytes, value: i8) -> Result<bool>
pub fn write_u16(data: Bytes, value: u16) -> Result<bool>
pub fn write_i16(data: Bytes, value: i16) -> Result<bool>
pub fn write_u32(data: Bytes, value: u32) -> Result<bool>
pub fn write_i32(data: Bytes, value: i32) -> Result<bool>
pub fn write_u64(data: Bytes, value: u64) -> Result<bool>
pub fn write_i64(data: Bytes, value: i64) -> Result<bool>
pub fn write_f32(data: Bytes, value: f32) -> Result<bool>
pub fn write_f64(data: Bytes, value: float) -> Result<bool>
```

প্রতিটা write যতটা লিখল ততটা `position` এগিয়ে দেয়, আর সেই width buffer-এ fit না হলে `range` kind-এ fail করে। free `append_*` function-গুলোর মতো নয়, একটা `Writer` buffer বড় করে না, তাই আগে `new Bytes(n)` দিয়ে buffer-এর size ঠিক করে নিতে হবে।

<!-- beans:compile -->
```beans
import std.io
import std.encoding.binary

fn main() {
    var buf: Bytes = new Bytes(8)
    let w: binary.Writer = new binary.Writer(binary.ByteOrder.big)
    w.write_u32(buf, 7).expect("write")

    let r: binary.Reader = new binary.Reader(binary.ByteOrder.big)
    io.println(r.read_u32(buf).expect("read"))             // 7
}
```

## আরও দেখুন

- [Bytes](/bn/reference/builtins/bytes/), মূল buffer type।
- [std.bytes](/bn/reference/stdlib/bytes/), ছোট একটা CRC-32 আর varint helper।
