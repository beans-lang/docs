---
title: Interfaces and inheritance
description: Single class inheritance, multiple interfaces, default methods, super, override, and the as? downcast.
---

A class has **one** base class and may implement **many** interfaces.
Interfaces may extend other interfaces.

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

class Circle implements Shape {
    r: f64

    fn area() -> f64 {
        return 3.14159265 * self.r * self.r
    }
}

class LoudCircle extends Circle implements NamedShape {
    // override is required to override an existing method
    override fn describe() -> string {
        return "A CIRCLE. AREA {self.area()}."
    }
}
```

- `extends` takes one class base; `implements` takes comma-separated interfaces.
- Interface requirements and default methods are instance methods. Static
  interface methods are not supported.
- `override` is required to override an existing method. A name marked
  `override` that matches no parent method is a compile error, which catches
  typos in method names.
- There is no `abstract` or `final` yet.
- A `pub interface` exposes its whole method set to other packages.

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
