---
title: Functions and closures
description: Function declare করা, explicit-return নিয়ম, আর Beans-এ anonymous function (closure)।
---

একটা function declare হয় `fn` দিয়ে:

```beans
fn add(a: int, b: int) -> int {
    return a + b
}

pub fn log_line(msg: string) {      // no -> means no return value
    io.println(msg)
}
```

`->` দিয়ে return type বলা হয়। `->` না থাকলে function কিছু return করে না।
parameter-গুলো নিজেদের type বলে দেয়, ঠিক অন্য প্রতিটা binding-এর মতো।

## প্রতিটা path-কে return করতেই হবে

**কোনো implicit tail return নেই।** শেষের একটা expression অন্য যেকোনো statement-এর
মতোই একটা statement; তার value বাদ পড়ে যায়, return হয় না। যে function-এ `->` আছে,
তাকে প্রতিটা path-এ `return` করতে হবে:

```beans
fn wrong() -> int {
    var sum: int = 0
    if flag() { sum = 1 }
    sum                             // error: 'wrong' must return int
}
```

যে body return না করেই শেষ হয়ে যেতে পারে, checker সেটা reject করে। একটা path তখনই
returning ধরা হয় যখন সেটা শেষ হয় `return`-এ, এমন একটা `if`/`else`-এ যার দুই দিকই
return করে, এমন একটা statement `match`-এ যার সব arm return করে, বা `break` ছাড়া একটা
`for { }`-এ (যেটা কখনও শেষই হয় না)।

## Parameter mode

parameter default-এ **borrow** করে। ownership নিতে `move` যোগ করা হয়, নয়তো caller-এর
একটা mutable local alias করতে `inout`। নিয়মগুলো দেখুন
[Variables and constants](/bn/guide/variables/)-এ।

```beans
fn enqueue(move jobs: List<Job>) { /* ... */ }
fn bump(inout n: int) { n += 1 }
```

## Parameter-এর default value

শেষের দিকের (trailing) parameter-এ একটা constant default declare করা যায় — একটা
literal, negative করা numeric literal, বা `none`। call-এ শেষের argument-গুলো বাদ
দিলে declare করা constant-গুলোই বসে; checker প্রতিটা call site-এ সেগুলো ভরে দেয়,
তাই ABI বা function value-এর কিছুই বদলায় না।

<!-- beans:compile -->
```beans
package main

import std.io

fn greet(name: string, punct: string = "!", times: int = 1) -> string {
    var parts: List<string> = []
    for index: int in 0..times {
        parts.push("{name}{punct}")
    }
    return parts.join(" ")
}

fn main() {
    io.println(greet("hi"))          // hi!
    io.println(greet("yo", "?"))     // yo?
    io.println(greet("go", ".", 3))  // go. go. go.
}
```

একটা defaulted parameter-এর পরের প্রতিটা parameter-এও default লাগবে। default শুধু
by-value parameter-এ (`move` আর `inout`-এ হয় না), আর `extern "C"` signature-এ
কখনোই না। function-কে value হিসেবে ব্যবহার করলে তার পুরো arity-ই থাকে। Beans-এ
**named argument নেই** আর **overloading নেই** — এক নাম, এক signature; কোনো
argument-কে optional করার একমাত্র অনুমোদিত পথ হলো defaulted tail।

## Anonymous function (closure)

নাম ছাড়া `fn` হলো একটা closure। এটা তার চারপাশের variable-গুলো capture করে।
`fn(int) -> int` আবার একটা function value-এর *type*-ও।

```beans
let double: fn(int) -> int = fn(x: int) -> int { return x * 2 }
xs.map(fn(x: int) -> int { return x * 2 })
```

closure তার চারপাশের variable-গুলো একটা shared cell-এর reference দিয়ে capture করে,
তাই mutation আর escaping — দুটোই কাজ করে। একটা closure `inout` parameter capture
করতে পারে না, আর `move` বা `inout` parameter-ওয়ালা কোনো function-কে closure value
হিসেবে store করা যায় না (closure-এর *parameter* এখনও ownership mode বয়ে নেয় না)।

### Move দিয়ে capture

`fn(...) move(a, b)` তালিকার local-গুলোকে move করে capture করে: closure-টাই
তখন সেগুলোর owner, ঘিরে থাকা binding-গুলো খরচ হয়ে যায়, আর owned প্রতিটা
capture ঠিক একবারই release হয় — closure value-টা মরার সময়ে। move-only কোনো
value — একটা socket, একটা `Box`, একটা `List` — callback-এর ভেতরে বাঁচে আর
তার সাথেই বিদায় নেয়, এই পথেই।

<!-- beans:compile -->
```beans
package main

import std.io

fn make_counter() -> fn() -> int {
    var seen: List<int> = []
    return fn() move(seen) -> int {
        seen.push(1)
        return seen.len()
    }
}

fn main() {
    let tick: fn() -> int = make_counter()
    io.println("{tick()} {tick()}")   // 1 2
}
```

তালিকার প্রতিটা নাম ঘিরে থাকা এমন একটা local হতে হবে যেটা body সত্যিই ব্যবহার
করে। closure বানানোর পরে move হওয়া local-টা ব্যবহার করলে use-after-move
error। closure value কপি করলে একই closure আর তার capture-গুলোই share হয় — fn
value shared, তাই capture-এর একক ownership কখনও ভাঙে না।

## Method আর static

class-এর ভেতরে define করা function হলো method; `static fn` একটা class static
declare করে। এগুলো নিয়ে আছে [Classes](/bn/guide/classes/)-এ। module-level function সেই
কাজের জন্য যেটা কোনো object বানায় না, যেমন `io.println`, `os.args`, আর
`fmt.pad_left`। যা কিছু একটা object বানায়, সেটা ওই object-এর class-এ থাকে — `new`
হিসেবে বা একটা named static হিসেবে।

## একটা পুরো উদাহরণ

```beans
import std.io

fn add(a: int, b: int) -> int {
    return a + b
}

fn apply(f: fn(int) -> int, x: int) -> int {
    return f(x)
}

fn main() {
    let sum: int = add(2, 3)
    let square: fn(int) -> int = fn(n: int) -> int { return n * n }
    io.println("{sum} {apply(square, sum)}")
}
```
