---
title: 'Types'
description: 'Beans-এর type system-এর একটা ঝটপট পরিচয়: primitive, number-এর নিয়ম, decimal, আর collection, সাথে পুরো reference-এর লিংক।'
---

Beans statically typed, আর এখানে **কোনো inference নেই**: প্রতিটা binding,
parameter, আর field তার type বলে দেয়। এই পেজটা শেখানোর জন্য একটা overview। পুরো
signature দেখতে চাইলে [builtin reference](/bn/reference/builtins/) দেখুন।

## Primitive type

সব primitive generated code-এ unboxed, আর সবগুলোরই method আছে (`(-5).abs()`,
`3.7.round()`)।

- Integer: `int` (64-bit signed), `i8 i16 i32 i64`, `uint` (64-bit unsigned),
  `u8 u16 u32 u64`, আর `byte` (= `u8`)।
- Float: `float` (= `f64`), `f32 f64`।
- `decimal`: exact base-10 number, টাকা-পয়সার জন্য (নিচে দেখুন)।
- `bool`, `string` (immutable UTF-8)।

কোনো `usize`/`isize` নেই: word type হলো `int` আর `uint`। পুরো বিস্তারিত:
[Primitive types](/bn/reference/builtins/primitives/)।

## Number-এর নিয়ম

Beans নিজে থেকে কখনও number convert করে না। নিয়মগুলো ছোট আর কড়া:

- একটা literal যে জায়গায় বসছে, সেটা যে type চায় সেটাই নেয়: `let p: decimal = 19.99`
  একটা decimal; `let f: f64 = 19.99` একটা float। কোনো numeric suffix নেই।
- কেউ কিছু না চাইলে, integer literal হয় `int` আর decimal-point literal হয় `f64`।
- **কখনও implicit numeric conversion নেই।** type মেলাতে `as` দিতে হয়:
  `price * (qty as decimal)`।
- একটা integer literal যে জায়গায় বসছে, সেই type-এ ধরতে হবে। ওই type-এর exact range-এর
  বাইরের value checker reject করে।
- fixed-width integer-এর `+`, `-`, `*`, unary `-`, আর bit operation ওই width-এ
  wrap করে। zero দিয়ে divide বা modulo করলে panic হয়।

আরও: [Numbers and decimal](/bn/reference/builtins/numbers/) আর
[Operators and precedence](/bn/guide/operators/)।

## decimal

`decimal` হলো exact base-10 number। `0.1 + 0.2` হয় ঠিক `0.3`, কোনো rounding error
ছাড়া — এই কারণেই টাকা-পয়সার প্রতিটা value-র জন্য এই type-টা ব্যবহার করা হয়। টাকার
অঙ্কে `float`-এর বদলে সবসময় `decimal` বেছে নেওয়া হয়।

```beans
let price: decimal = 19.99
let qty: int = 3
let total: decimal = price * (qty as decimal)   // 59.97, exactly
```

1.0 contract-এ থাকে 38টা significant digit; এর বাইরে গেলে `decimal overflow`
বলে panic হয়। division-এ সর্বোচ্চ 38টা significant digit পাওয়া যায়, আর শেষটা
half-even round হয়। call site-এ নিজের পছন্দমতো mode বেছে round করা যায়:
`total.round(2, RoundingMode.half_even)`।

## Collection

```beans
var xs: List<int> = [1, 2, 3]
var m: Map<string, int> = {"a": 1, "b": 2}
var ordered: OrderedMap<string, int> = {}
xs.push(4)
let got: Option<int> = m.get("a")     // no null, no panic
```

`List`, `Map`, আর `OrderedMap` generic আর move-only। bracket read চেক করা হয়:
index range-এর বাইরে গেলে `xs[i]` panic করে, আর key না থাকলে `m[key]` panic করে।
যেখানে absence স্বাভাবিক, সেখানে `.get(...)` ব্যবহার করা হয় — এটা একটা `Option` ফেরত
দেয়। পুরো বিস্তারিত: [Collections](/bn/reference/builtins/collections/)।

## কোনো null নেই, কোনো exception নেই

Beans-এ null নেই, exception নেই। absence-এর জন্য `Option<T>`; failure-এর জন্য
`Result<T>`। দেখুন [Option and Result](/bn/guide/errors/)।

## নিজের বানানো type

নিজের type তৈরি করা হয় এগুলো দিয়ে:

- [Classes](/bn/guide/classes/): method, `init`/`deinit`, inheritance, আর interface-সহ
  reference object।
- [Structs and unions](/bn/guide/structs/): inline value type, C-layout record-ও।
- [Enums](/bn/guide/enums/): tagged variant, `match`-এর জন্য বানানো।
- [Generics](/bn/guide/generics/): interface bound-সহ type parameter।
