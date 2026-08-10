---
title: Hello and the tour
description: A walk through examples/hello.b and the highlights of examples/tour.b, a one-file tour of the language.
---

Two examples are the best starting point:
[`hello.b`](https://github.com/beans-lang/beans/blob/main/examples/hello.b) is
the smallest complete program, and
[`tour.b`](https://github.com/beans-lang/beans/blob/main/examples/tour.b) packs
every core language idea into one file.

## hello.b

```beans
import std.io

fn main() {
    let name: string = "beans"
    io.println("hello from {name}")
}
```

- `import std.io` brings in the I/O package; `io.println` lives there.
- `fn main()` is the entry point.
- `let name: string = "beans"` declares a `let`, a value that will not change,
  with its type `string` written out. Beans does not infer types on `let`.
- `"hello from {name}"` interpolates: `{name}` becomes the value.

Run it:

```bash
beansc run examples/hello.b
```

## tour.b

`tour.b` is one file that touches every idea in the language. Below are the
parts worth reading, quoted from the real file.

### Interfaces with default methods

```beans
interface Shape {
    fn area() -> f64

    // default method body: implementers get this unless they override it
    fn describe() -> string {
        return "shape with area {self.area()}"
    }
}
```

An interface can carry a **default method body**. Any type implementing `Shape`
gets `describe()` unless it overrides it.

### Classes, inheritance, and override

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

`Circle` implements the interface. `LoudCircle` `extends` it and uses
`override` to replace `describe()`. The `init` method is the constructor.

### Enums built for match

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

Enum variants are `snake_case` and can carry payloads. `match` pulls the payload
apart. Note the match bindings (`n`, `iban`, `amt`) do not repeat their types;
the matched value pins them. That is the one place Beans infers a type.

### Result and Option

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

An operation that can fail returns `Result<T>` and you build it with `ok(...)`
or `err(...)`. The `?` after `s.to_int()` means "if this is an error, return it
from the whole function; otherwise unwrap the value." A value that might be
absent is `Option<T>`, built with `some(...)` or `none`.

### Generics

```beans
class Stack<T> {
    items: List<T> = []

    fn push(x: T) { self.items.push(x) }
    fn pop() -> Option<T> { return self.items.pop() }
}
```

Generics are monomorphized: the compiler makes a specialized copy per type, so
there is no run-time cost.

### Highlights from `main`

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

- Primitives are objects: `(-5).abs()` works.
- `decimal` is exact. `19.99 * 3` is `59.97`, not a float approximation.
- `qty as decimal` is an explicit conversion; Beans never converts number types
  for you.

```beans
// as?: checked downcast, returns Option
let first: Shape = new Circle(1.0)
match first as? LoudCircle {
    some(lc) => io.println("loud: {lc.describe()}"),
    none     => io.println("just a normal circle"),
}
```

`as?` is a checked downcast. It returns an `Option`, so a wrong guess is a
`none`, never a crash.

```beans
// if is an expression, one loop keyword
var i: int = 0
for i < 3 {
    let kind: string = if i % 2 == 0 { "even" } else { "odd" }
    io.println("{i} is {kind}")
    i += 1
}
```

`if` is an expression: it produces a value. And there is one loop keyword,
`for`, used for both a condition (`for i < 3`) and iteration.

Run the whole tour:

```bash
beansc run examples/tour.b
```

For the same ideas plus concurrency, read
[Threads and channels](/examples/threads/). The
[language guide](/guide/modules/) covers each of these features in full, and
[Option and Result](/guide/errors/) goes into the error model in depth.
