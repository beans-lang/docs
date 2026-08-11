---
title: Bytes
description: The growable, mutable byte buffer Bytes and its methods for building and reading binary data.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 1 type · 3 static methods · 29 instance methods.
<!-- coverage:summary:end -->

`Bytes` is a growable, changeable buffer of raw bytes. Use it to build binary
data, read fixed-width integers out of a buffer, or collect text before turning it
into a `string`.

Unlike [`string`](/reference/builtins/string/), a `Bytes` value can change in
place. Every method that changes the buffer returns the same buffer, so you can
chain calls.

`Bytes` is a native builtin with no `.b` source, reached through the runtime ABI
table in [`compiler/beans/expression.b`](https://github.com/beans-lang/beans/blob/main/compiler/beans/expression.b).
Its signatures are positional: the type in each slot is fixed, the names are not.

## Making a Bytes

Construct a fresh buffer with `new Bytes(n)`, which gives `n` zeroed bytes and
panics on a negative `n`. Three statics build or measure buffers:

```beans
Bytes.from(string) -> Bytes
Bytes.from_raw(RawPtr<u8>, int) -> Bytes
Bytes.uvarint_size(int) -> int
```

- `Bytes.from(s)` returns a new buffer holding a copy of string `s`'s bytes.
- `Bytes.from_raw(pointer, len)` copies `len` bytes from a raw pointer without
  taking ownership. It requires `unsafe`; a null pointer is accepted only when
  `len` is zero.
- `Bytes.uvarint_size(v)` returns how many bytes `v` would take as an unsigned
  varint, without writing anything.

```beans
let buf: Bytes = new Bytes(0)
let text: Bytes = Bytes.from("hello")
```

## Methods

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

### Size and shape

- `len()` is the number of bytes.
- `as_ptr()` borrows the buffer's raw pointer and requires `unsafe`. The pointer
  is null for an empty buffer. Keep the `Bytes` alive, do not free the pointer,
  and do not resize, reserve, append, or push while using it.
- `reserve(n)` makes room for at least `n` bytes without changing the length.
- `resize(n)` grows or shrinks the buffer to `n` bytes; new bytes read as zero.
- `fill(v)` sets every existing byte to `v`.

### Single bytes

- `get(i)` returns the byte at `i` as an integer, and panics if `i` is out of
  range.
- `set(i, v)` writes the byte at `i`, and panics if `i` is out of range.
- `push(v)` adds one byte at the end, growing the buffer.

### Fixed-width integers (little-endian)

The `get_*` readers return a whole number read at a byte position, and the `put_*`
writers write one at a position. All are little-endian and panic when the position
plus the width runs past the end of the buffer. `put_*` returns the buffer, so
writes chain.

### Copying and appending

- `slice(from, to)` returns a new buffer with the bytes in `[from, to)`.
- `copy_from(src, at)` copies all of `src`'s bytes into this buffer starting at
  `at`.
- `append(other)` adds another buffer's bytes at the end; `append_string(s)` adds a
  string's bytes; `append_i64(v)` adds `v` as 8 little-endian bytes; and
  `append_range(src, from, to)` adds `src`'s bytes in `[from, to)`.

### Turning bytes into text

- `to_string()` returns every byte as a string, including any NUL bytes.
- `to_string_until_nul()` stops at the first NUL byte. The names say which one you
  get, so a binary-safe reader cannot pick the truncating form by accident.

### Varints and checksums

A varint is a compact way to store an integer using fewer bytes for small values.
Beans uses unsigned LEB128 over the full 64-bit pattern, so a negative value takes
10 bytes.

- `append_uvarint(v)` adds `v` as an unsigned varint.
- `get_uvarint(pos)` reads an unsigned varint that starts at `pos`. Advance your
  own position by `Bytes.uvarint_size(v)` to read the next one.
- `crc32(from, to)` returns the IEEE CRC-32 checksum of the bytes in `[from, to)`.

## Comparing

`==` and `!=` compare two `Bytes` by value: same length and same bytes.

## Examples

Build a record by chaining, then read it back:

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

Write a run of varints, then walk them back out with `uvarint_size`:

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

## See also

- [string](/reference/builtins/string/), immutable text.
- [Files and mapping](/reference/builtins/files/), `File.read` and `File.write` use `Bytes`.
