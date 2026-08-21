---
title: std.compress
description: DEFLATE, zlib and gzip with mandatory output limits, so a decompression bomb is an error rather than an allocation.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 6 package functions · 3 types · 2 static methods · 5 instance methods · 3 enum variants.
<!-- coverage:summary:end -->

`std.compress` provides DEFLATE compression in three framings, one-shot and
streaming, over zlib-ng. The source is
[`stdlib/std/compress/compress.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/compress/compress.b).

```beans
import std.compress
```

## Rules that shape the package

- **Decompression limits are mandatory.** Every inflating call names the most
  bytes it is prepared to receive. Crossing that bound is an `err` with kind
  `limit` — never an allocation racing a hostile compression ratio. A 200-byte
  input that claims four gigabytes gets 200 bytes of honest effort and an error.
  The limit is a parameter, not an option, so the defence cannot be forgotten.
- **Three formats, spelled out.** `zlib` (RFC 1950), `raw` (RFC 1951) and `gzip`
  (RFC 1952) are named, not selected by window-bits folklore. gzip decoding
  reads every member of a multi-member file, the way `gzip -d` reads
  concatenated archives.
- **One-shot for buffers, streams for everything else.** The module functions
  take and return whole `Bytes`. `Deflater` and `Inflater` are move-only handles
  for data arriving in pieces, and an `Inflater`'s limit holds across its whole
  life rather than per call.

Error kinds you may see: `limit` (the output bound was crossed), `eof` (the
stream ends before its data does), `invalid` (corrupt input, or a missing
limit), `memory`, `closed`.

## Format

```beans
pub enum Format {
    zlib
    raw
    gzip
}
```

`zlib` is what most protocols mean by "deflate"; `raw` is headerless DEFLATE, as
used by WebSocket permessage-deflate and ZIP entries; `gzip` is the file format.

## Module functions

```beans
pub fn deflate(data: Bytes, level: int = 6) -> Result<Bytes>
pub fn inflate(data: Bytes, limit: int) -> Result<Bytes>
pub fn gzip_compress(data: Bytes, level: int = 6) -> Result<Bytes>
pub fn gzip_decompress(data: Bytes, limit: int) -> Result<Bytes>
pub fn deflate_raw(data: Bytes, level: int = 6) -> Result<Bytes>
pub fn inflate_raw(data: Bytes, limit: int) -> Result<Bytes>
```

`level` runs 0..9; 6 balances speed against size. Every decompressing function
takes `limit` as the maximum output it will produce.

```beans
let packed: Bytes = compress.gzip_compress(data)?
let back: Bytes = compress.gzip_decompress(packed, 1048576)?
```

## Deflater

A streaming compressor. Move-only and `Send`; `finish` ends the stream and the handle
refuses further work.

```beans
pub unique class Deflater implements Send
pub static fn open(format: Format, level: int = 6) -> Result<Deflater>
pub fn push(data: Bytes) -> Result<Bytes>
pub fn finish() -> Result<Bytes>
```

`push` returns whatever output is ready, which is often nothing: DEFLATE buffers
freely until `finish`.

```beans
let press: compress.Deflater = compress.Deflater.open(compress.Format.zlib)?
var wire: Bytes = new Bytes(0)
wire.append(press.push(first)?)
wire.append(press.push(second)?)
wire.append(press.finish()?)
```

## Inflater

A move-only, `Send` streaming decompressor with one limit across its whole life.

```beans
pub unique class Inflater implements Send
pub static fn open(format: Format, limit: int) -> Result<Inflater>
pub fn push(data: Bytes) -> Result<Bytes>
pub fn finished() -> bool
pub fn finish() -> Result<Bytes>
```

`push` decompresses one arriving piece and is kind `limit` the moment the total
output would cross the bound. `finished()` is true once the stream announced its
own end — after that, more input is kind `invalid`. `finish` declares
end-of-input; a stream cut short is kind `eof`.

## The bomb, and why the limit is a parameter

A quarter megabyte of zeros compresses to a few hundred bytes. A reader that
budgeted a kilobyte finds out as an error rather than as memory pressure:

```beans
var zeros: Bytes = new Bytes(262144)
zeros.fill(0)
let bomb: Bytes = compress.deflate(zeros)?        // a few hundred bytes
match compress.inflate(bomb, 1024) {
    ok(_) => { io.println("unreachable") }
    err(e) => { io.println(e.kind) }              // limit
}
```
