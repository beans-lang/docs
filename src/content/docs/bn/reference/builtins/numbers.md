---
title: Numbers and decimal
description: Beans-এ number literal, type, cast আর wrapping কীভাবে কাজ করে, আর সাথে নিখুঁত base-10 decimal type।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 2 types · 2 instance methods · 5 enum variants.
<!-- coverage:summary:end -->

এই পেজে Beans-এ number নিয়ে নিয়মগুলো আছে: একটা literal কীভাবে তার type বেছে নেয়,
এক number type থেকে আরেকটায় কীভাবে যাওয়া যায়, আর নিখুঁত `decimal` type কীভাবে কাজ
করে। সব number type-এর পুরো তালিকার জন্য [Primitive type](/bn/reference/builtins/primitives/)
দেখুন।

## একটা literal কীভাবে তার type বেছে নেয়

number literal সেই type নেয় যেটা জায়গাটা চায়। জায়গাটা যদি `decimal` চায়, literal-টা
`decimal` হয়। জায়গাটা যদি `float` চায়, তাহলে `float`।

```beans
let p: decimal = 19.99
let f: f64 = 19.99
```

এখানে কোনো numeric suffix নেই। কখনো `19.99f` বা `5i32` লেখা হয় না।

কোনো জায়গা যখন কোনো type চায় না:

- দশমিক ছাড়া পূর্ণসংখ্যা literal হয় `int`,
- দশমিক বিন্দু আছে এমন literal হয় `f64`।

integer literal-কে জায়গার চাওয়া type-এ ধরে যেতে হবে। না ধরলে checker সেটা বাতিল
করে দেয়।

## literal লেখা

পড়তে সুবিধার জন্য number literal-এ `_` separator হিসেবে ব্যবহার করা যায়। hex বা
binary-তেও লেখা যায়:

```beans
let big: int = 1_000_000
let mask: int = 0xFF
let bits: int = 0b1010
```

## নিজে থেকে কোনো conversion হয় না

Beans কখনো নিজে থেকে এক number type থেকে আরেকটায় convert করে না। `as`
operator দিয়ে চাইতে হবে:

```beans
let price: decimal = 4.50
let qty: int = 3
let total: decimal = price * (qty as decimal)
```

`as` নিয়ে আরও দেখতে [operators](/bn/guide/operators/) পড়ুন।

## Integer arithmetic আর wrapping

নির্দিষ্ট চওড়ার integer তার চওড়ায় wrap করে। এটা `+ - *`, unary `-`, আর bit
operation-এর বেলায় খাটে। যেমন `u8`-এর সবচেয়ে ওপরের মান পেরিয়ে যোগ করলে সেটা
আবার নিচ থেকে ঘুরে আসে।

- Shift count-কে `width - 1` দিয়ে mask করা হয়। একটা 32-bit value-কে 32 দিয়ে shift
  করা আর 0 দিয়ে shift করা একই।
- শূন্য দিয়ে ভাগ বা modulo করলে panic হয়।

## Integer cast

`as` দিয়ে যখন এক integer type থেকে আরেকটায় cast করা হয়:

- result সেই low bit গুলো রাখে যেগুলো target-এর চওড়ায় ধরে।
- signed value চওড়া করলে sign-extend হয় (sign রাখে)।
- unsigned value চওড়া করলে zero-extend হয় (শূন্য দিয়ে ভরে)।

## Float-এর নিয়ম

- `f32` একটা আসল 32-bit value। প্রতিটা literal, cast, আর arithmetic operation-এর
  পরে এটা round হয়।
- Float comparison IEEE-754 মেনে চলে। `NaN` থাকলে `==`, `<`, `<=`, `>`, আর `>=`
  সব `false` দেয়, আর `!=` দেয় `true`।
- `NaN` বা infinity-কে `decimal`-এ cast করলে `"decimal overflow"` বলে panic হয়।

## decimal

`decimal` হলো base-10 নিখুঁত সংখ্যা। binary float-এ যে rounding error হয়, এতে
সেটা হয় না:

```beans
let sum: decimal = 0.1 + 0.2
// sum == 0.3 is always true
```

যেসব জায়গায় binary-float-এর rounding error হলে ভুল হবে — যেমন টাকা-পয়সা —
সেখানে এটা মানানসই। তবে একটা `decimal` value নিজের সাথে কোনো currency বা scale
বহন করে না, তাই এটা নিজে থেকে round করতে পারে না। নির্দিষ্ট সংখ্যক ঘর লাগলে নিজে
`round` call করতে হয়, আর কাজের জন্য যে mode ঠিক সেটা বেছে নিতে হয়।

`1.0` contract 38টা significant digit রাখে। এর বেশি গেলে `"decimal overflow"` বলে
panic হয়। ভাগ করলে 38টা পর্যন্ত significant digit আসে, আর শেষ digit-টা half-even
নিয়মে round হয়।

### decimal-এর method

`round(places, mode = RoundingMode.half_even)` একটা নির্দিষ্ট সংখ্যক দশমিক ঘরে
round করে। mode দেওয়া বাধ্যতামূলক না, না দিলে half-even ধরা হয়।

```beans
let x: decimal = 2.675
let y: decimal = x.round(2, RoundingMode.half_even)
```

`RoundingMode`-এ ঠিক পাঁচটা selector আছে, আর কোনটা লাগবে সেটা নিয়মের ওপর
নির্ভর করে, value-এর ওপর না:

- `RoundingMode.half_even`: অর্ধেকটাকে সবচেয়ে কাছের জোড় digit-এ round করে
- `RoundingMode.half_away`: অর্ধেকটাকে শূন্য থেকে দূরে round করে
- `RoundingMode.toward_zero`: বাড়তি digit গুলো ফেলে দেয়
- `RoundingMode.floor`: negative infinity-র দিকে round করে
- `RoundingMode.ceil`: positive infinity-র দিকে round করে

`abs()` value-টাকে তার sign ছাড়া ফেরত দেয়।

## text থেকে parse করা

একটা `string`-কে number-এ বদলানো যায়। প্রতিটা `Result` return করে, কারণ text-টা
হয়তো ঠিক number নয়:

```beans
let n: Result<int> = "42".to_int()
let f: Result<float> = "3.14".to_float()
let d: Result<decimal> = "19.99".to_decimal()
```

এগুলো আর বাকি string method দেখতে [string](/bn/reference/builtins/string/) পড়ুন, আর
`Result` কীভাবে সামলাতে হয় সেটার জন্য
[Option, Result, আর Error](/bn/reference/builtins/option-result/) দেখুন।

## আরও দেখুন

- [Primitive type](/bn/reference/builtins/primitives/)
- [operators](/bn/guide/operators/), যার মধ্যে `as`-ও আছে।
