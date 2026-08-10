---
title: A local-package project
description: A walk through examples/shop, a three-package Beans project with cross-package interfaces and generics.
---

[`examples/shop/`](https://github.com/beans-lang/beans/tree/main/examples/shop)
is a full multi-package project. It is the example to read once you have gone
past a single file. It shows a `beans.pot` manifest, three packages, `pub`
visibility, and using an interface and a generic across package lines.

Run it from its main file:

```bash
beansc run examples/shop/main.b
```

## The layout

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

The rule is one folder, one package. `main.b` and `helpers.b` are both
`package main` because they sit in the same folder, so they see each other's
names with no import. `money/` and `util/` are sub-folders, so they are separate
packages imported as `shop.money` and `shop.util`.

## The manifest

[`shop/beans.pot`](https://github.com/beans-lang/beans/blob/main/examples/shop/beans.pot)
is one line:

```beans-pot
module shop
```

That is all a local project needs: a name. The module is `shop`, so its
sub-packages get the import paths `shop.money` and `shop.util`.

## The money package

[`shop/money/money.b`](https://github.com/beans-lang/beans/blob/main/examples/shop/money/money.b)
declares `package money` and exposes exact decimal money math:

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

Everything meant for other packages is marked `pub`: the class, its fields, its
methods, the enum, and the `total` function. Without `pub`, they would be
private to `money` and invisible outside it. Note `Money` uses `decimal` so the
arithmetic is exact.

## The util package

[`shop/util/util.b`](https://github.com/beans-lang/beans/blob/main/examples/shop/util/util.b)
declares `package util` and holds shared helpers:

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

Two things to see here:

- `Device` is a `pub interface` with a **default method** `describe()`. Any type
  implementing `Device` gets it, even a type defined in another package.
- `largest<T implements Order>` is a `pub` generic function with a bound: it
  accepts any `T` that implements the built-in `Order` interface, so it can call
  `.max()`.
- `hidden()` has no `pub`, so it is private to `util`. Importing packages cannot
  call it.

## The main package

[`shop/main.b`](https://github.com/beans-lang/beans/blob/main/examples/shop/main.b)
ties it together:

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

- `import shop.money` brings in the money package; you use it as `money.Money`.
- `import shop.util as u` gives it a **local alias** `u`, alive in this file
  only, so you write `u.Device`, `u.Logger`, `u.largest`.
- `Till implements u.Device`: a class here implements an interface from another
  package. It only defines `label()`; it inherits `describe()` from the
  interface's default method.
- `imported_label<T implements u.Device>` is a generic function whose bound is an
  interface from another package. The bound is written with the alias, `u.Device`.

The body uses all of it:

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

## The second main file

[`shop/helpers.b`](https://github.com/beans-lang/beans/blob/main/examples/shop/helpers.b)
is also `package main`:

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

`main.b` calls `banner(...)` and uses `Cart` without importing anything, because
they are in the same package. But `helpers.b` still writes its own
`import shop.money`, because imports are per file: each file names the packages
it uses.

[Create and run a project](/start/projects/) covers the project layout rules.
[Why it is called POT](/pot/why-pot/) explains module paths, import paths, and
package names, and [Local packages and imports](/pot/local-packages/) covers how
import paths resolve. [Generics](/guide/generics/) and
[Interfaces and inheritance](/guide/interfaces/) describe the features used here.
