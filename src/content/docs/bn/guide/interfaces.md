---
title: Interfaces, abstract classes, and inheritance
description: একটা class inheritance, একাধিক interface, abstract method, override-এর নিয়ম, super, আর as? downcast।
---

একটা class-এর **একটাই** base class থাকে, আর সেটা **অনেকগুলো** interface implement
করতে পারে। interface অন্য interface-কে extend করতে পারে।

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

- `extends` একটা class base নেয়; `implements` comma দিয়ে আলাদা করা interface নেয়।
- interface-এর requirement আর default method — এরা instance method। static interface
  method সাপোর্ট করা হয় না।
- একটা `abstract class` body ছাড়া `abstract fn` declaration আর সাধারণ method মিশিয়ে
  রাখতে পারে। এটা `new` দিয়ে construct করা যায় না।
- একটা concrete subclass-কে প্রতিটা inherit করা abstract method আর প্রতিটা body-ছাড়া
  interface requirement implement করতে হবে।
- একটা `pub interface` তার পুরো method set অন্য package-এর জন্য খুলে দেয়।
- interface `priv` method declare করতে পারে না। private class method কোনো interface
  requirement implement করে না, আর inherit করা method-ও replace করে না।
- Beans-এ এখনও কোনো `final` নেই।

## কখন `override` লিখবে

`override`-এর অর্থ “এমন একটা method replace করছি যেটার আগে থেকেই একটা base contract-এ
slot আছে।” নিয়মটা নির্ভর করে method-টা কোথা থেকে এলো তার ওপর:

| Inherit করা method | `override` লিখব? |
| --- | --- |
| concrete base-class method | হ্যাঁ |
| abstract base-class method | হ্যাঁ |
| default body-সহ interface method | হ্যাঁ |
| body-ছাড়া interface requirement, প্রথম implementation | ইচ্ছা |

যেখানে কোনো base method বা interface requirement মেলে না, সেখানে `override` লেখা
একটা error। আর যেখানে দরকার, সেখানে বাদ দেওয়াও error। এটা দুই পথেই method-name-এর
typo ধরে ফেলে।

`priv`-এর অর্থ একটা নতুন method, যেটার মালিক ঠিক একটা class বা struct — কোনো override
slot না। এই কারণেই `priv abstract fn` আর `priv override fn` error।

একটা abstract declaration-এর কোনো body নেই, আর এটা শুধু একটা `abstract class`-এর
ভেতরেই থাকতে পারে:

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

`super.init(...)` construction chain করে। order-টা বাঁধা: আগে নিজের field, তারপর
parent-এর constructor, তারপর পুরোপুরি বানানো object:

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

- `super.init`-এর আগে parent-এর field-গুলো এখনও তৈরিই হয়নি (default-ওয়ালাগুলোও না)।
  একটা assign করা error; ওগুলোর মালিক `super.init`।
- `super.init` ঠিক একবার চলে, একটা top-level statement হিসেবে, শুধু `init`-এর ভেতরে,
  আর উপরের কোনো class `init` declare করলে এটা লাগবেই। এর আগে একটা `return` দেওয়া
  error।
- `super.method(...)` সবচেয়ে কাছের parent implementation সরাসরি কল করে, virtual
  dispatch এড়িয়ে। এটা শুধু একটা instance method-এই valid।

যে subclass-এর যোগ করা field-এর সব default আছে, সেটা সবচেয়ে কাছের ancestor
initializer inherit করে। যে subclass একটা required field যোগ করে, তাকে নিজের `init`
declare করতে হবে।

## `as?` দিয়ে downcast

`as?` একটা reference-এর আসল type চেক করে, আর একটা `Option` ফেরত দেয়। এটা কখনও crash
করে না:

```beans
let s: Shape = pick_a_shape()
match s as? Circle {
    some(c) => io.println("circle, r = {c.r}"),
    none    => io.println("something else"),
}
```

সাদামাটা `as` শুধু explicit numeric cast আর upcast-এর জন্য।

## একটা পুরো উদাহরণ

একটা class একটা interface implement করছে, আর একটা default method inherit করছে:

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
