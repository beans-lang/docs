---
title: Classes
description: Classes in Beans — fields, methods, statics, construction with new, and the init/deinit lifecycle.
---

A class is a reference type with fields and methods.

```beans
class User {
    name: string
    age: int = 0            // default value
    pub email: string       // fields are private to the package unless pub

    pub fn init(name: string) {
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

Anything that produces an object belongs on that object's class — as `new` or as
a named static (for fallible construction, like `File.open`). A module-level
function is only for work that yields no object.

## init: the constructor

`init` is the constructor body. `new Class(...)` allocates the object and runs
it. Like every method, `init` has an implicit `self`.

```beans
class Conn {
    host: string
    hits: int = 0

    pub fn init(host: string) {
        self.host = host
    }
}

let c: Conn = new Conn("db1")
```

- A class whose fields all have defaults gets an implicit zero-argument
  initializer. A class with any required field must declare `init`.
- Until every field is assigned, the `init` body is a straight-line prefix:
  each statement either assigns a field or reads a field already assigned — no
  method calls, no passing `self` on, no `return`, no string interpolation. The
  checker proves this, so a half-built object can never escape. After the last
  field is assigned, anything goes.
- `pub fn init` is what lets another package write `new Conn(...)`.
- Construction that can fail stays a named static returning a `Result`, such as
  `static fn open(...) -> Result<Conn>`, which may call `new Conn(...)` after
  validation.

## deinit: the destructor

`deinit` runs exactly once, on whichever thread drops the last reference, the
moment the count hits zero — and before the fields are released, so the body can
still read them. It is deterministic, like C++ or Swift: no GC pause.

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
- A subclass `deinit` runs first, then its parent's, automatically — no
  `override`.
- `self` must not escape a `deinit`.
- An object that dies inside a reference cycle does not get its `deinit` — break
  the cycle by hand (see [Memory and ownership](/guide/memory/)).

## Inheritance and interfaces

Classes take one base class with `extends` and implement interfaces with
`implements`. Construction chains through `super.init(...)`. That is covered in
[Interfaces and inheritance](/guide/interfaces/).

## Next

- [Interfaces and inheritance](/guide/interfaces/)
- [Structs and unions](/guide/structs/)
- [Memory and ownership](/guide/memory/)

Source: [`spec/SYNTAX.md`](https://github.com/beans-lang/beans/blob/main/spec/SYNTAX.md).
