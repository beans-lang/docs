---
title: Compile-time features
description: Layout queries (size_of, align_of, offset_of), the selected target, and CPU feature dispatch — all resolved at compile time.
---

Beans folds a few things to constants at compile time, always for the **selected
target** (what `--target` picks, or the host by default). Because both the
native backend and the interpreter read the same folded numbers, they can never
disagree.

## Layout queries

Three forms answer layout questions about a **type**:

```beans
let bytes: int = size_of(Packet)
let step: int  = align_of([f32; 4])
let word: int  = size_of(RawPtr<Packet>)
let at: int    = offset_of(Packet, count)
```

- `size_of(T)`, `align_of(T)`, and `offset_of(T, field)` are contextual forms
  taking a type — they mean this only immediately before `(`.
- The values are compile-time constants of the selected target.
  `beansc build --target X` reports X's layout, not the host's.
- Supported types: integers, floats, `bool`, `decimal`, `string`, `RawPtr<T>`,
  `Slice<T>`, SIMD values, fixed arrays (nested included), `struct` and
  `extern "C"` struct/union, and class or interface references (a reference is
  one pointer).
- Rejected, with a specific message: a type parameter (`size_of(T)` inside a
  generic body), and `Option`/`Result`/user enums — they pick between a null
  niche, an inline aggregate, and a boxed form depending on payload, so there is
  no single number.
- `offset_of` needs a `struct`/`union` and a real field name.

For `extern "C"` records these numbers match C's `sizeof`/`alignof`/`offsetof`,
verified against Clang.

## The selected target

`std.target` reads the selected target's facts as compile-time constants:

```beans
import std.io
import std.target

fn main() {
    io.println(target.triple())            // "arm64-apple-darwin"
    io.println("{target.pointer_bits()}")  // 64
}
```

Strings: `triple`, `arch`, `os`, `env`, `object_format`, `endian`. Ints:
`pointer_bits`, `pointer_size`, `stack_align`, `max_simd_bits`. Under
`beansc run` the selected target is always the host. `max_simd_bits` follows
`--cpu` and `--features`. See [std.target](/reference/stdlib/target/).

## CPU feature dispatch

`cpu.has(CpuFeature.x)` asks the machine that is **running**, so you can pick a
faster path only when the hardware supports it:

```beans
import std.cpu

feature "aes" fn mix_fast(seed: int) -> int { /* ... */ }
fn mix_generic(seed: int) -> int { /* ... */ }

fn mix(seed: int) -> int {
    if cpu.has(CpuFeature.aes) { return mix_fast(seed) }
    return mix_generic(seed)
}
```

- The feature name is validated against the **selected target's** feature set,
  so asking about `avx2` while targeting arm64 is a compile error, not a
  permanent `false`.
- `CpuFeature` is neither a declarable type nor a storable value — like a memory
  order, it is written at the call site.
- `feature "x" fn` marks a body as allowed to use that feature's instructions.
  Calling it (or storing it as a function value) requires the feature to be
  **known present**: inside a matching `if cpu.has(...)` guard, from another
  function that requires the same feature, or in a build given `--features +x`.
- x86 spells `sse4.1`/`sse4.2` with an underscore in `CpuFeature`:
  `CpuFeature.sse4_2`. The string forms (`--features`, `feature "x" fn`) keep
  the dot.

See [std.cpu and std.intrinsic](/reference/stdlib/cpu-intrinsic/) and
[Attributes and modifiers](/guide/attributes/).

## Next

- [Attributes and modifiers](/guide/attributes/)
- [Unsafe and raw memory](/guide/unsafe/)
- [std.target](/reference/stdlib/target/)

Source: [`spec/SYNTAX.md`](https://github.com/beans-lang/beans/blob/main/spec/SYNTAX.md).
