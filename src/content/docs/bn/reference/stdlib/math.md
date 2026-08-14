---
title: std.math
description: ছোটখাটো integer helper, একটা value-কে একটা range-এর ভেতর ক্ল্যাম্প করা, আর greatest common divisor।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 2 package functions.
<!-- coverage:summary:end -->

`std.math` হলো Beans দিয়ে লেখা integer helper-এর একটা ছোট প্যাকেজ। সোর্স পড়ুন
[`stdlib/std/math/math.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/math/math.b)-তে।

```beans
import std.math
```

```beans
pub fn clamp(value: int, low: int, high: int) -> int
pub fn gcd(a: int, b: int) -> int
```

- `clamp` `value`-কে জোর করে `[low, high]` inclusive range-এর ভেতর নিয়ে আসে।
  `value` যদি `low`-এর নিচে হয় তাহলে `low` ফেরত দেয়, `high`-এর উপরে হলে `high`, আর
  নয়তো `value` নিজেই।
- `gcd` হলো greatest common divisor। এটা `a` আর `b`-এর absolute value-এর উপর
  Euclid-এর algorithm চালায়, তাই ইনপুটের চিহ্ন কোনো ব্যাপার না। `gcd(0, 0)` হলো
  `0`।

```beans
import std.io
import std.math

fn main() {
    io.println(math.clamp(15, 0, 10))   // 10
    io.println(math.clamp(-3, 0, 10))   // 0
    io.println(math.gcd(12, 18))        // 6
    io.println(math.gcd(0, 0))          // 0
}
```

## আরও দেখুন

- [Numbers and decimal](/bn/reference/builtins/numbers/) — integer আর float type আর
  তাদের নিজস্ব method।
