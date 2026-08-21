---
title: Local packages and imports
description: এক folder মানে এক package, sub-package আর import path কীভাবে resolve হয়, আর single-file mode।
---

নিজের বেশিরভাগ কোড থাকে **local package**-এ, module রুটের নিচে। নিয়মগুলো ছোট আর
এক রকম। এই resolve করার কাজটা হয়
[`src/module.b`](https://github.com/beans-lang/beans/blob/main/src/module.b)-তে।

## এক directory, এক package

একটা directory-ই একটা package। ওই directory-র প্রতিটা `.b` ফাইল একই
`package` clause লেখে, আর সেটা লেখা হয় `snake_case`-এ:

```beans
package money
```

একই package-এর ফাইলগুলো একে অপরকে import করে **না**। তারা এমনিতেই একটা
namespace শেয়ার করে। import করা হয় শুধু *অন্য* একটা package-এ পৌঁছাতে।

## Sub-package

Sub-package হলো module রুটের নিচের subdirectory। একটা `shop/money/` directory
হয়ে যায় `shop.money` import path:

<!-- beans:fragment -->
```beans
import shop.money

fn main() {
    let m: Money = money.zero()
}
```

দুইটা জিনিস খেয়াল করুন:

- package-টা ব্যবহার করা হয় তার **declare করা** package name দিয়ে (`money`), path-এর
  শেষ অংশ দিয়ে নয়। সাধারণত দুইটা মিলে যায়, কিন্তু মিলতেই হবে এমন নয়।
- `as` দিয়ে একটা ফাইলের জন্য binding-এর নাম পাল্টানো যায়:

  ```beans
  import shop.money as cash
  ```

## একটা import path কীভাবে resolve হয়

`import X` লেখা হলে, Beans `X`-এর গড়ন দেখে ঠিক করে সেটা কী:

| `X`-এর গড়ন | যেটাতে resolve হয় |
| --- | --- |
| `std.*` | ship করা standard library। |
| `<module_name>` বা `<module_name>.<...>` | module রুটের নিচের একটা local package। |
| `host/owner/repo[/sub...]` (প্রথম অংশে একটা `.` আছে, তিন বা তার বেশি অংশ) | cache-এ clone করা একটা [Git dependency](/bn/pot/dependencies/)। |
| এর বাইরে যা কিছু | error। |

কোনো import যদি এই গড়নগুলোর একটার সাথেও না মেলে, Beans সেটাকে unknown package
বলে ধরে, আর কী কী আশা করেছিল সেটা লিস্ট করে দেয়: `std.*`, `<module>.*`, বা একটা
git host path।

## পরিচয় মানে গোটা path-টাই

একটা package-এর পরিচয় হলো তার **পুরো import path**, তার declare করা নাম নয়।
দুইটা package নিজেদের একই নামে ডাকতে পারে, যতক্ষণ তাদের import path আলাদা।
যেমন `shop.a.cart` আর `shop.b.cart` — দুইটাই `package cart` ব্যবহার করতে পারে,
তাও তারা আলাদা package থেকে যায়।

Import cycle মানা হয় না। package গুলো যদি একে অপরকে লুপ বেঁধে import করে, Beans
পুরো import-এর chain-টা ছাপিয়ে দেয়, যাতে cycle-টা দেখা যায়।

## এক package থেকে আরেক package-এ পৌঁছানো

আরেকটা package থেকে ওই import করা package-এর `pub` মার্ক করা যেকোনো কিছুতে
পৌঁছানো যায়: function আর type। একটা class-এ `new` ব্যবহার করতে হলে class আর তার
`init` — দুইটাই `pub` হতে হবে। একটা সাধারণ `fn init` তার নিজের package-এর ভেতর
সব জায়গায় ব্যবহারযোগ্য থাকে।

<!-- beans:fragment -->
```beans
import shop.util

fn main() {
    util.some_fn()
    let u: util.User = new util.User("ada")
    let name: string = u.name
}
```

## Single-file mode

একটা একলা ফাইলের **উপরে যদি কোনো `beans.pot` না থাকে**, তখন সেটা single-file
mode-এ থাকে। তখনও `std.*` আর Git dependency import করা যায়, কিন্তু local
package ব্যবহার করা যায় না — কারণ ওগুলো ঝোলানোর মতো কোনো module রুটই নেই।

[imports guide](/bn/guide/imports/)-এ রোজকার কোডে import নিয়ে বলা আছে, আর
[একটা local-package project](/bn/examples/shop/) পুরো একটা উদাহরণ ধরে ধরে দেখায়।
