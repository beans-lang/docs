---
title: Compile-time features
description: Layout query (size_of, align_of, offset_of), বেছে নেওয়া target, আর CPU feature dispatch — সবই compile-time-এ ঠিক হয়ে যায়।
---

Beans কয়েকটা জিনিস compile-time-এই constant বানিয়ে ফেলে — সবসময় **বেছে
নেওয়া target**-এর জন্য (`--target` যা বাছে, নয়তো default-এ host)। যেহেতু
native backend আর interpreter — দুটোই একই folded সংখ্যা পড়ে, তাদের মধ্যে
কখনও গরমিল হতে পারে না।

## Layout query

তিনটা form একটা **type** নিয়ে layout-এর প্রশ্নের জবাব দেয়:

```beans
let bytes: int = size_of(Packet)
let step: int  = align_of([f32; 4])
let word: int  = size_of(RawPtr<Packet>)
let at: int    = offset_of(Packet, count)
```

- `size_of(T)`, `align_of(T)` আর `offset_of(T, field)` হলো contextual form,
  একটা type নেয়। প্রতিটা নামের এই অর্থ শুধু `(`-এর ঠিক আগে, তাই একই শব্দগুলো
  অন্য জায়গায় সাধারণ identifier হিসেবে ব্যবহারযোগ্যই থাকে।
- value-গুলো বেছে নেওয়া target-এর compile-time constant।
  `beansc build --target X` X-এর layout জানায়, host-এর না।
- যেসব type চলে: integer, float, `bool`, `decimal`, `string`, `RawPtr<T>`,
  `Slice<T>`, SIMD value, fixed array (ভেতরে nested হলেও), `struct` আর
  `extern "C"` struct/union, আর class বা interface reference (একটা reference
  হলো একটা pointer)।
- যেগুলো নাকচ, আর তার জন্য নির্দিষ্ট বার্তা দেয়: কোনো type parameter (generic
  body-র ভেতরে `size_of(T)`), আর `Option`/`Result`/user enum। এগুলো payload
  অনুযায়ী কখনও null niche, কখনও inline aggregate, কখনও boxed form বেছে নেয়,
  তাই জানানোর মতো একটাই সংখ্যা নেই।
- `offset_of`-এর জন্য একটা `struct`/`union` আর একটা আসল field-এর নাম লাগে।

`extern "C"` record-এর জন্য এই সংখ্যাগুলো C-এর `sizeof`/`alignof`/`offsetof`-এর
সাথে মেলে, Clang-এর বিপরীতে যাচাই করা।

## বেছে নেওয়া target

`std.target` বেছে নেওয়া target-এর তথ্য compile-time constant হিসেবে পড়ে:

```beans
import std.io
import std.target

fn main() {
    io.println(target.triple())            // "arm64-apple-darwin"
    io.println("{target.pointer_bits()}")  // 64
}
```

String: `triple`, `arch`, `os`, `env`, `object_format`, `endian`। Int:
`pointer_bits`, `pointer_size`, `stack_align`, `max_simd_bits`। `beansc run`-এর
নিচে বেছে নেওয়া target সবসময় host-ই। `max_simd_bits` `--cpu` আর `--features`
মেনে চলে। দেখুন [std.target](/bn/reference/stdlib/target/)।

## CPU feature dispatch

`cpu.has(CpuFeature.x)` **যে machine চলছে** তাকে জিজ্ঞেস করে, তাই hardware
সাপোর্ট করলে তবেই একটা দ্রুত পথ বেছে নেওয়া যায়:

```beans
import std.cpu

feature "aes" fn mix_fast(seed: int) -> int { /* ... */ }
fn mix_generic(seed: int) -> int { /* ... */ }

fn mix(seed: int) -> int {
    if cpu.has(CpuFeature.aes) { return mix_fast(seed) }
    return mix_generic(seed)
}
```

- feature-এর নামটা **বেছে নেওয়া target**-এর feature set-এর বিপরীতে যাচাই করা
  হয়, তাই arm64 target করে `avx2` জিজ্ঞেস করা একটা compile error — চিরকালের
  `false` না।
- `CpuFeature` কোনো ঘোষণাযোগ্য type-ও না, store করার মতো value-ও না। memory
  order-এর মতোই, এটা call site-এ লেখা হয়।
- `feature "x" fn` একটা body-কে সেই feature-এর instruction ব্যবহার করার অনুমতি
  দেয়। সেটা call করা (বা function value হিসেবে store করা)-র জন্য feature-টা
  **নিশ্চিত present** হতে হবে: হয় একটা মিলে যাওয়া `if cpu.has(...)` guard-এর
  ভেতরে, নাহয় একই feature দাবি করে এমন আরেকটা function থেকে, নাহয় `--features +x`
  দিয়ে করা কোনো build-এ।
- x86-এ `sse4.1`/`sse4.2` `CpuFeature`-এ underscore দিয়ে লেখা হয়:
  `CpuFeature.sse4_2`। string form-গুলো (`--features`, `feature "x" fn`) dot-টা
  রেখে দেয়।

পুরো operation set আছে
[std.cpu আর std.intrinsic](/bn/reference/stdlib/cpu-intrinsic/)-এ।
[attribute আর modifier](/bn/guide/attributes/) পেজ বাকি declaration modifier-এর
পাশে `feature`-কেও তালিকায় রাখে।

[Annotation argument](/bn/guide/annotations/)-ও compile-time-এ যাচাই হয়। এগুলোতে
constant boolean, number, string, enum variant আর list চলে, কিন্তু runtime
value-এর কোনো call বা read চলে না।
