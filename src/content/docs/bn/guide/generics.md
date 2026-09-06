---
title: Generics
description: Beans-এ type parameter আর interface bound, আর monomorphization কীভাবে প্রতিটা concrete type-এর জন্য আলাদা copy compile করে।
---

Generic code angle bracket-এ type parameter নেয়। Beans generic-কে
**monomorphize** করে: একটা generic যত concrete type-এর সাথে ব্যবহার হয়, প্রতিটার
জন্য এটা আলাদা copy compile করে। কোনো boxing নেই, আর generic-টার নিজের জন্য কোনো
dynamic dispatch নেই।

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

## Bound

একটা type parameter `implements` দিয়ে এক বা একাধিক interface চাইতে পারে, `&` দিয়ে
জোড়া লাগানো। একটা generic body-র ভেতরে শুধু সেই operation-গুলোই ব্যবহার করা
যায় যেগুলো ওই bound-গুলো প্রতিশ্রুতি দেয়।

compiler যে interface-গুলো চেনে:

- `Clone`: value-টা copy করা যায়।
- `Eq`: value-দের equality-র জন্য তুলনা করা যায়।
- `Hash`: value-দের hash করা যায় (`Map`/`OrderedMap` key-র জন্য লাগে)।
- `Order`: value-দের একটা ordering আছে (`Order` সাথে `Eq`-ও প্রতিশ্রুতি দেয়)।
- `Send`: value-টা অন্য thread-এ move করা যায়।
- `Sync`: value-টা thread-দের মধ্যে share করা যায়।

নিজের interface-ও, এমনকি import করা গুলোও, bound হতে পারে। generic code সেই
interface-গুলোর প্রতিশ্রুত instance method কল করতে পারে।

```beans
fn imported_label<T implements u.Device>(d: T) -> string {
    return d.name()          // allowed: Device promises name()
}
```

Bound যেখানে একটা generic **ব্যবহার** হয় সেখানে চেক করা হয়, যেখানে declare করা হয়
সেখানে না। অচেনা interface error, চুপচাপ ছেড়ে দেওয়া হয় না।

## Collection-এর ওপর bound

`Map<K, V>` আর `OrderedMap<K, V>`-এর `K implements Eq & Hash` লাগে। একটা
collection-এর `clone()` তখনই পাওয়া যায় যখন প্রতিটা stored type `Clone`, আর ordering
বা equality method-এর জন্য `Order` বা `Eq` লাগে।

## `Self` type

একটা type-এর নিজের body-র ভেতরে `Self` সেই type-টাকেই বোঝায়। এটা একটা builtin type
name, তাই concrete name আবার না লিখেই এটা method signature আর generic code-এ কাজ
করে। যে method নিজের ওপর যে type-এ কল হয় সেই type-ই ফেরত দেয়, তার জন্য এটা কাজের।
উপরের marker interface-গুলোর মতোই, `Self`-কে compiler-এর builtin-type registry চেনে
— এটা declare করা কিছু না।

## Generic construct করা

Type argument আসে declare করা জায়গা থেকে, নয়তো একটা explicit constructor type
থেকে:

```beans
let a: Stack<int> = new Stack()      // T from the declaration
let b: Stack<int> = new Stack<int>() // T stated explicitly

let p: Pair<int> = Pair { first: 1, second: 2 }
```

একটা generic struct-এর field literal-এর ক্ষেত্রে, declare করা result type-টাই type
argument জোগায়। binding-এ `Pair<int>` লেখা হয়; শুধু `Pair` অসম্পূর্ণ।

Generic struct তাদের type parameter field, default, আর method-এ ব্যবহার করতে পারে:

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

Monomorphization `Tagged<int>` আর `Tagged<string>`-কে আলাদা inline layout আর আলাদা
compiled method copy দেয়। static field শুধু non-generic class-এরই। একটা struct তবুও
static method declare করতে পারে।

## Inheritance

একটা generic class অন্য যেকোনো class-এর মতোই inherit করে। সে একটা plain class
extend করতে পারে, নিজের parameter-এ থাকা generic base extend করতে পারে, কিংবা
concrete argument-এ pin করা base — আর একই সাথে extend আর implement দুটোই করতে
পারে।

```beans
class Base<T> {
    v: T
    fn init(v: T) { self.v = v }
    fn weight() -> int { return 1 }
}

class Sub<T> extends Base<T> {
    fn init(v: T) { super.init(v) }
    override fn weight() -> int { return 2 }
}

class Leaf extends Sub<int> {
    fn init() { super.init(9) }
}
```

প্রতিটা instantiation নিজেই একটা আলাদা class। `Sub<int>` আর `Sub<string>` আলাদা
field offset আর আলাদা method table পায়, তাই parameter-এ type করা field এক
instantiation-এ traced reference আর অন্যটায় সাধারণ word। generic class যে
override declare করে সেটা প্রতিটা receiver-এর জন্যই জেতে — base-এ লেখা receiver
সহ। `Base<int>`-এ রাখা `Sub<int>` `2` দেয়, `Leaf`-ও `2` দেয়।

chain-এর সীমা শুধু program কতগুলো class declare করেছে তাই। inheritance cycle
declaration-এই refuse হয়; আর কিছু গভীরতা আটকায় না।

### `as?` class-এর নাম নেয়, instantiation-এর নয়

downcast run time-এ object-এর নিজের class দেখে ঠিক হয়, আর object তার type
argument বয়ে নেয় না — তাই `as?` `Sub<int>` নাম নিতে পারে না। বদলে একটা
non-generic class-এ downcast করুন; target-টাই runtime identity বয়, আর source
generic type হতে পারে:

```beans
fn describe(b: Base<int>) -> string {
    match b as? Leaf {
        some(_) => { return "leaf" }
        none => { return "not a leaf" }
    }
}
```

## একটা পুরো উদাহরণ

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

`Send` আর `Sync`-এর দাম সবচেয়ে বেশি বোঝা যায় [Concurrency](/bn/guide/concurrency/)-তে।
