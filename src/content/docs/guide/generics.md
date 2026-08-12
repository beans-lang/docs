---
title: Generics
description: Type parameters and interface bounds in Beans, and how monomorphization compiles a separate copy per concrete type.
---

Generic code takes type parameters in angle brackets. Beans **monomorphizes**
generics: it compiles a separate copy for each concrete type a generic is used
with. There is no boxing, and no dynamic dispatch for the generic itself.

```beans
class Stack<T> {
    items: List<T> = []

    fn push(x: T) { self.items.push(x) }
    fn pop() -> Option<T> { return self.items.pop() }
}

struct Pair<T> {
    first: T
    second: T
}

fn largest<T implements Order>(xs: List<T>) -> Option<T> { /* ... */ }
fn index<K implements Eq & Hash, V>(key: K, value: V) -> Map<K, V> { /* ... */ }
```

## Bounds

A type parameter can require one or more interfaces with `implements`, joined by
`&`. Inside a generic body you may only use the operations those bounds promise.

The compiler-known interfaces are:

- `Clone`: the value can be copied.
- `Eq`: values can be compared for equality.
- `Hash`: values can be hashed (needed for `Map`/`OrderedMap` keys).
- `Order`: values have an ordering (`Order` also promises `Eq`).
- `Send`: the value can move to another thread.
- `Sync`: the value can be shared between threads.

Your own interfaces, including imported ones, can also be bounds. Generic code
may call the instance methods those interfaces promise.

```beans
fn imported_label<T implements u.Device>(d: T) -> string {
    return d.name()          // allowed: Device promises name()
}
```

Bounds are checked where a generic is **used**, not where it is declared.
Unknown interfaces are errors, not ignored.

## Bounds on the collections

`Map<K, V>` and `OrderedMap<K, V>` require `K implements Eq & Hash`. A
collection's `clone()` is available only when every stored type is `Clone`, and
ordering or equality methods require `Order` or `Eq`.

## The `Self` type

Inside a type's own body, `Self` names that type. It is a builtin type name, so
it works in method signatures and generic code without repeating the concrete
name. This is useful for a method that returns the same type it is called on.
Like the marker interfaces above, `Self` is recognized by the compiler's
builtin-type registry rather than being something you declare.

## Constructing generics

Type arguments come from the declared spot or an explicit constructor type:

```beans
let a: Stack<int> = new Stack()      // T from the declaration
let b: Stack<int> = new Stack<int>() // T stated explicitly

let p: Pair<int> = Pair { first: 1, second: 2 }
```

For a generic struct field literal, the declared result type supplies the type
argument. Write `Pair<int>` on the binding; bare `Pair` is incomplete.

Generic structs can use their type parameter in fields, defaults, and methods:

```beans
struct Tagged<T> {
    value: T
    previous: Option<T> = none
    tag: int

    fn current() -> T {
        return self.value
    }

    inout fn retag(tag: int) {
        self.tag = tag
    }
}

var item: Tagged<string> = Tagged { value: "beans", tag: 1 }
item.retag(2)
```

Monomorphization gives `Tagged<int>` and `Tagged<string>` separate inline
layouts and separate compiled method copies. Static fields belong only to
non-generic classes. A struct may still declare static methods.

## A complete example

```beans
import std.io

class Stack<T> {
    items: List<T> = []

    fn push(x: T) { self.items.push(x) }
    fn pop() -> Option<T> { return self.items.pop() }
    fn len() -> int { return self.items.len() }
}

fn main() {
    let s: Stack<int> = new Stack()
    s.push(1)
    s.push(2)
    io.println("{s.len()}")
    match s.pop() {
        some(v) => io.println("top {v}"),
        none    => io.println("empty"),
    }
}
```

`Send` and `Sync` matter most in [Concurrency](/guide/concurrency/).
