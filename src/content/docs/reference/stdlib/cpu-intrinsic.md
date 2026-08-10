---
title: std.cpu and std.intrinsic
description: Ask the running CPU which features it has, gate code on them, and reach low-level intrinsics.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 17 package functions · 1 type.
<!-- coverage:summary:end -->

These two native modules give you low-level CPU access. `std.cpu` asks the machine
which instruction-set features it has and gates code on them. `std.intrinsic`
exposes a small, fixed set of hardware operations. Both are typed in the checker,
so their functions are positional and carry no parameter names.

## std.cpu

```beans
import std.cpu
```

```beans
has(CpuFeature) -> bool
has_name(string) -> bool
```

- `has(CpuFeature.x)` asks whether the running machine has feature `x`.
- `has_name(name)` asks the same question by feature name string.

`cpu.has` asks the machine your program is actually running on, not the build
target. `CpuFeature` is not a fixed enum: the valid selectors are the feature
names of the selected target, and they are checked at the call site.

Feature names by architecture:

- **x86-64:** `sse2`, `sse3`, `ssse3`, `sse4_1`, `sse4_2`, `popcnt`, `avx`,
  `avx2`, `fma`, `bmi`, `bmi2`, `f16c`, `aes`, `pclmul`, `avx512f`. Names with a
  dot in the ISA (like `sse4.1`) are written with an underscore (`sse4_1`).
- **AArch64:** `neon`, `fp16`, `dotprod`, `crc`, `aes`.

### Feature-gated functions

You can mark a function body as allowed to use a feature's instructions:

```beans
feature "avx2" fn wide_add() {
    // may use AVX2 instructions
}
```

Calling such a function requires the feature to be known present. That is true in
three cases: inside an `if cpu.has(...)` guard for that feature, from another
function that already requires the feature, or in a build made with
`--features +avx2`.

The example uses `aes`, one of the few features both x86-64 and AArch64 name the
same way, so this one file compiles on either:

<!-- beans:compile -->
```beans
import std.io
import std.cpu

feature "aes" fn fast_path() -> int {
    return 1
}

fn main() {
    if cpu.has(CpuFeature.aes) {
        io.println("fast path {fast_path()}")
    } else {
        io.println("scalar fallback")
    }
    io.println("has aes by name {cpu.has_name("aes")}")
}
```

See the [attributes guide](/guide/attributes/) for `feature`.

## std.intrinsic

```beans
import std.intrinsic
```

These map to single hardware operations. All of them require
[`unsafe`](/guide/unsafe/), and the set is a closed allowlist, you cannot add to
it.

```beans
popcount(int) -> int
leading_zeros(int) -> int
trailing_zeros(int) -> int
bswap16(int) -> int
bswap32(int) -> int
bswap64(int) -> int
rotate_left(int, int) -> int
rotate_right(int, int) -> int
crc32c(int, int) -> int
sqrt(float) -> float
sqrt32(f32) -> f32
fma(float, float, float) -> float
fma32(f32, f32, f32) -> f32
prefetch(RawPtr<u8>)
spin_hint()
```

- `popcount` counts set bits. `leading_zeros` and `trailing_zeros` count leading
  and trailing zero bits; a zero input gives 64.
- `bswap16`, `bswap32`, and `bswap64` reverse byte order. The narrow forms work on
  the low bytes and leave the rest zero.
- `rotate_left` and `rotate_right` rotate the bits of the first argument by the
  second.
- `sqrt` and `sqrt32` are square root, for `float` and `f32`. `fma` and `fma32`
  are fused multiply-add (`a * b + c`, rounded once).
- `prefetch(ptr)` hints the CPU to load a cache line. `spin_hint()` hints that you
  are in a spin loop. Neither has an observable result.
- `crc32c(acc, x)` is one CRC-32C step. It is feature-gated: it needs `sse4.2` on
  x86-64 or `crc` on arm64, and it is refused on 32-bit x86.

<!-- beans:compile -->
```beans
import std.io
import std.intrinsic

fn main() {
    unsafe {
        io.println("popcount {intrinsic.popcount(255)}")   // 8
        io.println("sqrt {intrinsic.sqrt(16.0)}")          // 4

        let block: RawPtr<u8> = RawPtr.alloc(64)
        intrinsic.prefetch(block)
        block.free()
        intrinsic.spin_hint()
        io.println("hints are safe to ignore")
    }
}
```

## See also

- [Unsafe guide](/guide/unsafe/).
- [Attributes guide](/guide/attributes/), `feature` functions.
- [std.target](/reference/stdlib/target/), feature availability follows the
  build's `--cpu`/`--features`.
