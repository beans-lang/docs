---
title: std.encoding.binary
description: Read and write fixed-width integers, floats, and varints over a Bytes buffer, with a chosen byte order.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 36 package functions · 5 types · 2 constructors · 25 instance methods · 6 public fields · 3 enum variants.
<!-- coverage:summary:end -->

`std.encoding.binary` reads and writes fixed-width numbers and varints in a
[`Bytes`](/reference/builtins/bytes/) buffer with an explicit byte order. It is
pure Beans over `Bytes`: the native `Bytes` word accessors stay the storage
primitives (they are little-endian and panic when out of range), and this package
adds the checked layer on top: explicit byte order, `Result` errors instead of
panics, bit-preserving float conversion, and cursors. Read the source at
[`stdlib/std/encoding/binary/binary.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/encoding/binary/binary.b).

```beans
import std.encoding.binary
```

Reads and writes never touch memory outside the checked range. A read past the
end of the buffer is an error with kind `eof`, and a write that will not fit is an
error with kind `range`, never a panic.

## ByteOrder

`ByteOrder` picks how multi-byte numbers are laid out.

```beans
pub enum ByteOrder
little
big
native
```

`native` is folded at compile time through [std.target](/reference/stdlib/target/),
so it becomes whichever order the target machine uses. Single-byte functions
(`read_u8`, `read_i8`, `write_u8`, `write_i8`, `append_u8`, `append_i8`) take no
order, because one byte has none.

## Uvarint and Varint

Varint reads return a small struct that carries both the decoded value and how
many bytes it took, so the caller can advance past it.

```beans
pub struct Uvarint
pub value: u64
pub size: int

pub struct Varint
pub value: int
pub size: int
```

## Positional reads

Read a number at a byte position. The buffer is borrowed, not consumed, and
nothing is changed. If the buffer is too short for the width, you get an error
with kind `eof`.

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

Float reads are bit-preserving: the exact bytes become the exact float, so
infinities, quiet NaN payloads, and negative zero all survive the round trip.

## Positional writes

Write a number at a byte position into space that already exists. If the width
will not fit within the current length, you get an error with kind `range`. All
return `Result<bool>`.

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

## Appends

Add a number to the end of the buffer, growing it by the width of the value.
These return nothing and never fail.

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

Append a fixed-width integer and read it straight back:

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

## Varints

A varint packs an integer into fewer bytes when it is small.

```beans
pub fn uvarint_size(value: u64) -> int
pub fn varint_size(value: int) -> int
pub fn append_uvarint(data: Bytes, value: u64)
pub fn read_uvarint(data: Bytes, pos: int) -> Result<Uvarint>
pub fn append_varint(data: Bytes, value: int)
pub fn read_varint(data: Bytes, pos: int) -> Result<Varint>
```

- `uvarint_size` and `varint_size` report how many bytes an encoding will take,
  from 1 up to 10.
- `append_uvarint` / `read_uvarint` are unsigned LEB128 over the 64-bit pattern:
  the same wire format as `Bytes.append_uvarint` and Go's `encoding/binary`
  `PutUvarint` / `Uvarint`.
- `append_varint` / `read_varint` are the signed zigzag form matching Go's
  `PutVarint`: `-1` encodes as `1`, `1` as `2`, and every value takes its zigzag
  width rather than ten bytes for all negatives.
- `read_uvarint` reports kind `eof` on a truncated input, and kind `overflow`
  when the varint runs past ten bytes or overflows 64 bits. `read_varint` decodes
  the unsigned form first, so it reports the same kinds.

Both reads return the value together with its byte width, so you can chain reads
by advancing `pos` past each one:

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

A `Reader` walks a buffer forward, tracking the read position for you. Build it
with the byte order it should use for every multi-byte read:

```beans
new Reader(order: ByteOrder)
```

`Bytes` is a move-only buffer, so the reader does not own one. Every method
borrows the buffer for the call and only the position lives in the reader, so a
`Reader` sits beside every other use of the same buffer with no clone.

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

- `position` is where the next read starts; it advances by the width of each
  successful read.
- `remaining` is the number of bytes left after `position`, never negative.
- `skip` moves forward `count` bytes; a negative count is kind `range`, and
  skipping past the end is kind `eof`.
- The `read_*` methods read at `position` and advance it, failing with the same
  kinds as their positional counterparts. `read_uvarint` unwraps the value from
  the `Uvarint` struct and `read_varint` from the `Varint` struct, since the
  reader already tracks the size.

## class Writer

A `Writer` writes numbers in sequence into space that already exists, tracking a
position the same way. Build it with the byte order for its multi-byte writes:

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

Each write advances `position` by the width written, and fails with kind `range`
if that width does not fit in the buffer. Unlike the free `append_*` functions,
a `Writer` does not grow the buffer, so size it first with `new Bytes(n)`.

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

## See also

- [Bytes](/reference/builtins/bytes/), the buffer type.
- [std.bytes](/reference/stdlib/bytes/), a smaller CRC-32 and varint helper.
