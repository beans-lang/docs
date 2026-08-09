---
title: Bytes
description: The growable, mutable byte buffer Bytes and its methods for building and reading binary data.
---

`Bytes` is a growable, changeable buffer of raw bytes. Use it to build binary
data, read fixed-width integers out of a buffer, or collect text before turning it
into a `string`.

Unlike [`string`](/reference/builtins/string/), a `Bytes` value can change in
place. Methods that change the buffer return the same buffer, so you can chain
them.

`Bytes` is a native builtin, reached through the runtime ABI table at
[`compiler/beans/expression.b`](https://github.com/beans-lang/beans/blob/main/compiler/beans/expression.b).

## Making a Bytes

| Form | Result |
| --- | --- |
| `new Bytes(n)` | a buffer of `n` zeroed bytes; panics on negative `n` |
| `Bytes.from(s)` | a new buffer holding a copy of string `s`'s bytes |
| `Bytes.uvarint_size(v)` | static; how many bytes `v` takes as an unsigned varint |

```beans
let buf: Bytes = new Bytes(0)
let text: Bytes = Bytes.from("hello")
```

## Size and shape

| Method | Returns | Notes |
| --- | --- | --- |
| `len()` | `int` | number of bytes |
| `reserve(n)` | self | make room for at least `n` bytes |
| `resize(n)` | self | grow or shrink to `n` bytes; new bytes read as zero |
| `fill(v)` | self | set every byte to `v` |

## Reading and writing single bytes

| Method | Returns | Notes |
| --- | --- | --- |
| `get(i)` | `int` | byte at `i`; panics if out of range |
| `set(i, v)` | self | set byte at `i`; panics if out of range |
| `push(v)` | self | add one byte at the end |

## Fixed-width integers (little-endian)

These read and write whole numbers at a byte position. All are little-endian and
panic if the position is out of range.

| Method | Returns | Notes |
| --- | --- | --- |
| `get_u8(pos)` `get_u16(pos)` `get_u32(pos)` `get_u64(pos)` `get_i64(pos)` | `int` | read an integer |
| `put_u8(pos, v)` `put_u16(pos, v)` `put_u32(pos, v)` `put_u64(pos, v)` `put_i64(pos, v)` | self | write an integer |

## Copying and appending

| Method | Returns | Notes |
| --- | --- | --- |
| `slice(from, to)` | `Bytes` | a new buffer with the bytes in `[from, to)` |
| `copy_from(src, at)` | self | copy `src`'s bytes into this buffer starting at `at` |
| `append(other)` | self | add another `Bytes` at the end |
| `append_string(s)` | self | add a string's bytes at the end |
| `append_i64(v)` | self | add `v` as 8 little-endian bytes |
| `append_range(src, from, to)` | self | add `src`'s bytes in `[from, to)` |

## Turning bytes into text

| Method | Returns | Notes |
| --- | --- | --- |
| `to_string()` | `string` | every byte, including any NUL bytes |
| `to_string_until_nul()` | `string` | stops at the first NUL byte |

## Varints and checksums

A varint is a compact way to store an integer using fewer bytes for small values.
Beans uses unsigned LEB128 over the full 64-bit pattern; a negative value takes 10
bytes.

| Method | Returns | Notes |
| --- | --- | --- |
| `append_uvarint(v)` | self | add `v` as an unsigned varint |
| `get_uvarint(pos)` | `int` | read an unsigned varint starting at `pos` |
| `crc32(from, to)` | `int` | IEEE CRC-32 checksum of bytes `[from, to)` |

## Comparing

`==` and `!=` compare two `Bytes` by value: same length and same bytes.

## Chaining example

```beans
let buf: Bytes = new Bytes(0)
buf.append_string("id=").append_i64(42).push(10)
let out: string = buf.to_string()
```

## See also

- [string](/reference/builtins/string/) — immutable text.
- [Files and mapping](/reference/builtins/files/) — `File.read` and `File.write` use `Bytes`.
