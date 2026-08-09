---
title: std.target
description: Facts about the target you are building for, available as compile-time constants.
---

`std.target` tells you about the target you are compiling for. Every value is a
compile-time constant, so the compiler folds it into your program while it builds.
It is a native module.

```beans
import std.target
```

Because these are compile-time constants, they describe the **selected** target,
not necessarily the machine you are on. Under `beansc run`, the selected target is
always the host, so the two match there.

## String facts

| Function | What it gives |
| --- | --- |
| `target.triple()` | the full target triple |
| `target.arch()` | the CPU architecture, like `x86_64` or `aarch64` |
| `target.os()` | the operating system |
| `target.env()` | the environment/ABI part of the triple |
| `target.object_format()` | the object file format |
| `target.endian()` | byte order, `little` or `big` |

## Number facts

| Function | What it gives |
| --- | --- |
| `target.pointer_bits()` | pointer size in bits, like 64 |
| `target.pointer_size()` | pointer size in bytes, like 8 |
| `target.stack_align()` | stack alignment in bytes |
| `target.max_simd_bits()` | widest SIMD vector in bits |

`max_simd_bits` follows the `--cpu` and `--features` flags you build with, since
those decide which vector widths are available.

```beans
import std.io
import std.target

fn main() {
    io.println(target.arch())            // e.g. aarch64
    io.println(target.pointer_size())    // e.g. 8
    io.println(target.endian())          // e.g. little
}
```

## See also

- [Compile-time guide](/guide/compile-time/) — how constants are folded during the
  build.
- [std.encoding.binary](/reference/stdlib/binary/) — its `native` byte order is
  resolved through this module.
