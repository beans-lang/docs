---
title: std.dylib
description: চলন্ত অবস্থায় একটা shared library খোলা, তাতে symbol খুঁজে বের করা, আর unsafe দিয়ে সেগুলো call করা।
---

<!-- coverage:summary -->
**API সারমর্ম** (Beans source থেকে `npm run coverage` দিয়ে বানানো): 2টা type · 1টা constructor · 1টা static method · 4টা instance method · 3টা public field।
<!-- coverage:summary:end -->

`std.dylib` program চলার সময়ে একটা dynamic library (একটা `.so`, `.dylib`, বা `.dll`) খোলে আর তাতে symbol খোঁজে। এটা `std.dl`-এর উপর বসানো। source দেখুন এখানে:
[`stdlib/std/dylib/dylib.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/dylib/dylib.b)।

```beans
import std.dylib
```

Library সবসময় `RTLD_LOCAL` দিয়ে খোলা হয়, তাই তাদের symbol global namespace-এ ফাঁস হয় না।

একটা symbol খুঁজে পেলে তার address পাওয়া যায়। ওটা call করতে হলে [`unsafe`](/bn/guide/unsafe/) লাগবে, আর `std.dl` দিয়ে যেতে হবে। call function-গুলো হলো `dl.call0` থেকে `dl.call3` (0 থেকে 3টা argument)। প্রতিটা argument আর result একটা করে machine word, তাই এভাবে শুধু integer আর pointer-ই চলে। float, ছোট integer, আর by-value struct-এর জন্য বরং একটা ঠিকঠাক `extern "C"` declaration লাগবে, দেখুন [FFI guide](/bn/guide/ffi/)।

## Symbol

একটা resolve হওয়া symbol: তার address, আর যে নাম দিয়ে ওটা খোঁজা হয়েছিল। একে ধরে রাখা নিরাপদ; call করা নিরাপদ না।

```beans
pub class Symbol
new Symbol(address: int, name: string)

pub address: int
pub name: string

pub fn is_null() -> bool
```

- address 0 হলে `is_null` true। একটা symbol সত্যিকারের অর্থেই address 0-তে থাকতে পারে, তাই এটা error check না, নেহাত একটা সুবিধা। আসল failure `Dylib.find` এমনিতেই একটা `err` হিসেবে জানায়।

## Dylib

একটা খোলা shared library। এটা একটা `unique class`: move-only, আর drop হলে নিজেই বন্ধ হয়ে যায়।

```beans
pub unique class Dylib
pub path: string

pub static fn open(path: string) -> Result<Dylib>

pub fn find(name: string) -> Result<Symbol>
pub fn has(name: string) -> bool
pub fn close() -> Result<bool>
```

- `open` path দিয়ে একটা library খোলে। fail করলে `not_found` kind দেয়, সাথে loader-এর নিজের message, যেটা আসল সমস্যাটা missing dependency হলে সেটার নাম বলে দেয়।
- `find` একটা symbol খোঁজে; symbol না থাকলে `not_found` kind। `has` জানায় একটা symbol আছে কি না, তার না-থাকাকে error না ধরেই — একটা optional entry point পরখ করার জন্য এটা কাজের।
- `close` library বন্ধ করে। **এটা থেকে পাওয়া প্রতিটা address invalid হয়ে যায়**, আর তার পরে একটা call করা undefined। ইতিমধ্যে বন্ধ হওয়া library-তে `find`, `has`, বা `close` করলে `closed` kind ফেরত (`has` `false` ফেরত দেয়)।

```beans
import std.io
import std.dylib

fn main() {
    let lib: dylib.Dylib = dylib.Dylib.open("libm.so.6").expect("open")
    if lib.has("cos") {
        let sym: dylib.Symbol = lib.find("cos").expect("find")
        io.println("cos at {sym.address}")
        // calling it needs unsafe + std.dl, and cos takes a float,
        // so it really needs an extern "C" declaration.
    }
}
```

## আরও দেখুন

- [Unsafe guide](/bn/guide/unsafe/), `unsafe` কী কী করতে দেয়।
- [FFI guide](/bn/guide/ffi/), float আর struct সহ C call করার নিরাপদ, typed উপায়।
