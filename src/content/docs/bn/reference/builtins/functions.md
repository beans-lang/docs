---
title: Prelude functions
description: Beans যে free function গুলো সব জায়গায় দেয় — panic, size_of, আর কীভাবে print করা হয়।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 8 package functions.
<!-- coverage:summary:end -->

**Prelude** হলো সেই নাম গুলোর সেট যেগুলো প্রতিটা file-এ কোনো import ছাড়াই পাওয়া
যায়। builtin type গুলো ছাড়াও এটা কয়েকটা free function দেয়। এই পেজে সেগুলো
নিয়ে বলা হলো। printing function গুলো `io` module-এ থাকে, সেগুলোর জন্য নিচের নোট আর
[standard library reference](/bn/reference/stdlib/) দেখুন।

## panic

`panic(message: string)` এমন একটা error-এর জন্য program থামিয়ে দেয় যেটা থেকে আর
ফেরা যায় না। এটা call কোথায় হলো সেটা আর message-টা জানায়, status 3 নিয়ে বেরিয়ে
যায়, আর কখনো return করে না। এটা defer **চালায় না**।

```beans
panic("index out of range")
```

`panic` শুধু সেই bug-এর জন্য ব্যবহার করা হয় যেগুলো কখনোই হওয়ার কথা না। যেসব error
সামলানো যায়, সেগুলোর জন্য বরং [`Option` আর `Result`](/bn/reference/builtins/option-result/)
ব্যবহার করা হয়।

## Compile-time layout function

এই তিনটা যে target-এর জন্য build করা হচ্ছে তার একটা compile-time constant দেয়।
এরা একটা **type** নেয়, কোনো value না, আর নির্বাচিত target-এ সেই type-এর layout
দেয়।

| Function | দেয় | অর্থ |
| --- | --- | --- |
| `size_of(Type)` | `int` | `Type`-এর একটা value কত byte নেয় |
| `align_of(Type)` | `int` | `Type`-এর alignment |
| `offset_of(Type, field)` | `int` | `Type`-এর ভেতরে `field`-এর byte offset |

```beans
let s: int = size_of(i32)
let a: int = align_of(f64)
let o: int = offset_of(Point, x)
```

নিয়ম:

- এরা একটা type নেয় একটা contextual রূপে, কোনো runtime value না।
- type parameter-এর ওপর, আর `Option`, `Result`, ও user enum-এর ওপর এদের বাতিল করা
  হয়, কারণ ওগুলোর কোনো একক layout নেই।
- `offset_of`-এর একটা struct বা union type আর একটা আসল field-এর নাম লাগে।

build-time-এ জানা constant নিয়ে আরও দেখতে [compile-time](/bn/guide/compile-time/) পড়ুন।

## Printing

Printing করা হয় `io` module দিয়ে, তাই সেটা import করে `io.println` call করা হয়:

```beans
import std.io

fn main() {
    io.println("hello")
}
```

চারটা printing function হলো:

- `io.println`: standard output-এ একটা লাইন print করে
- `io.print`: newline ছাড়া print করে
- `io.eprintln`: standard error-এ একটা লাইন print করে
- `io.eprint`: newline ছাড়া standard error-এ print করে

কী কী print করা যায়:

- number, bool, আর string
- enum, যেগুলো `variant` বা `variant(payload)` হিসেবে দেখায়
- print করা যায় এমন জিনিসের list, যেগুলো `[a, b, c]` হিসেবে দেখায়

কী কী সরাসরি print করা যায় না:

- `Map` value আর class instance print হয় না; এদের জন্য নিজে একটা string রূপ
  বানিয়ে দিতে হয়।
- `Result` print করা যায় না; এর বদলে `match` করতে হয়।

## আরও দেখুন

- [Option, Result, আর Error](/bn/reference/builtins/option-result/), error handling-এর সাথে `panic`।
- [Compile-time](/bn/guide/compile-time/), build-time constant।
- [standard library reference](/bn/reference/stdlib/), `io` module আর বাকি `std.*` function গুলো।
