---
title: Create and run a project
description: একটা beans.pot manifest, একটা main package আর sub-package দিয়ে একটা Beans project সাজানো।
---

দ্রুত একটা test-এর জন্য একটা `.b` file-ই যথেষ্ট। কিন্তু সত্যিকারের program হলো একটা
**project** — একটা folder tree, যার root-এ একটা manifest। এই পেজে দেখানো হলো একটা project
কীভাবে সাজানো থাকে, আর সেটা কীভাবে চালানো হয়।

## একটা project কী

একটা module হলো এমন একটা directory tree, যার root-এ `beans.pot` নামে একটা file আছে। ওই
file-টাই manifest। এটা module-এর নাম দেয়। (POT নামটা একটা মজা করে রাখা; দেখুন
[কেন এর নাম POT](/bn/pot/why-pot/)।)

সবচেয়ে ছোট manifest-টা শুধু module-এর নামই দেয়:

```beans-pot
module shop
```

## main package

কোনো application-এর root package হলো `package main`, আর এতে একটা `fn main()` লাগে — অর্থাৎ
entry point। সবচেয়ে ছোট একটা project দেখতে এমন:

```text
myapp/
  beans.pot
  main.b
```

`beans.pot`:

```beans-pot
module myapp
```

`main.b`:

```beans
package main

import std.io

fn main() {
    io.println("hello from myapp")
}
```

## এক folder = এক package

নিয়মটা সোজা: **এক folder = এক package।** একটা folder-এর প্রতিটা `.b` file একই package
share করে। একই folder-এর file-গুলো একে অপরকে import করে না; ওরা এমনিতেই একে অপরের নাম
দেখতে পায়।

তাই `main`-কে কয়েকটা file-এ ভাগ করা যায়:

```text
myapp/
  beans.pot
  main.b       package main
  helpers.b    package main   (same package, no import needed)
```

## sub-folder = sub-package

একটা sub-folder আলাদা একটা package, যেটা import করা যায়। ধরা যাক, এমন একটা layout আছে:

```text
shop/
  beans.pot
  main.b
  money/
    money.b    package money
```

তাহলে `main.b` sub-package-টাকে তার path দিয়ে import করে, আর তার নাম দিয়ে ব্যবহার করে:

<!-- beans:fragment -->
```beans
package main

import shop.money

fn main() {
    let m: money.Money = new money.Money(19.99)
}
```

import path হলো `shop.money`। কোডের ভিতরে এটাকে `money.thing` হিসেবে ব্যবহার করা হয়,
কারণ package-টা তার `package` clause-এ নিজেকে `money` বলে ডাকে।

## একটা project চালানো

`beansc run`-কে সেই file-এ তাক করুন যেখানে `fn main()` আছে। সাথে দেওয়া multi-package
উদাহরণটার জন্য:

```bash
beansc run examples/shop/main.b
```

`beansc` ওই file-এর উপরের `beans.pot`-টা খুঁজে বের করে, module-এর প্রতিটা package resolve
করে, আর সেটা চালায়।

## Single-file mode

`beans.pot` না থাকলে একটা একলা `.b` file **single-file mode**-এ চলে। Standard library
import (`std.io`) আর Git import তখনও কাজ করে। Local package করে না, কারণ ওদের belong করার
মতো কোনো module নেই। যেই মুহূর্তে একটার বেশি package লাগবে, একটা `beans.pot` যোগ করুন।

manifest-এর প্রতিটা field জানতে দেখুন [beans.pot manifest](/bn/pot/manifest/)। শুরু থেকে শেষ
পর্যন্ত হেঁটে দেখানো একটা তিন-package project-এর জন্য দেখুন [shop উদাহরণ](/bn/examples/shop/)।
