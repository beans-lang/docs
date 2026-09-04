---
title: Interfaces, abstract classes, and inheritance
description: Single class inheritance, multiple interfaces, abstract methods, override rules, super, and the as? downcast.
---

A class has **one** base class and may implement **many** interfaces.
Interfaces may extend other interfaces.

**Only a class does either.** An interface value is dispatched by reading a
descriptor out of the object's first word, and only a class has one, so a
[struct](/guide/structs/) or an [enum](/guide/enums/) naming `extends` or
`implements` is refused at the declaration.

```beans
interface Shape {
    fn area() -> f64

    // an interface method may carry a default body
    fn describe() -> string {
        return "shape with area {self.area()}"
    }
}

interface NamedShape extends Shape {
    fn name() -> string
}

abstract class Drawable {
    abstract fn draw()

    fn visible() -> bool {
        return true
    }
}

class Circle extends Drawable implements NamedShape {
    r: f64

    fn init(r: f64) {
        self.r = r
    }

    override fn draw() {}

    // First body for an interface requirement: no override.
    fn area() -> f64 {
        return 3.14159265 * self.r * self.r
    }

    fn name() -> string {
        return "circle"
    }

    // Replacing an interface default body needs override.
    override fn describe() -> string {
        return "{self.name()} with area {self.area()}"
    }
}
```

- `extends` takes one class base; `implements` takes comma-separated interfaces.
- Interface requirements and default methods are instance methods. Static
  interface methods are not supported.
- An `abstract class` may mix bodyless `abstract fn` declarations with normal
  methods. It cannot be constructed with `new`.
- A concrete subclass must implement every inherited abstract method and every
  bodyless interface requirement.
- A `pub interface` exposes its whole method set to other packages.
- Interfaces cannot declare `priv` methods. Private class methods do not
  implement interface requirements or replace inherited methods.
- Beans has no `final` yet.

## When to write `override`

`override` means “replace a method that already has a slot in a base contract.”
The rule depends on where the method came from:

| Inherited method | Write `override`? |
| --- | --- |
| concrete base-class method | yes |
| abstract base-class method | yes |
| interface method with a default body | yes |
| bodyless interface requirement, first implementation | optional |

Using `override` when no base method or interface requirement matches is an
error. Leaving it out when it is required is also an error. This catches
method-name typos in both paths.

`priv` means a fresh method owned by one exact class or struct, not an override
slot. For that reason `priv abstract fn` and `priv override fn` are errors.

An abstract declaration has no body and may appear only inside an
`abstract class`:

```beans
abstract class Job {
    abstract fn run() -> int
}

class BuildJob extends Job {
    override fn run() -> int {
        return 1
    }
}
```

## super

`super.init(...)` chains construction. The order is fixed: own fields first,
then the parent's constructor, then the fully-built object:

```beans
class Dog extends Animal {
    breed: string
    fn init(breed: string, name: string) {
        self.breed = breed        // 1. this class's own fields
        super.init(name)          // 2. the parent's constructor, exactly once
        self.bark()               // 3. everything is assigned, anything goes
    }
}
```

- Before `super.init`, the parent's fields do not exist yet (not even defaulted
  ones). Assigning one is an error; `super.init` owns them.
- `super.init` runs exactly once, as a top-level statement, only inside `init`,
  and is mandatory whenever a class above declares an `init`. A `return` before
  it is an error.
- `super.method(...)` calls the nearest parent implementation directly, skipping
  virtual dispatch. It is valid only in an instance method.

A subclass whose added fields all have defaults inherits the nearest ancestor
initializer. A subclass that adds a required field must declare its own `init`.

## Downcast with `as?`

`as?` checks a reference's real type and returns an `Option`. It never crashes:

```beans
let s: Shape = pick_a_shape()
match s as? Circle {
    some(c) => io.println("circle, r = {c.r}"),
    none    => io.println("something else"),
}
```

Plain `as` is for explicit numeric casts and upcasts only.

## A complete example

A class implementing an interface, inheriting a default method:

```beans
import std.io

interface Greeter {
    fn who() -> string
    fn greet() -> string {
        return "hi from {self.who()}"
    }
}

class Robot implements Greeter {
    id: int
    fn init(id: int) {
        self.id = id
    }
    fn who() -> string {
        return "robot {self.id}"
    }
}

fn main() {
    let g: Greeter = new Robot(7)
    io.println(g.greet())
}
```
