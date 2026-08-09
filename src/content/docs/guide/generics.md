---
title: Generics
description: Type parameters and interface bounds in Beans. Generics are monomorphized for speed.
---

Generic code takes type parameters in angle brackets. Beans **monomorphizes**
generics — it compiles a real copy per concrete type, like C++ templates. This
is a speed feature: no boxing, no dynamic dispatch for the generic itself.

```beans
class Stack<T> {
    items: List<T> = []

    fn push(x: T) { self.items.push(x) }
    fn pop() -> Option<T> { return self.items.pop() }
}

fn largest<T implements Order>(xs: List<T>) -> Option<T> { /* ... */ }
fn index<K implements Eq & Hash, V>(key: K, value: V) -> Map<K, V> { /* ... */ }
```

## Bounds

A type parameter can require one or more interfaces with `implements`, joined by
`&`. Inside a generic body you may only use the operations those bounds promise.

The compiler-known interfaces are:

- `Clone` — the value can be copied.
- `Eq` — values can be compared for equality.
- `Hash` — values can be hashed (needed for `Map`/`OrderedMap` keys).
- `Order` — values have an ordering (`Order` also promises `Eq`).
- `Send` — the value can move to another thread.
- `Sync` — the value can be shared between threads.

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
name — useful for a method that returns the same type it is called on. Like the
marker interfaces above, `Self` is recognized by the compiler's builtin-type
registry rather than being something you declare.

## Constructing generics

Type arguments come from the declared spot or an explicit constructor type:

```beans
let a: Stack<int> = new Stack()      // T from the declaration
let b: Stack<int> = new Stack<int>() // T stated explicitly
```

## Next

- [Interfaces and inheritance](/guide/interfaces/)
- [Collections](/reference/builtins/collections/)
- [Concurrency](/guide/concurrency/) — where `Send` and `Sync` matter

Source: [`spec/SYNTAX.md`](https://github.com/beans-lang/beans/blob/main/spec/SYNTAX.md).
