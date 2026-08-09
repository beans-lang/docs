---
title: std.bytes
description: CRC-32 checksums and unsigned varint helpers over the Bytes buffer.
---

`std.bytes` adds a CRC-32 checksum and unsigned varint helpers on top of the
builtin [`Bytes`](/reference/builtins/bytes/) buffer. It is written in Beans;
read it at
[`stdlib/std/bytes/bytes.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/bytes/bytes.b).

```beans
import std.bytes
```

A **varint** is a compact way to store an integer, using fewer bytes for small
values. The unsigned form here is LEB128.

| Function | Returns | What it does |
| --- | --- | --- |
| `crc32(data: Bytes) -> u32` | `u32` | IEEE CRC-32 checksum (polynomial `0xedb88320`) |
| `uvarint_size(value: u64) -> int` | `int` | how many bytes `value` needs as an unsigned varint |
| `encode_uvarint(value: u64) -> Bytes` | `Bytes` | a new buffer holding `value` as an unsigned varint |
| `append_uvarint(data: Bytes, value: u64)` | (nothing) | append `value` as a varint to `data`, in place |
| `decode_uvarint(data: Bytes) -> Option<u64>` | `Option<u64>` | read a varint from the start of `data` |
| `decode_uvarint_at_or(data: Bytes, start: int, fallback: u64) -> u64` | `u64` | read a varint at `start`, or return `fallback` |

`decode_uvarint` returns `none` if the data is truncated or the value overflows
64 bits. It reads at most 10 bytes.

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

## See also

- [Bytes](/reference/builtins/bytes/) — the buffer type, which also has its own
  `crc32` and `append_uvarint` methods.
- [std.encoding.binary](/reference/stdlib/binary/) — a fuller set of fixed-width
  and varint reads and writes.
