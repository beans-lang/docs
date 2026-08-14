---
title: 'Imports and packages'
description: 'Beans-এ import কীভাবে কাজ করে, আর আলাদা চারটা ধারণা: module path, import path, package name, আর import binding।'
---

Beans-এ একটাই `import` keyword। এটা dot path দিয়ে standard library-তে পৌঁছায়,
module path দিয়ে local package-এ, আর সরাসরি Git host থেকে remote library টেনে আনে।

```beans
import std.io
import std.thread
import shop.util                     // <root>/util/*.b, used as util.thing
import shop.money.fx                 // nested: <root>/money/fx/
import github.com/acme/http          // cloned on first build
import gitlab.com/tools/csv as csvlib
```

## আলাদা চারটা ধারণা

এই চারটা আলাদা রাখলে অনেক সুবিধা:

| ধারণা | উদাহরণ | এটা যা বোঝায় |
|---|---|---|
| module path | `shop` | `beans.pot` unit: এক dependency, এক lock row |
| import path | `shop.money` | একটা package-এর globally unique পরিচয় |
| package name | `money` | package নিজেকে তার `package` clause-এ যে নামে ডাকে |
| import binding | `import shop.money as cash`-এর `cash` | একটা name, শুধু এক ফাইলে |

package-এ পৌঁছাতে যা লেখা হয়, সেটাই **binding**। default-এ এটা হয়
package-এর declare করা name (path-এর শেষ segment না)। ওই directory যদি
`package transport` লিখে থাকে, তাহলে `import shop.transport_v2` binds হয়
`transport`। বদলাতে চাইলে `as` দিয়ে override করা যায়।

## import করা name ব্যবহার করা

import করা package-এর যা কিছু `pub` marked, সেটায় পৌঁছাতে binding দিয়ে qualify
করা হয়:

```beans
util.some_fn()
let u: util.User = new util.User("jul")
util.color.red
```

একটা `pub interface`-এর method-গুলো তার সাথেই চলে; একটা interface বলতে তার
method-এর সেটকেই বোঝায়। একটা সাধারণ `fn init(...)` class-এর নিজের package-এর যেকোনো ফাইল
থেকে ব্যবহার করা যায়। `pub fn init(...)` তখনই লাগে যখন অন্য package `new Conn(...)`
লিখবে; আর তখন class-টা নিজেও `pub` হতে হবে।

## binding প্রতি-ফাইলে আলাদা

একটা import শুধু সেই ফাইলের, যে ফাইল সেটা লিখেছে। এক package-এর দুটো ফাইল একই alias
দিয়ে আলাদা package বোঝাতে পারে, আর এক ফাইলের import তার পাশের ফাইলে কিছুই qualify
করে না। এক ফাইলে একই local name-এর দুটো import করলে error; `as` দিয়ে আলাদা করা হয়।

## package-এর পরিচয়

একটা package-এর পরিচয় হলো তার পুরো import path। দুটো package দিব্যি একই declared
name শেয়ার করতে পারে, আর দুটো path শেষ segment শেয়ার করতে পারে। `a/cart` আর
`b/cart` — দুটোই নিজেকে `cart` বলে; import-গুলোকে আলাদা local name দিলে দুটোই
কাজ করবে:

```beans
import shop.a.cart as retail
import shop.b.cart as wholesale

let a: retail.Cart = new retail.Cart()
let b: wholesale.Cart = new wholesale.Cart()
```

এরা সব জায়গায় আলাদা থাকে: আলাদা type, আলাদা private method, আলাদা generated
symbol।

## কোনো cycle নেই

package-গুলো একটা directed graph বানায়। কোনো package নিজেকে import করলে, বা কয়েকটা
package মিলে একটা cycle বানালে, পুরো chain দেখিয়ে সেটা reject করা হয়:

```text
package import cycle:
  shop.a imports shop.b at a/a.b:3
  shop.b imports shop.c at b/b.b:2
  shop.c imports shop.a at c/c.b:4
```

এক package-এর ফাইলগুলো নিজেদের মধ্যে কোনো edge বানায় না, তাই এক package-এর ভেতর
mutually recursive function দিব্যি চলে। একটা diamond acyclic, আর তার shared
dependency একবারই লোড হয়।

## import কোথায় resolve হয়

- `std.*` resolve হয় shipped standard library-তে।
- `<module>` বা `<module>.<...>` resolve হয় module root-এর নিচের একটা local
  package-এ।
- `host/owner/repo[/sub...]` (প্রথম segment-এ একটা `.` আছে, অন্তত তিনটা segment)
  resolve হয় একটা Git dependency-তে, যেটা first build-এ clone আর cache হয়ে যায়।

ফাইলের উপরে কোনো `beans.pot` না থাকলে সেটা single-file mode-এ থাকে: `std.*`
আর Git import তখনও কাজ করে, কিন্তু local package কাজ করে না। manifest, dependency
resolution, আর lock file নিয়ে বিস্তারিত আছে
[POT package management](/bn/pot/why-pot/)-এ।
