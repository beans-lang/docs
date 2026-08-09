---
title: Interfaces and inheritance
description: Single class inheritance, multiple interfaces, default methods, super, override, and the as? downcast.
---

A class has **one** base class and may implement **many** interfaces.
Interfaces may extend other interfaces.

```beans
interface Shape {
    fn area() -> f64

    // default method bodies are allowed (this kills most need for abstract classes)
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
    // overriding a real method requires the keyword — typo protection
    override fn describe() -> string {
        return "A CIRCLE. AREA {self.area()}."
    }
}
```

- `extends` takes one class base; `implements` takes comma-separated interfaces.
- Interface requirements and default methods are instance methods. Static
  interface methods are not supported.
- `override` is required to override a real method. A typo that does not match a
  parent method is an error, not a silent new method.
- There is no `abstract` or `final` yet.
- A `pub interface` exposes its whole method set — an interface is its method
  set.

## super

`super.init(...)` chains construction. The order is Swift's — own fields first,
then the parent, then the fully-built object:

```beans
class Dog extends Animal {
    breed: string
    fn init(breed: string, name: string) {
        self.breed = breed        // 1. this class's own fields
        super.init(name)          // 2. the parent's constructor, exactly once
        self.bark()               // 3. everything is assigned — anything goes
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

`as?` checks a reference's real type and returns an `Option` — it never crashes:

```beans
let s: Shape = pick_a_shape()
match s as? Circle {
    some(c) => io.println("circle, r = {c.r}"),
    none    => io.println("something else"),
}
```

Plain `as` is for explicit numeric casts and upcasts only.

## Next

- [Enums](/guide/enums/)
- [Generics](/guide/generics/)
- [Pattern matching](/guide/pattern-matching/)

Source: [`spec/SYNTAX.md`](https://github.com/beans-lang/beans/blob/main/spec/SYNTAX.md).
