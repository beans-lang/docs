---
title: Primitive types
description: Beans-এর সবচেয়ে বেসিক builtin type গুলো — unit আর bool থেকে শুরু করে integer, float, byte, আর string।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 17 types · 2 instance methods.
<!-- coverage:summary:end -->

**Primitive type** হলো Beans-এর সবচেয়ে ছোট ধরনের value। এটা অন্য কোনো value দিয়ে
বানানো না। প্রতিটা primitive সরাসরি (unboxed) generated code-এ থাকে, তাই এগুলো
ব্যবহার করা সস্তা।

প্রতিটা binding-এর সাথে তার type লেখা থাকে। যেমন:

```beans
let x: int = 5
let ok: bool = true
let name: string = "beans"
```

## type গুলো

| Type | কী ধরে রাখে | Size |
| --- | --- | --- |
| `unit` | কিছুই না; খালি value | 0 bytes |
| `bool` | `true` বা `false` | 1 byte |
| `int` | 64-bit signed পূর্ণসংখ্যা | 8 bytes |
| `i8` `i16` `i32` `i64` | নির্দিষ্ট চওড়ার signed পূর্ণসংখ্যা | 1, 2, 4, 8 bytes |
| `uint` | 64-bit unsigned পূর্ণসংখ্যা (word type) | 8 bytes |
| `u8` `u16` `u32` `u64` | নির্দিষ্ট চওড়ার unsigned পূর্ণসংখ্যা | 1, 2, 4, 8 bytes |
| `byte` | `u8`-এর আরেক নাম | 1 byte |
| `float` | 64-bit IEEE double | 8 bytes |
| `f32` `f64` | নির্দিষ্ট চওড়ার float | 4, 8 bytes |
| `decimal` | base-10 নিখুঁত সংখ্যা | 32 bytes, align 16 |
| `string` | immutable UTF-8 text |, |

## যে নাম গুলো জেনে রাখা দরকার

- `int` হলো `i64`-এর আসল রূপ। `int` লিখলে একটা signed 64-bit পূর্ণসংখ্যা পাওয়া
  যায়।
- `float` আর `f64` একই জিনিস।
- `byte` আর `u8` একই জিনিস।
- `uint` আর `int` হলো **word type**। Beans-এ `usize` বা `isize` নেই; signed
  word-sized সংখ্যার জন্য `int` ব্যবহার করা হয়, আর unsigned-এর জন্য `uint`।

## unit

`unit` হলো খালি value। এটা 0 byte নেয়। যে function কিছুই return করে না, সেটা
`unit` return করে। এটা খুব কমই হাতে লিখতে হয়।

## bool

`bool` হলো `true` বা `false`, এক byte।

## decimal

`decimal` হলো base-10 নিখুঁত সংখ্যা। যেসব জায়গায় binary-float-এর rounding error
হলে ভুল হবে — যেমন টাকা-পয়সা — সেখানে এটা কাজে লাগে। এটা 32 byte নেয়, আর 16-তে
align হয়।

`decimal` শুধু সেই সব target-এ থাকে যেগুলো এটা support করে।
`thumbv7em-none-eabi` আর `riscv32-unknown-none-elf`-এ এটা নেই। নিয়মগুলো
[Numbers আর decimal](/bn/reference/builtins/numbers/)-এ পড়ে নিন।

## string

`string` হলো immutable UTF-8 text। একবার বানানোর পর আর বদলায় না। প্রতিটা method
দেখতে [string](/bn/reference/builtins/string/) পড়ুন। বাড়তে পারা, বদলানো যায় এমন byte
buffer লাগলে [Bytes](/bn/reference/builtins/bytes/) দেখুন।

## সবকিছুরই method আছে

এমনকি একটা সাধারণ number বা string literal-এরও method আছে। literal-এর ওপর
সরাসরি method call করা যায়:

```beans
let a: int = (-5).abs()
let b: float = 3.7.round()
let c: Result<int> = "42".to_int()
```

## আরও দেখুন

- [Numbers আর decimal](/bn/reference/builtins/numbers/), number-এর নিয়ম আর cast।
- language guide-এর [type system](/bn/guide/types/)।
