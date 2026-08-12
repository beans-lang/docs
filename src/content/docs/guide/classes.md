---
title: Classes
description: Classes in Beans, including private methods and fields, static state, singleton classes, construction, and the init/deinit lifecycle.
---

A class is a reference type with fields and methods.

```beans
class User {
    static created: int = 0
    name: string
    age: int = 0              // visible inside this package
    pub email: string = ""    // visible in every package
    priv token: string        // visible only inside User

    fn init(name: string, token: string) {
        self.name = name
        self.token = token
        User.created += 1
    }

    fn greet() -> string {
        return self.private_greeting()
    }

    priv fn private_greeting() -> string {
        return "hi {self.name}"
    }

    static fn guest() -> User {
        return new User("guest", "")
    }
}

let u: User = new User("jul", "secret")
```

- Methods are instance methods by default. Their `self` is implicit and
  available in the body; it is never written in the parameter list.
- `static fn` declares a class method. It has no `self` and is not inherited.
- A normal class is constructed with `new Class(...)`. It always runs `init`.
  Class field literals and plain `Class(...)` calls are errors.
- An unmarked field is visible in its package. `pub` opens it to every package.
  `priv` limits it to the class that declares it.

Anything that produces an object belongs on that object's class, as `new` or as
a named static (for fallible construction, like `File.open`). A module-level
function is only for work that yields no object.

## Field visibility

Beans has three field visibility levels:

| Form | Can access the field |
| --- | --- |
| `value: int` | code in the same package |
| `pub value: int` | code in any package |
| `priv value: int` | only the class or struct that declares it |

`priv` stays strict even in the same package. A peer class, subclass, or free
function cannot read or write the field. There is no `protected` level.

## Method visibility

Methods use the same three levels:

| Form | Can call the method |
| --- | --- |
| `fn read()` | code in the same package |
| `pub fn read()` | code in any package |
| `priv fn read()` | only the class or struct that declares it |

`priv` works on instance, static, and `inout` struct methods. A private method
is not inherited and cannot be `abstract` or `override`. A subclass may declare
a new method with the same name, but it does not replace the parent's private
method.

## Static fields

A static field belongs to the class, not to each object. Read and write it
through the class name:

```beans
class Request {
    static next_id: int = 1
    priv static secret: int = 40

    priv static fn secret_value() -> int {
        return Request.secret
    }

    static fn take_id() -> int {
        let id: int = Request.next_id
        Request.next_id += 1
        return id
    }

    static fn reveal() -> int {
        return Request.secret_value()
    }
}
```

Static fields are initialized once, in declaration order, before `main` runs.
They need an initializer and are not inherited. A generic class cannot declare
a static field; each type argument would otherwise make ownership unclear.

## Singleton classes

`singleton class` creates one eager instance. Access it as `Type.instance`:

```beans
singleton class Registry {
    priv count: int = 0

    fn next() -> int {
        self.count += 1
        return self.count
    }
}

let first: int = Registry.instance.next()
let second: int = Registry.instance.next()
```

The instance is created once before `main`, after static fields are initialized.
Every `.instance` access returns that same object. `new Registry()` is an error.
A singleton must have a zero-argument initializer and cannot declare `deinit`.
It also cannot be generic, `abstract`, `unique`, or extended.

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
- Use `priv fn init` when callers must go through a static factory. Even a peer
  class or subclass in the same package cannot call that constructor.
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
