---
title: Hello and the tour
description: examples/hello.b আর examples/tour.b-এর একটা ঘুরে দেখা — tour.b হলো এক ফাইলে পুরো ভাষার ট্যুর।
---

শুরু করার জন্য সবচেয়ে ভালো দুইটা উদাহরণ:
[`hello.b`](https://github.com/beans-lang/beans/blob/main/examples/hello.b) হলো
সবচেয়ে ছোট একটা পুরো প্রোগ্রাম, আর
[`tour.b`](https://github.com/beans-lang/beans/blob/main/examples/tour.b) এক
ফাইলেই ভাষার সব মূল আইডিয়া ঠেসে ঢুকিয়ে দিয়েছে।

## hello.b

```beans
import std.io

fn main() {
    let name: string = "beans"
    io.println("hello from {name}")
}
```

- `import std.io` I/O package টা নিয়ে আসে; `io.println` ওখানেই থাকে।
- `fn main()` হলো প্রোগ্রামের শুরুর জায়গা।
- `let name: string = "beans"` একটা `let` তৈরি করে — এমন একটা value যেটা আর
  বদলাবে না, আর তার type `string` লিখে দেওয়া। `let`-এ Beans নিজে থেকে type ধরে নেয় না।
- `"hello from {name}"` হলো interpolation: `{name}` জায়গায় ওর value বসে যায়।

চালান:

```bash
beansc run examples/hello.b
```

## tour.b

`tour.b` এক ফাইলেই ভাষার সব আইডিয়া ছুঁয়ে যায়। নিচে এর যেই অংশগুলো পড়ে দেখা দরকার
সেগুলো দেওয়া হলো, আসল ফাইল থেকেই তুলে আনা।

### Default method সহ interface

```beans
interface Shape {
    fn area() -> f64

    // default method body: implementers get this unless they override it
    fn describe() -> string {
        return "shape with area {self.area()}"
    }
}
```

একটা interface একটা **default method body** বহন করতে পারে। `Shape` implement করা
যেকোনো type নিজে override না করলে এই `describe()` টা এমনিতেই পেয়ে যায়।

### Class, inheritance আর override

```beans
class Circle implements Shape {
    r: f64

    fn init(r: f64) {
        self.r = r
    }

    fn area() -> f64 {
        return 3.14159265 * self.r * self.r
    }
}

class LoudCircle extends Circle {
    override fn describe() -> string {
        return "A CIRCLE. AREA {self.area()}."
    }
}
```

`Circle` interface-টা implement করে। `LoudCircle` ওটাকে `extends` করে, আর
`override` দিয়ে `describe()`-টা বদলে দেয়। `init` method-টাই হলো constructor।

### match-এর জন্য বানানো enum

```beans
enum Payment {
    cash
    card(number: string)
    transfer(iban: string, amount: decimal)
}

fn describe_payment(p: Payment) -> string {
    return match p {
        cash => "paid cash",
        card(n) => "card ending {n.last(4)}",
        transfer(iban, amt) => "sent {amt} to {iban}",
    }
}
```

enum-এর variant-গুলো `snake_case`-এ থাকে, আর payload বহন করতে পারে। `match` সেই
payload-টা খুলে আলাদা করে দেয়। খেয়াল করুন — match-এর binding-গুলো (`n`, `iban`,
`amt`) তাদের type আর লিখতে হয় না; যেই value-টা match হচ্ছে সেটাই এদের type ঠিক
করে দেয়। Beans একমাত্র এই জায়গায়ই নিজে থেকে type ধরে নেয়।

### Result আর Option

```beans
fn parse_age(s: string) -> Result<int> {
    let n: int = s.to_int()?     // err? pass it up. ok? unwrap.
    if n < 0 {
        return err("negative age")
    }
    return ok(n)
}

fn find(users: List<User>, name: string) -> Option<User> {
    for u: User in users {
        if u.name == name {
            return some(u)
        }
    }
    return none
}
```

যেই কাজ fail করতে পারে সেটা `Result<T>` ফেরত দেয়, আর সেটা তৈরি করা হয় `ok(...)`
কিংবা `err(...)` দিয়ে। `s.to_int()`-এর পরের `?`-এর কাজ হলো — error হলে পুরো
function থেকেই সেটা ফেরত দেয়; না হলে value-টা বের করে আনে। আবার যেই value হয়তো
আছে, হয়তো নেই — সেটা হলো `Option<T>`, তৈরি হয় `some(...)` বা `none` দিয়ে।

### Generic

```beans
class Stack<T> {
    items: List<T> = []

    fn push(x: T) { self.items.push(x) }
    fn pop() -> Option<T> { return self.items.pop() }
}
```

Generic-গুলো monomorphize হয়: compiler প্রতিটা type-এর জন্য আলাদা একটা বিশেষ কপি
তৈরি করে, তাই run-time-এ কোনো বাড়তি খরচ নেই।

### `main`-এর কিছু হাইলাইট

```beans
// everything is an object
io.println((-5).abs())           // 5
io.println("42".to_int().or(0))  // 42

// decimal: exact base-10 arithmetic
let price: decimal = 19.99
let qty: int = 3
let total: decimal = price * (qty as decimal)
io.println("total: {total}")     // total: 59.97, exactly
```

- সবকিছুই object: `(-5).abs()` কাজ করে।
- `decimal` একদম exact। `19.99 * 3` হয় ঠিক `59.97`, কোনো float-এর কাছাকাছি
  আন্দাজ না।
- `qty as decimal` হলো একটা explicit conversion; Beans নিজে থেকে number type
  কখনোই বদলে দেয় না।

```beans
// as?: checked downcast, returns Option
let first: Shape = new Circle(1.0)
match first as? LoudCircle {
    some(lc) => io.println("loud: {lc.describe()}"),
    none     => io.println("just a normal circle"),
}
```

`as?` হলো একটা checked downcast। এটা একটা `Option` ফেরত দেয়, তাই আন্দাজ ভুল হলে
সেটা হয় একটা `none` — crash কখনো না।

```beans
// if is an expression, one loop keyword
var i: int = 0
for i < 3 {
    let kind: string = if i % 2 == 0 { "even" } else { "odd" }
    io.println("{i} is {kind}")
    i += 1
}
```

`if` একটা expression: এটা একটা value দেয়। আর loop-এর keyword মোটে একটাই — `for`।
condition-এর জন্যও (`for i < 3`) ওটাই, iteration-এর জন্যও ওটাই।

পুরো ট্যুরটা চালান:

```bash
beansc run examples/tour.b
```

একই আইডিয়াগুলো concurrency-সহ দেখতে চাইলে পড়ুন
[Thread আর channel](/bn/examples/threads/)। [language guide](/bn/guide/modules/)-এ এই
প্রতিটা feature পুরোপুরি আছে, আর [Option আর Result](/bn/guide/errors/)-এ error
model-টা আরও গভীরে বোঝানো আছে।
