---
title: Source files and modules
description: Beans-এর সোর্স ফাইল, package আর module কীভাবে একসাথে কাজ করে, আর ভাষার ছোট lexical নিয়মগুলো।
---

Beans-এর সোর্স ফাইলের শেষে থাকে `.b`। এই পেজে দেখব ফাইলগুলো কীভাবে package আর
module-এ ভাগ হয়, আর ভাষাটা যে অল্প কয়েকটা lexical নিয়ম অনুসরণ করে, সেগুলো কী কী।

## package clause

compiler যেসব `.b` ফাইলকে package হিসেবে লোড করে, তার প্রতিটার একদম শুরুতে একটা
`package` clause থাকে — যেকোনো import বা declaration-এর আগে:

```beans
package main

import std.io

fn main() {
    io.println("hi")
}
```

```beans
package money

pub class Money {
    // ...
}
```

নিয়মগুলো:

- ঠিক একটাই `package` clause, ফাইলের একদম উপরে।
- এক directory-র প্রতিটা ফাইল **একই** package name লিখবে।
- name হবে lowercase snake_case identifier।
- একটা application-এর root package হলো `main`, আর সেখানে `fn main()` থাকতেই হবে।
  library-র root-এ সাধারণ একটা name বসে, `main` লাগে না।
- যে ফাইলটার পাশে কোনো `beans.pot` নেই, সেই একা ফাইলটা clause বাদ দিতে পারে, নয়তো
  `package main` লিখতে পারে।

name-টা directory-র সাথে মিলতেই হবে এমন না। `shop/transport_v2/` ভেতরে
`package transport` লিখতে পারে; import path তখনও `shop.transport_v2` থাকে। একটা
package-এর name, তার import path, আর যে local binding দিয়ে সেটা ব্যবহার করা হয় — এই তিনটার
পার্থক্য দেখতে [Imports and packages](/bn/guide/imports/) পড়ুন।

## এক folder, এক package

এক directory-র প্রতিটা `.b` ফাইল একই package-এর অংশ। এক package-এর ফাইলগুলো সব
কিছু শেয়ার করে, নিজেদের মধ্যে **কোনো import লাগে না**। `a.b`-এর একটা function
সরাসরি `b.b`-এর function কল করতে পারে, যতক্ষণ দুটোই একই `package` লিখেছে।

<!-- beans:fragment -->
```beans
// file: shop/main.b
package main
fn main() { greet() }
```

```beans
// file: shop/helpers.b
package main
fn greet() { io.println("hi") }   // visible to main.b, no import needed
```

এক package-এ একটা declaration name একবারই দাবি করা যায়, যে ফাইলই লিখুক না কেন।
এক package-এ `Cart` নামে দুটো class থাকলে duplicate error।

## Modules

**module** হলো একটা directory tree, যার root-এ একটা `beans.pot` ফাইল আছে। ওই
ফাইলটা module-টার নাম দেয়, আর তার dependency-গুলো লিস্ট করে:

```beans-pot
module shop
kind application
```

`kind` হয় `application` (default), নয়তো `library`। application হলো একটা program
হিসেবে build বা run হয়, আর তার `fn main()` লাগে। library-র কোনো `main` নেই — লিখলে
সেটা reject করে দেয় — আর `pub` দিয়ে তার API বাইরে খোলে।

module root-এর নিচের subdirectory-গুলো sub-package। `shop/money/` import হয়
`import shop.money` দিয়ে। পুরো নিয়ম দেখতে [The beans.pot manifest](/bn/pot/manifest/)
আর [Local packages and imports](/bn/pot/local-packages/) পড়ুন।

## Visibility: default-এ package-private

class, interface, enum, function, method, আর field — সব default-এ
**package-private**, যতক্ষণ না `pub` লাগানো হয়। একটা name তার package-এর বাইরে খোলার
একমাত্র উপায় হলো `pub`। package-private-র অর্থ একই import path, শুধু source-এ একই
package name না লেখা।

field আর method-এর জন্য আরও একটা কড়া অপশন আছে: `priv` দিলে member-টা শুধু যে class
বা struct সেটা declare করেছে, তার ভেতরেই দেখা যায়। একই package-এর কোনো peer type,
subclass, বা free function সেই member-এ হাত দিতে পারে না।

```beans
package money

pub class Money {       // usable from other packages
    pub amount: decimal // public field
    currency: string    // visible inside package money
    priv checksum: int  // visible only inside Money

    priv fn valid_checksum() -> bool { return self.checksum >= 0 }
}

fn round_rule() {}      // package-private helper
```

## Lexical নিয়ম

- **কোনো semicolon নেই।** একটা newline statement শেষ করে (তবে শুধু এমন একটা
  token-এর পরে যেটা statement শেষ করতে পারে)। এই কারণেই `} else {` একই লাইনে
  বসতে হয়।
- **Method chain একাধিক লাইনে ভাঙা যায়।** chain ভাঙা যায় লাইন-শেষের `.`-এর
  পরে (একটা dot কখনও statement শেষ করতে পারে না), কিংবা লাইন-শুরুর
  `.name`-এর আগে (পরের লাইন member access দিয়ে শুরু হলে newline আর
  terminator নয়)। `..` range operator-ই থেকে যায়, সে কখনও লাইন continue করে
  না।

  ```beans
  let total: int = View.make("root")
      .pad(2)
      .child(View.make("leaf"))
      .depth()
  ```
- **Comment:** এক লাইনের জন্য `//`, একটা block-এর জন্য `/* ... */` (block-গুলো
  nest হতে পারে)।
- **condition-এর চারপাশে parenthesis নেই:** `if x > 3 { }`। brace সবসময় লাগবে।
- **Number literal**-এ `_` separator (`1_000_000`), hex (`0xFF`), আর binary
  (`0b1010`) ব্যবহার করা যায়।
- **String** হলো `"..."` — immutable, UTF-8, আর `{}` দিয়ে interpolation হয়।
  string-এ কোনো `+` নেই। দেখুন [String](/bn/reference/builtins/string/)।

## Keyword

```text
class struct union interface enum fn let var pub priv override
if else for in match return break continue move inout
import as defer unsafe extern new extends implements static
self true false unique abstract singleton
```

`some`, `none`, `ok`, আর `err` সাধারণ prelude name, keyword না। `super` হলো
contextual। `priv`, `abstract`, `singleton`, আর `package`-ও
contextual। এরা নিজেদের বিশেষ অর্থ নেয় শুধু ঠিক field, class, function, বা package
position-এ; বাকি জায়গায় এগুলো সাধারণ identifier হিসেবেই ব্যবহার করা যায়।
