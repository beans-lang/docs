---
title: std.compress
description: DEFLATE, zlib আর gzip — output limit বাধ্যতামূলক, তাই decompression bomb allocation না হয়ে error হয়।
---

`std.compress` তিন রকম framing-এ DEFLATE compression দেয়, one-shot আর streaming দুভাবেই, zlib-ng-র উপরে। source আছে এখানে: [`stdlib/std/compress/compress.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/compress/compress.b)।

```beans
import std.compress
```

## যে নিয়মগুলো এই package-টাকে গড়ে তুলেছে

- **decompression-এ limit বাধ্যতামূলক।** যত byte নিতে রাজি, প্রতিটা inflate call সেটা বলে দেয়। ওই সীমা ছাড়ালে `limit` kind-এর `err` আসে — কখনোই শত্রুভাবাপন্ন compression ratio-র সঙ্গে দৌড়ানো allocation নয়। 200 byte-এর একটা input যদি চার gigabyte দাবি করে, সে 200 byte-এর সৎ চেষ্টা আর একটা error পায়। limit একটা parameter, option না, তাই রক্ষাটা ভুলে যাওয়ার উপায় নেই।
- **তিনটে format, নাম ধরে বলা।** `zlib` (RFC 1950), `raw` (RFC 1951) আর `gzip` (RFC 1952) — window-bits-এর লোককথা দিয়ে নয়, নাম দিয়ে বাছা হয়। gzip decode করলে multi-member file-এর প্রতিটা member পড়া হয়, যেভাবে `gzip -d` জোড়া দেওয়া archive পড়ে।
- **buffer-এর জন্য one-shot, বাকি সবের জন্য stream।** module function-গুলো গোটা `Bytes` নেয় আর দেয়। `Deflater` আর `Inflater` হলো move-only handle, আর `Inflater`-এর limit প্রতি call-এ নয়, তার পুরো জীবনজুড়ে ধরা থাকে।

যেসব error kind দেখা যেতে পারে: `limit` (output সীমা ছাড়িয়েছে), `eof` (data শেষ হওয়ার আগেই stream শেষ), `invalid` (নষ্ট input, বা limit না দেওয়া), `memory`, `closed`।

## Format

```beans
pub enum Format {
    zlib
    raw
    gzip
}
```

বেশির ভাগ protocol "deflate" বলতে `zlib` বোঝায়; `raw` হলো header ছাড়া DEFLATE, যেমন WebSocket-এর permessage-deflate আর ZIP entry ব্যবহার করে; `gzip` হলো file format।

## Module function

```beans
pub fn deflate(data: Bytes, level: int = 6) -> Result<Bytes>
pub fn inflate(data: Bytes, limit: int) -> Result<Bytes>
pub fn gzip_compress(data: Bytes, level: int = 6) -> Result<Bytes>
pub fn gzip_decompress(data: Bytes, limit: int) -> Result<Bytes>
pub fn deflate_raw(data: Bytes, level: int = 6) -> Result<Bytes>
pub fn inflate_raw(data: Bytes, limit: int) -> Result<Bytes>
```

`level` চলে 0..9 পর্যন্ত; 6 গতি আর আকারের মাঝামাঝি। প্রতিটা decompress করা function `limit` নেয় — সর্বোচ্চ যত output সে বানাবে।

```beans
let packed: Bytes = compress.gzip_compress(data)?
let back: Bytes = compress.gzip_decompress(packed, 1048576)?
```

## Deflater

streaming compressor। move-only এবং `Send`; `finish` stream শেষ করে দেয় আর handle-টা এরপর কাজ নেয় না।

```beans
pub unique class Deflater implements Send
pub static fn open(format: Format, level: int = 6) -> Result<Deflater>
pub fn push(data: Bytes) -> Result<Bytes>
pub fn finish() -> Result<Bytes>
```

`push` যতটুকু output তৈরি সেটা ফেরত দেয়, যা প্রায়ই কিছুই না: DEFLATE `finish` পর্যন্ত অনায়াসে জমিয়ে রাখে।

```beans
let press: compress.Deflater = compress.Deflater.open(compress.Format.zlib)?
var wire: Bytes = new Bytes(0)
wire.append(press.push(first)?)
wire.append(press.push(second)?)
wire.append(press.finish()?)
```

## Inflater

move-only `Send` streaming decompressor, যার একটা limit তার পুরো জীবনজুড়ে চলে।

```beans
pub unique class Inflater implements Send
pub static fn open(format: Format, limit: int) -> Result<Inflater>
pub fn push(data: Bytes) -> Result<Bytes>
pub fn finished() -> bool
pub fn finish() -> Result<Bytes>
```

`push` আসা এক টুকরো decompress করে, আর মোট output সীমা ছাড়ানোর মুহূর্তেই `limit` kind দেয়। stream নিজে শেষ ঘোষণা করলে `finished()` true হয় — তারপর আরও input দিলে `invalid`। `finish` জানায় input শেষ; অসম্পূর্ণ stream হলে `eof`।

## bomb, আর limit কেন parameter

এক চতুর্থাংশ megabyte শূন্য কয়েকশো byte-এ নেমে আসে। যে reader এক kilobyte বরাদ্দ করেছিল, সে memory-চাপ হিসেবে নয়, error হিসেবে জানতে পারে:

```beans
var zeros: Bytes = new Bytes(262144)
zeros.fill(0)
let bomb: Bytes = compress.deflate(zeros)?        // কয়েকশো byte
match compress.inflate(bomb, 1024) {
    ok(_) => { io.println("এখানে পৌঁছানোর কথা না") }
    err(e) => { io.println(e.kind) }              // limit
}
```
