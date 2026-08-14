---
title: std.fmt
description: সংখ্যাকে string বানানো — hex, binary, digit গ্রুপিং, padding, fixed decimal, আর নিখুঁত decimal ফরম্যাটিং।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 7 package functions.
<!-- coverage:summary:end -->

`std.fmt` সংখ্যাকে ঠিক সেই চেহারায় টেক্সটে বদলে দেয় যেগুলো প্রায়ই দরকার হয়:
hexadecimal, binary, গ্রুপ করা digit, প্যাড করা কলাম, আর fixed decimal জায়গা।
তিনটা function Beans দিয়ে লেখা
[`stdlib/std/fmt/fmt.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/fmt/fmt.b)-তে;
বাকি চারটা native আর কম্পাইলারে typed, তাই এদের parameter positional আর এদের কোনো
নাম নেই।

```beans
import std.fmt
```

## Base conversion (Beans সোর্স)

```beans
pub fn hex(value: int) -> string
pub fn binary(value: int) -> string
pub fn group_digits(value: int, separator: string) -> string
```

- `hex` 64-bit প্যাটার্নের lowercase hex দেয়, কোনো `0x` prefix ছাড়া, আর শূন্যের
  জন্য `"0"`। এটা raw u64 bit প্যাটার্নের উপর কাজ করে, তাই একটা negative int তার
  two's complement রূপ দেখায়।
- `binary` value-এর base-2 টেক্সট দেয়।
- `group_digits` ডান দিক থেকে প্রতি তিন digit পর `separator` বসায়, আর negative
  সংখ্যার জন্য সামনের `-` রেখে দেয়।

<!-- beans:compile -->
```beans
import std.io
import std.fmt

fn main() {
    io.println(fmt.hex(255))                        // ff
    io.println(fmt.binary(6))                       // 110
    io.println(fmt.group_digits(1234567, ","))     // 1,234,567
    io.println(fmt.group_digits(-1000, ","))       // -1,000
}
```

## Padding (native)

```beans
pad_left(string, int) -> string
pad_right(string, int) -> string
```

দ্বিতীয় argument হলো target width। `pad_left(s, width)` `s`-এর বাঁ দিকে স্পেস দিয়ে
প্যাড করে; `pad_right(s, width)` ডান দিকে প্যাড করে। Padding হয় byte width অনুযায়ী।
ইনপুট যদি আগে থেকেই অন্তত `width` byte চওড়া হয়, তাহলে সেটা অপরিবর্তিত ফেরত আসে।
বিশাল কোনো `width` দিলে panic হয়।

<!-- beans:compile -->
```beans
import std.io
import std.fmt

fn main() {
    io.println(fmt.pad_left("7", 4))    // "   7"
    io.println(fmt.pad_right("7", 4))   // "7   "
}
```

## Decimal (native)

```beans
float(float, int) -> string
decimal(decimal, int) -> string
```

দ্বিতীয় argument হলো কয় ঘর decimal, 0 থেকে 100 পর্যন্ত। `float` একটা fixed
সংখ্যক decimal ঘর দেয়। `decimal` নিখুঁত: value-তে যত ঘর আছে তার চেয়ে কম দেখাতে হলে
এটা round half-even করে (banker's rounding); বেশি দরকার হলে শূন্য দিয়ে প্যাড করে।
যেমন `fmt.decimal(19.995, 2)` হলো `"20.00"`।

<!-- beans:compile -->
```beans
import std.io
import std.fmt

fn main() {
    io.println(fmt.float(3.14159, 2))     // 3.14
    io.println(fmt.decimal(19.995, 2))    // 20.00
}
```

`decimal` type-টা নিয়ে জানতে দেখুন [Numbers and decimal](/bn/reference/builtins/numbers/)।

## Interpolation-এ format spec

String interpolation একই width আর precision spec বোঝে, তাই অনেক সময় এই
function-গুলো কল করতেই হয় না। `"{ ... }"`-এর ভেতরে:

| Spec | অর্থ |
| --- | --- |
| `{x:8}` | `x`-কে 8 চওড়া field-এ ডানে align করা হয় |
| `{x:-8}` | `x`-কে 8 চওড়া field-এ বাঁয়ে align করা হয় |
| `{pi:.2}` | দুই ঘর decimal |
| `{pi:8.2}` | width 8 আর দুই ঘর decimal |

এগুলো ঠিক উপরের `pad_left` / `pad_right` আর `float`-এর মতোই render হয়।

<!-- beans:compile -->
```beans
import std.io

fn main() {
    let pi: float = 3.14159
    io.println("[{pi:8.2}]")   // [    3.14]
}
```
