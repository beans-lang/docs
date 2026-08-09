---
title: std.encoding.binary
description: Read and write fixed-width integers, floats, and varints over a Bytes buffer, with a chosen byte order.
---

`std.encoding.binary` reads and writes fixed-width numbers and varints in a
[`Bytes`](/reference/builtins/bytes/) buffer. You pick the byte order. It is pure
Beans over `Bytes`. Read the source at
[`stdlib/std/encoding/binary/binary.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/encoding/binary/binary.b).

```beans
import std.encoding.binary
```

## Byte order

`enum ByteOrder`: `little`, `big`, `native`. `native` is folded at compile time
using [std.target](/reference/stdlib/target/), so it becomes whichever order the
target machine uses.

## Small structs

Varint reads return a struct that carries both the value and how many bytes it
took:

- `struct Uvarint`: `pub value: u64`, `pub size: int`.
- `struct Varint`: `pub value: int`, `pub size: int`.

## Positional reads

Read a number at a byte position. If the buffer is too short, you get an error
with kind `eof`.

| Function | Returns |
| --- | --- |
| `read_u8(data, pos)` | `Result<u8>` |
| `read_i8(data, pos)` | `Result<i8>` |
| `read_u16/i16/u32/i32/u64/i64(data, pos, order)` | `Result<...>` |
| `read_f32(data, pos, order)` | `Result<f32>` |
| `read_f64(data, pos, order)` | `Result<float>` |

Float reads are bit-preserving: the exact bytes become the exact float.

## Positional writes

Write a number at a byte position. If it will not fit, you get an error with kind
`range`. All return `Result<bool>`.

| Function | Returns |
| --- | --- |
| `write_u8(data, pos, value)` | `Result<bool>` |
| `write_i8(data, pos, value)` | `Result<bool>` |
| `write_u16/i16/u32/i32/u64/i64(data, pos, value, order)` | `Result<bool>` |
| `write_f32/f64(data, pos, value, order)` | `Result<bool>` |

## Appends

Add a number to the end of the buffer, growing it. These return nothing.

- `append_u8(data, value)`, `append_i8(data, value)`
- `append_u16/i16/u32/i32/u64/i64(data, value, order)`
- `append_f32/f64(data, value, order)`

The complete set of fixed-width functions, spelled out:

- Reads: `read_u8`, `read_i8`, `read_u16`, `read_i16`, `read_u32`, `read_i32`,
  `read_u64`, `read_i64`, `read_f32`, `read_f64`.
- Writes: `write_u8`, `write_i8`, `write_u16`, `write_i16`, `write_u32`,
  `write_i32`, `write_u64`, `write_i64`, `write_f32`, `write_f64`.
- Appends: `append_u8`, `append_i8`, `append_u16`, `append_i16`, `append_u32`,
  `append_i32`, `append_u64`, `append_i64`, `append_f32`, `append_f64`.

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

## Varints

A varint packs an integer into fewer bytes when it is small.

| Function | Returns | What it does |
| --- | --- | --- |
| `uvarint_size(value: u64) -> int` | `int` | bytes an unsigned varint needs |
| `varint_size(value: int) -> int` | `int` | bytes a signed varint needs |
| `append_uvarint(data, value: u64)` | (nothing) | append an unsigned varint |
| `read_uvarint(data, pos) -> Result<Uvarint>` | `Uvarint` | read one; kind `overflow` past 10 bytes / 64 bits |
| `append_varint(data, value: int)` | (nothing) | append a signed varint (zigzag, Go-compatible) |
| `read_varint(data, pos) -> Result<Varint>` | `Varint` | read a signed varint |

## class Reader

A `Reader` walks a buffer forward, tracking a position for you. Build it with the
byte order it should use:

```beans
new binary.Reader(order: ByteOrder)
```

- `pub position: int` — where it will read next.
- `remaining(data) -> int` — bytes left after `position`.
- `skip(data, count) -> Result<bool>` — move forward `count` bytes.
- `read_u8/i8/u16/i16/u32/i32/u64/i64/f32/f64(data)` — read and advance.
- `read_uvarint(data) -> Result<u64>` — read an unsigned varint and advance.
- `read_varint(data) -> Result<int>` — read a signed varint and advance.

All reads use the byte order you gave the reader.

## class Writer

A `Writer` writes numbers in sequence, tracking a position:

```beans
new binary.Writer(order: ByteOrder)
```

- `pub position: int`.
- `remaining(data) -> int`.
- `write_u8/i8/u16/i16/u32/i32/u64/i64/f32/f64(data, value) -> Result<bool>`.

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

## See also

- [Bytes](/reference/builtins/bytes/) — the buffer type.
- [std.bytes](/reference/stdlib/bytes/) — a smaller CRC-32 and varint helper.
