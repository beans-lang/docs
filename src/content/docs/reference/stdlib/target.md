---
title: std.target
description: Facts about the target you are building for, available as compile-time constants.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 10 package functions.
<!-- coverage:summary:end -->

`std.target` tells you about the target you are compiling for. Every value is a
compile-time constant, so the compiler folds it into your program while it builds.
It is a native module, and its functions are typed in the checker; none take an
argument.

```beans
import std.target
```

Because these are compile-time constants, they describe the **selected** target,
not necessarily the machine you are on. Under `beansc run`, the selected target is
always the host, so the two match there.

## String facts

```beans
triple() -> string
arch() -> string
os() -> string
env() -> string
object_format() -> string
endian() -> string
```

- `triple()` is the full target triple.
- `arch()` is the CPU architecture, like `x86_64` or `aarch64`.
- `os()` is the operating system.
- `env()` is the environment/ABI part of the triple.
- `object_format()` is the object file format.
- `endian()` is the byte order, `little` or `big`.

## Number facts

```beans
pointer_bits() -> int
pointer_size() -> int
stack_align() -> int
max_simd_bits() -> int
```

- `pointer_bits()` is the pointer size in bits, like 64.
- `pointer_size()` is the pointer size in bytes, like 8.
- `stack_align()` is the stack alignment in bytes.
- `max_simd_bits()` is the widest SIMD vector in bits. It follows the `--cpu` and
  `--features` flags you build with, since those decide which vector widths are
  available.

<!-- beans:compile -->
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

- [Compile-time guide](/guide/compile-time/), how constants are folded during the
  build.
- [std.encoding.binary](/reference/stdlib/binary/), its `native` byte order is
  resolved through this module.
