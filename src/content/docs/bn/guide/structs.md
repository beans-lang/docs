---
title: 'Structs and unions'
description: 'Beans-এ inline value type: generic struct, method, mutation, extern "C" record, আর struct class থেকে কীভাবে আলাদা।'
---

একটা `struct` হলো একটা **inline value type**। এটা value ধরে copy হয়, আর একটা
সাদামাটা aggregate হিসেবে pass আর return হয় — কোনো reference-count header নেই, কোনো
heap allocation নেই।

```beans
struct Point<T> {
    value: T
    moves: int = 0

    priv inout fn add_move() {
        self.moves += 1
    }

    fn current() -> T {
        return self.value
    }

    inout fn moved() {
        self.add_move()
    }
}

var p: Point<int> = Point { value: 3 }
p.moved()
```

- struct named field literal ব্যবহার করে (`Point { x: 3, y: 4 }`), class-এর মতো
  না — class শুধু `new` দিয়ে construct হয়।
- marker ছাড়া field তার package-এ দেখা যায়। `pub` সেটা সব package-এর জন্য খোলে।
  `priv` সেটাকে শুধু declare করা struct-এর ভেতর সীমিত রাখে, একই package-এও।
- একটা field শুধু একটা `var` local-এর মধ্য দিয়েই বদলানো যায়।
- একটা সাধারণ method পায় read-only `self`। field বদলাতে হলে method-টাকে `inout fn`
  mark করা হয়; সেটা একটা `var` local-এ কল করা হয়।
- `priv` সাধারণ, static, আর `inout` method-এ কাজ করে। এটা method-কে ঠিক declare করা
  struct-এর ভেতরের code-এ সীমিত রাখে, একই package-এর peer-দের বিরুদ্ধেও।
- একটা static method-এর কোনো `self` নেই, আর এটা একটা named factory হিসেবে ব্যবহার
  করা যায়।
- একটা generic struct প্রতিটা concrete type-এর জন্য আলাদা inline layout পায়।
- একটা সাধারণ struct ARC value-র মালিক হতে পারে (string, class, collection, Option
  আর Result, অন্য struct), আর compiler ওই field-গুলো copy, array, আর storage-এর
  মধ্য দিয়ে recursively retain আর drop করে।
- সরাসরি recursive value edge reject করা হয় (এর কোনো finite size নেই); ওই edge-এর
  জন্য `RawPtr` বা `Box` ব্যবহার করা হয়।
- যে সাধারণ struct `Eq` আর `Hash` মেনে চলে, সেটা একটা `Map` key হতে পারে।

## extern "C" struct

`extern "C" struct` field-এর order fix করে দেয়, আর target-এর C size আর alignment
নিয়ম ব্যবহার করে, তাই layout একটা C `struct`-এর সাথে হুবহু মেলে। এতে করে native
memory-র ওপর একটা `RawPtr` বা `Slice` দিয়ে পড়া-লেখা করাটা নিরাপদ হয়।

```beans
extern "C" struct Packet {
    tag: u8
    count: u32
    ratio: f32
}
```

একটা `extern "C"` struct শুধু inline scalar, `RawPtr`, fixed array, আর nested
C-layout struct-এই সীমাবদ্ধ, তাই এর C ABI-তে কোনো লুকানো ownership থাকে না। এই
record-গুলো একটা `extern "C"` boundary জুড়ে value ধরে pass আর return করা যায়।

শুধু `extern "C"` record-এর জন্য দুটো contextual modifier আছে:

- `packed` field-গুলোর মধ্যেকার সব padding সরিয়ে দেয়।
- `align(N)` একটা record-এর, বা একটা field-এর, alignment `N`-এ (দুইয়ের power)
  তুলে দেয়।

```beans
pub extern "C" packed struct Header { kind: u8  length: u32  checksum: u32 }
extern "C" align(64) struct Counter { hits: u32 }
extern "C" struct Slot { tag: u8  align(16) payload: u64 }
```

হুবহু নিয়মগুলো দেখুন [Attributes and modifiers](/bn/guide/attributes/)-এ।

## extern "C" union

`extern "C" union` overlapping storage declare করে। এটা ঠিক একটা named field দিয়ে
initialize করতে হবে, আর initialization, read, আর write-এর জন্য `unsafe` লাগে, কারণ
কোন member এখন active সেটা Beans track করে না:

```beans
extern "C" union Word {
    bits: u32
    number: f32
}
```

সব field offset শূন্যে শুরু হয়, C size আর alignment নিয়ে। union value inline ভাবে
copy, pass, return, আর `RawPtr`-এর মধ্য দিয়ে round-trip করে।

## opaque struct

`extern "C" opaque struct Handle` একটা incomplete C type declare করে। এটা শুধু
`RawPtr`-এর পেছনেই valid; allocation, field access, embedding, আর layout query
reject করা হয়। যে C type-এর layout কখনও দেখা যায় না, সেটা bind করার উপায়ই এটা।

## struct বনাম class

| | `struct` | `class` |
|---|---|---|
| identity | value (copy হয়) | reference (share হয়) |
| allocation | inline, header নেই | heap, 16-byte ARC header |
| construction | field literal | `new Class(...)` |
| method | read-only, `inout`, আর static | instance আর static |
| inheritance | নেই | একটা base class, অনেক interface |
| C layout | `extern "C"` দিয়ে | কখনও না |

পুরো value copy করাটাই যখন আসল উদ্দেশ্য, তখন struct ব্যবহার করা হয়। যখন object-দের
shared identity, inheritance, বা reference-counted lifetime লাগে, তখন class।

## Method আর mutation

একটা সাধারণ struct method `self` পড়তে পারে, কিন্তু বদলাতে পারে না। একটা `inout fn`
method field বদলাতে পারে, আর এটা একটা mutable local-এ কল করতে হবে:

```beans
struct Point {
    x: int
    y: int

    fn total() -> int {
        return self.sum()
    }

    priv fn sum() -> int {
        return self.x + self.y
    }

    inout fn translate(dx: int, dy: int) {
        self.move_by(dx, dy)
    }

    priv inout fn move_by(dx: int, dy: int) {
        self.x += dx
        self.y += dy
    }

    static fn origin() -> Point {
        return Point { x: 0, y: 0 }
    }
}

var point: Point = Point.origin()
point.translate(3, 4)
```

`translate`-কে একটা `let`-এ, একটা temporary field literal-এ, বা একটা non-local
value-তে কল করা error। struct field literal ব্যবহার করে, তাই এদের `init` বা
`deinit` নেই।

## Generic struct

type parameter struct-এ ঠিক তেমনই কাজ করে যেমন class আর function-এ করে:

```beans
struct Cell<T> {
    value: T
    previous: Option<T> = none

    fn current() -> T {
        return self.value
    }
}

let number: Cell<int> = Cell { value: 7 }
let word: Cell<string> = Cell { value: "beans" }
```

declare করা type-টাই field literal-এর type argument জোগায়। `Cell<int>` আর
`Cell<string>`-এর আলাদা compiled layout আর আলাদা method copy থাকে।

## একটা পুরো উদাহরণ

```beans
import std.io

struct Point {
    x: int
    y: int

    fn total() -> int {
        return self.x + self.y
    }

    inout fn shift(dx: int) {
        self.x += dx
    }
}

fn main() {
    var point: Point = Point { x: 3, y: 4 }
    io.println("{point.x},{point.y}: {point.total()}")
    point.shift(10)
    io.println("{point.x},{point.y}: {point.total()}")
}
```

value-টা তখনও inline-ই থাকে। `inout fn` ওই local value-টাকে জায়গায় বসেই বদলায়;
একটা সাধারণ pass বা return এখনও সেটা copy করে।
