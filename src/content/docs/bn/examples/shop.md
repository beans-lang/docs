---
title: A local-package project
description: examples/shop ঘুরে দেখা — package পেরিয়ে interface আর generic সহ একটা তিন-package-এর Beans project।
---

[`examples/shop/`](https://github.com/beans-lang/beans/tree/main/examples/shop)
হলো একটা পুরো multi-package project। একটা single ফাইল পেরিয়ে গেলে এটাই পড়ার মতো
উদাহরণ। এটা দেখায় একটা `beans.pot` manifest, তিনটা package, `pub` visibility, আর
package-এর সীমানা পেরিয়ে একটা interface আর একটা generic ব্যবহার করা।

এটা তার main ফাইল থেকে চালান:

```bash
beansc run examples/shop/main.b
```

## গড়নটা

```text
shop/
  beans.pot          module shop
  main.b             package main
  helpers.b          package main   (same package as main.b)
  money/
    money.b          package money
  util/
    util.b           package util
```

নিয়মটা হলো এক folder, এক package। `main.b` আর `helpers.b` দুইটাই `package main`,
কারণ ওরা একই folder-এ বসে আছে, তাই import ছাড়াই একে অন্যের নাম দেখতে পায়। `money/`
আর `util/` হলো sub-folder, তাই ওরা আলাদা package — import হয় `shop.money` আর
`shop.util` হিসেবে।

## manifest

[`shop/beans.pot`](https://github.com/beans-lang/beans/blob/main/examples/shop/beans.pot)
মাত্র এক লাইন:

```beans-pot
module shop
```

একটা local project-এর এটুকুই লাগে: একটা নাম। module-টা হলো `shop`, তাই ওর
sub-package-গুলো import path পায় `shop.money` আর `shop.util`।

## money package

[`shop/money/money.b`](https://github.com/beans-lang/beans/blob/main/examples/shop/money/money.b)
`package money` ঘোষণা করে আর exact decimal money-র হিসাব খুলে দেয়:

```beans
package money

pub class Money {
    pub amount: decimal
    pub currency: string = "USD"

    pub fn init(amount: decimal) {
        self.amount = amount
    }

    pub fn add(other: Money) -> Money {
        let result: Money = new Money(self.amount + other.amount)
        result.currency = self.currency
        return result
    }

    pub fn show() -> string {
        return "{self.currency} {self.amount}"
    }
}

pub enum Payment {
    cash
    card(number: string)
}

pub fn total(xs: List<Money>) -> Money {
    var sum: decimal = 0.00
    for m: Money in xs {
        sum = sum + m.amount
    }
    return new Money(sum)
}
```

অন্য package-এর জন্য যা যা রাখা, সব `pub` দিয়ে চিহ্নিত: class-টা, তার field, তার
method, enum, আর `total` function। `pub` না থাকলে এগুলো `money`-র ভেতরেই private
থাকত, বাইরে থেকে চোখেই পড়ত না। খেয়াল করুন — `Money` `decimal` ব্যবহার করে, তাই হিসাবটা exact।

## util package

[`shop/util/util.b`](https://github.com/beans-lang/beans/blob/main/examples/shop/util/util.b)
`package util` ঘোষণা করে আর কিছু shared helper রাখে:

```beans
package util
import std.io

pub interface Device {
    fn label() -> string

    // default method: runs for any Device, even ones from other packages
    fn describe() -> string {
        return "device: {self.label()}"
    }
}

pub class Logger {
    pub prefix: string = "[shop]"

    pub fn log(msg: string) {
        io.println("{self.prefix} {msg}")
    }
}

pub fn largest<T implements Order>(xs: List<T>) -> Option<T> {
    return xs.max()
}

pub fn tau() -> f64 {
    return 6.2831853
}

pub enum Level {
    low
    high
}

// private: visible inside util only; importing packages can't call it
fn hidden() -> int {
    return 42
}
```

এখানে দুইটা জিনিস দেখার আছে:

- `Device` হলো একটা `pub interface`, সাথে একটা **default method** `describe()`।
  `Device` implement করা যেকোনো type এটা পায়, এমনকি অন্য package-এ বানানো type-ও।
- `largest<T implements Order>` হলো একটা bound সহ `pub` generic function: এটা এমন
  যেকোনো `T` নেয় যেটা built-in `Order` interface implement করে, তাই এটা `.max()`
  call করতে পারে।
- `hidden()`-এ কোনো `pub` নেই, তাই এটা `util`-এর ভেতরেই private। import করা
  package এটা call করতে পারবে না।

## main package

[`shop/main.b`](https://github.com/beans-lang/beans/blob/main/examples/shop/main.b)
সব একসাথে বেঁধে দেয়:

```beans
package main

import std.io
import shop.money
import shop.util as u

// implementing an interface from another package
class Till implements u.Device {
    id: int = 7
    fn label() -> string {
        return "till-{self.id}"
    }
}

fn imported_label<T implements u.Device>(value: T) -> string {
    return value.label()
}
```

- `import shop.money` money package-টা নিয়ে আসে; এটা `money.Money` হিসেবে ব্যবহার
  করা হয়।
- `import shop.util as u` এটাকে একটা **local alias** `u` দেয়, যেটা শুধু এই ফাইলেই
  বাঁচে, তাই লেখা হয় `u.Device`, `u.Logger`, `u.largest`।
- `Till implements u.Device`: এখানকার একটা class অন্য package-এর একটা interface
  implement করে। এটা শুধু `label()` define করে; `describe()`-টা সে interface-এর
  default method থেকেই পেয়ে যায়।
- `imported_label<T implements u.Device>` হলো একটা generic function, যার bound
  আরেক package-এর একটা interface। bound-টা alias দিয়ে লেখা হয়েছে, `u.Device`।

body-টা এই সবই ব্যবহার করে:

```beans
let till: Till = new Till()
io.println(till.describe())           // the inherited default method
io.println(imported_label(till))       // generic bound satisfied by Till
let d: u.Device = till                 // upcast to the interface
io.println("as a device: {d.label()}")

let xs: List<int> = [3, 9, 4]
match u.largest(xs) {
    some(n) => io.println("largest {n}"),
    none => io.println("empty"),
}
```

## দ্বিতীয় main ফাইল

[`shop/helpers.b`](https://github.com/beans-lang/beans/blob/main/examples/shop/helpers.b)
-ও `package main`:

```beans
// same package as main.b, so no import is needed between files of one package
package main

import std.io
import shop.money

fn banner(title: string) {
    io.println("== {title} ==")
}

class Cart {
    items: List<money.Money> = []

    fn add(m: money.Money) {
        self.items.push(m)
    }

    fn total() -> money.Money {
        return money.total(self.items)
    }
}
```

`main.b` কিছু import না করেই `banner(...)` call করে আর `Cart` ব্যবহার করে, কারণ
ওরা একই package-এ। কিন্তু `helpers.b` তবুও তার নিজের `import shop.money` লেখে,
কারণ import হয় per file: প্রতিটা ফাইল নিজে যেই package ব্যবহার করে সেটার নাম বলে দেয়।

[একটা project বানানো আর চালানো](/bn/start/projects/)-তে project-এর গড়নের নিয়ম আছে।
[একে POT কেন বলে](/bn/pot/why-pot/)-তে module path, import path আর package name
বোঝানো আছে, আর [Local package আর import](/bn/pot/local-packages/)-এ import path
কীভাবে resolve হয় সেটা আছে। [Generic](/bn/guide/generics/) আর
[Interface আর inheritance](/bn/guide/interfaces/)-এ এখানে ব্যবহার হওয়া feature-গুলো
বর্ণনা করা আছে।
