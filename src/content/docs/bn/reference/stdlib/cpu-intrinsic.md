---
title: std.cpu and std.intrinsic
description: চলন্ত CPU-কে জিজ্ঞেস করা তার কী কী feature আছে, তার উপর কোড gate করা, আর low-level intrinsic-এ পৌঁছানো।
---

<!-- coverage:summary -->
**API সারমর্ম** (Beans source থেকে `npm run coverage` দিয়ে বানানো): 17টা package function · 1টা type।
<!-- coverage:summary:end -->

এই দুটো native module low-level CPU access দেয়। `std.cpu` machine-কে জিজ্ঞেস করে তার কী কী instruction-set feature আছে আর তার উপর কোড gate করে। `std.intrinsic` অল্প কয়েকটা নির্দিষ্ট hardware operation খুলে দেয়। দুটোই checker-এ typed, তাই এদের function-গুলো positional আর কোনো parameter name বহন করে না।

## std.cpu

```beans
import std.cpu
```

```beans
has(CpuFeature) -> bool
has_name(string) -> bool
```

- `has(CpuFeature.x)` জিজ্ঞেস করে চলন্ত machine-এ `x` feature-টা আছে কি না।
- `has_name(name)` একই প্রশ্ন করে, তবে feature-এর নাম string দিয়ে।

`cpu.has` program যে machine-এ সত্যিই চলছে সেটাকে জিজ্ঞেস করে, build target-কে নয়। `CpuFeature` কোনো নির্দিষ্ট enum না: valid selector-গুলো হলো বেছে নেওয়া target-এর feature নাম, আর সেগুলো call site-এই চেক করা হয়।

Architecture অনুযায়ী feature নাম:

- **x86-64:** `sse2`, `sse3`, `ssse3`, `sse4_1`, `sse4_2`, `popcnt`, `avx`,
  `avx2`, `fma`, `bmi`, `bmi2`, `f16c`, `aes`, `pclmul`, `avx512f`। ISA-তে যে নামে একটা dot আছে (যেমন `sse4.1`) সেটা underscore দিয়ে লেখা হয় (`sse4_1`)।
- **AArch64:** `neon`, `fp16`, `dotprod`, `crc`, `aes`।

### Feature-gated function

একটা function-এর body-কে চিহ্নিত করে দেওয়া যায় যে সেটা একটা feature-এর instruction ব্যবহার করার অনুমতি পেয়েছে:

```beans
feature "avx2" fn wide_add() {
    // may use AVX2 instructions
}
```

এমন একটা function call করতে হলে feature-টা যে আছে সেটা জানা থাকতে হবে। তিনটা ক্ষেত্রে সেটা সত্যি হয়: সেই feature-এর জন্য একটা `if cpu.has(...)` guard-এর ভেতরে, এমন আরেকটা function থেকে যেটা এমনিতেই feature-টা দাবি করে, কিংবা `--features +avx2` দিয়ে বানানো একটা build-এ।

উদাহরণটা `aes` ব্যবহার করে, যেটা এমন অল্প কয়েকটা feature-এর একটা যেগুলোকে x86-64 আর AArch64 দুটোই একই নামে ডাকে, তাই এই এক file-ই যেকোনোটায় compile হয়:

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

`feature`-এর জন্য [attributes guide](/bn/guide/attributes/) দেখুন।

## std.intrinsic

```beans
import std.intrinsic
```

এগুলো একেকটা single hardware operation-এ map করে। এদের সবগুলোর জন্য [`unsafe`](/bn/guide/unsafe/) লাগে, আর সেটটা একটা বন্ধ allowlist, এতে নতুন কিছু যোগ করা যায় না।

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

- `popcount` set করা bit গোনে। `leading_zeros` আর `trailing_zeros` শুরুর আর শেষের zero bit গোনে; input শূন্য হলে 64 দেয়।
- `bswap16`, `bswap32`, আর `bswap64` byte order উল্টে দেয়। narrow form-গুলো low বাইটগুলোর উপর কাজ করে আর বাকিটা শূন্য রেখে দেয়।
- `rotate_left` আর `rotate_right` প্রথম argument-এর bit-গুলোকে দ্বিতীয়টার সমান ঘোরায়।
- `sqrt` আর `sqrt32` হলো square root, `float` আর `f32`-এর জন্য। `fma` আর `fma32` হলো fused multiply-add (`a * b + c`, একবারেই round করা)।
- `prefetch(ptr)` CPU-কে ইঙ্গিত দেয় একটা cache line load করতে। `spin_hint()` ইঙ্গিত দেয় যে একটা spin loop চলছে। কোনোটারই কোনো দেখা-যাওয়া result নেই।
- `crc32c(acc, x)` হলো একটা CRC-32C step। এটা feature-gated: x86-64-তে `sse4.2` লাগে বা arm64-তে `crc`, আর 32-bit x86-এ এটা refuse করা হয়।

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

## আরও দেখুন

- [Unsafe guide](/bn/guide/unsafe/)।
- [Attributes guide](/bn/guide/attributes/), `feature` function।
- [std.target](/bn/reference/stdlib/target/), feature-এর available থাকা build-এর `--cpu`/`--features` মেনে চলে।
