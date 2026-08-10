---
title: Classes
description: Classes in Beans, covering fields, methods, statics, construction with new, and the init/deinit lifecycle.
---

A class is a reference type with fields and methods.

```beans
class User {
    name: string
    age: int = 0            // default value
    pub email: string       // fields are private to the package unless pub

    fn init(name: string) {
        self.name = name
    }

    fn greet() -> string {
        return "hi {self.name}"
    }

    static fn guest() -> User {
        return new User("guest")
    }
}

let u: User = new User("jul")
```

- Methods are instance methods by default. Their `self` is implicit and
  available in the body; it is never written in the parameter list.
- `static fn` declares a class static. A static has no `self` and is not
  inherited.
- **`new Class(...)` is the only way to construct a class.** It always runs the
  class's `init`. Class field literals and plain `Class(...)` calls are errors.
- Fields are private to the package unless marked `pub`.

Anything that produces an object belongs on that object's class, as `new` or as
a named static (for fallible construction, like `File.open`). A module-level
function is only for work that yields no object.

## init: the constructor

`init` is the constructor body. `new Class(...)` allocates the object and runs
it. Like every method, `init` has an implicit `self`.

```beans
class Conn {
    host: string
    hits: int = 0

    fn init(host: string) {
        self.host = host
    }
}

let c: Conn = new Conn("db1")
```

- A class whose fields all have defaults gets an implicit zero-argument
  initializer. A class with any required field must declare `init`.
- Until every field is assigned, the `init` body is a straight-line prefix:
  each statement either assigns a field or reads a field already assigned. No
  method calls, no passing `self` on, no `return`, and no string interpolation.
  The checker proves this, so a half-built object can never escape. After the
  last field is assigned, anything goes.
- A plain `fn init` is package-private. Any file in the same package can write
  `new Conn(...)`.
- Use `pub fn init` only when another package must construct the class. The
  class itself must be `pub` too.
- Construction that can fail stays a named static returning a `Result`, such as
  `static fn open(...) -> Result<Conn>`, which may call `new Conn(...)` after
  validation.

## deinit: the destructor

`deinit` runs exactly once, on whichever thread drops the last reference, the
moment the count hits zero, and before the fields are released, so the body can
still read them. Destruction is deterministic: it happens at that point, not at
some later garbage-collector pause.

```beans
class Conn {
    host: string
    pub fn init(host: string) { self.host = host }
    fn deinit() {
        io.println("closing {self.host}")
    }
}
```

- No parameters, no return value, never called by hand.
- A subclass `deinit` runs first, then its parent's, automatically, with no
  `override`.
- `self` must not escape a `deinit`.
- An object that dies inside a reference cycle does not get its `deinit`. Break
  the cycle by hand (see [Memory and ownership](/guide/memory/)).

## Inheritance and interfaces

Classes take one base class with `extends` and implement interfaces with
`implements`. Construction chains through `super.init(...)`. That is covered in
[Interfaces and inheritance](/guide/interfaces/).

## A complete example

```beans
import std.io

class Account {
    owner: string
    balance: decimal = 0.0

    fn init(owner: string) {
        self.owner = owner
    }

    fn deposit(amount: decimal) {
        self.balance = self.balance + amount
    }

    fn summary() -> string {
        return "{self.owner}: {self.balance}"
    }

    static fn empty(owner: string) -> Account {
        return new Account(owner)
    }
}

fn main() {
    let a: Account = Account.empty("jul")
    a.deposit(19.99)
    io.println(a.summary())
}
```
