---
title: std.cpu and std.intrinsic
description: Ask the running CPU which features it has, gate code on them, and reach low-level intrinsics.
---

These two native modules give you low-level CPU access. `std.cpu` asks the machine
which instruction-set features it has and gates code on them. `std.intrinsic`
exposes a small, fixed set of hardware operations.

## std.cpu

```beans
import std.cpu
```

| Function | Returns | What it asks |
| --- | --- | --- |
| `cpu.has(CpuFeature.x)` | `bool` | does the running machine have feature `x`? |
| `cpu.has_name(name: string)` | `bool` | same, by feature name string |

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

<!-- beans:fragment -->
```beans
import std.io
import std.cpu

feature "dotprod" fn fast_path() {
    io.println("using dotprod")
}

fn main() {
    if cpu.has(CpuFeature.dotprod) {
        fast_path()
    } else {
        io.println("scalar fallback")
    }
}
```

See the [attributes guide](/guide/attributes/) for `feature`.

## std.intrinsic

```beans
import std.intrinsic
```

These map to single hardware operations. All of them require
[`unsafe`](/guide/unsafe/), and the set is a closed allowlist — you cannot add to
it.

| Function | What it does |
| --- | --- |
| `popcount(x)` | count set bits |
| `leading_zeros(x)` | count leading zero bits |
| `trailing_zeros(x)` | count trailing zero bits (zero gives 64) |
| `bswap16(x)` / `bswap32(x)` / `bswap64(x)` | reverse byte order |
| `rotate_left(x, n)` / `rotate_right(x, n)` | rotate bits |
| `sqrt(x: float) -> float` | square root |
| `sqrt32(x: f32) -> f32` | square root of an f32 |
| `fma(a, b, c) -> float` | fused multiply-add, rounds once |
| `fma32(a, b, c) -> f32` | same, for f32 |
| `prefetch(ptr)` | hint the CPU to load a cache line |
| `spin_hint()` | hint that you are in a spin loop |
| `crc32c(acc, x)` | CRC-32C step |

`crc32c` is feature-gated: it needs `sse4.2` on x86-64 or `crc` on arm64, and it
is refused on 32-bit x86.

```beans
import std.io
import std.intrinsic

fn main() {
    unsafe {
        io.println(intrinsic.popcount(255))   // 8
    }
}
```

## See also

- [Unsafe guide](/guide/unsafe/).
- [Attributes guide](/guide/attributes/) — `feature` functions.
- [std.target](/reference/stdlib/target/) — feature availability follows the
  build's `--cpu`/`--features`.
