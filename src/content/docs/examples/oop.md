---
title: OOP classes and value types
description: A walk through strict private fields and methods, static state, abstract methods, singletons, generic structs, and mutating struct methods.
---

Two small programs show the full OOP update:

- [`oop_classes.b`](https://github.com/beans-lang/beans/blob/main/examples/oop_classes.b)
  covers class contracts and shared state.
- [`generic_structs.b`](https://github.com/beans-lang/beans/blob/main/examples/generic_structs.b)
  covers inline generic values and methods.

Run them from the Beans repository:

```bash
beansc run examples/oop_classes.b
beansc run examples/generic_structs.b
```

## Strict private methods and fields

The class example keeps each job ID inside its declaring class, while the
created count belongs to the class itself:

```beans
class BuildJob extends Job implements Named {
    static created: int = 0
    priv id: int

    priv static fn record_created() {
        BuildJob.created += 1
    }

    priv fn job_id() -> int {
        return self.id
    }

    fn init(id: int) {
        self.id = id
        BuildJob.record_created()
    }
}
```

The private field and both private methods cannot be accessed by a peer class,
subclass, or free function, even inside the same package. `BuildJob.created` is
initialized once and shared by all `BuildJob` objects.

## Abstract and interface methods

The abstract base owns a method slot without providing a body:

```beans
interface Named {
    fn name() -> string
}

abstract class Job {
    abstract fn run() -> int
}

class BuildJob extends Job implements Named {
    override fn run() -> int { return 1 }
    fn name() -> string { return "build" }
}
```

`run` needs `override` because it replaces an abstract base-class method.
`name` does not need it because this is the first body for a bodyless interface
requirement. Writing `override` there would also be valid.

## One eager singleton

The registry has one instance for the whole program:

```beans
singleton class Registry {
    priv completed: int = 0

    fn record() -> int {
        self.completed += 1
        return self.completed
    }
}

let first: int = Registry.instance.record()
let second: int = Registry.instance.record()
```

Both calls use the same object, so they return `1` and `2`. A singleton is
created before `main`; `new Registry()` is not allowed.

## Generic structs with methods

The struct example makes separate inline value layouts for `Tagged<int>` and
`Tagged<string>`:

```beans
struct Tagged<T> {
    value: T
    tag: int
    previous: Option<T> = none

    priv fn label_text() -> string {
        return "tag-{self.tag}"
    }

    fn label() -> string {
        return self.label_text()
    }

    priv inout fn set_tag(tag: int) {
        self.tag = tag
    }

    inout fn retag(tag: int) {
        self.set_tag(tag)
    }
}

var number: Tagged<int> = Tagged { value: 7, tag: 1 }
let word: Tagged<string> = Tagged { value: "beans", tag: 2 }
number.retag(9)
```

A normal struct method gets read-only `self`. `inout fn` gets mutable `self`,
so `retag` must be called on a `var` local. `priv` works on both forms;
`label_text` and `set_tag` can only be called inside `Tagged`. The `previous`
default is checked and compiled separately for each `T`.

For all rules, see [Classes](/guide/classes/),
[Interfaces and inheritance](/guide/interfaces/), and
[Structs and unions](/guide/structs/).
