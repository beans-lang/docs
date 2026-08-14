---
title: 'Enums'
description: 'Beans-এ নিজের বানানো enum: variant, payload, method, আর matching।'
---

একটা enum হলো একটা type, যার একটা বাঁধা সেট named **variant** থাকে। variant-এর নাম
snake_case, আর একটা variant একটা payload বয়ে নিতে পারে। enum-গুলো
[`match`](/bn/guide/pattern-matching/)-এর জন্য বানানো।

```beans
enum Status {
    active
    suspended
    closed
}
```

## Payload

একটা variant named field বয়ে নিতে পারে:

```beans
enum Payment {
    cash
    card(number: string)
    transfer(iban: string, amount: decimal)
}

fn describe(p: Payment) -> string {
    return match p {
        cash => "cash",
        card(n) => "card ending {n.last(4)}",
        transfer(iban, amt) => "sent {amt} to {iban}",
    }
}
```

একটা variant তৈরি করা হয় সামনে enum-এর নাম দিয়ে: `Payment.card("4242")`, নয়তো payload
ছাড়া একটা variant-এর জন্য `Payment.cash`। উল্টোদিকে, matching-এ শুধু
variant-এর নাম ব্যবহার হয়। এটা payload field-গুলো position ধরে bind করে
(`card(n)`), আর matched value তাদের type ঠিক করে দেয়, তাই আবার সেগুলো লিখতে
হয় না।

## Method

enum-ও object। এরা method বয়ে নিতে পারে, একটা implicit `self`-সহ:

```beans
enum Level {
    low
    high

    fn label() -> string {
        return match self {
            low => "low",
            high => "high",
        }
    }
}
```

## Option আর Result হলো builtin enum

`Option<T>` আর `Result<T, E>` সাধারণ builtin enum:

```beans
enum Option<T> {
    some(value: T)
    none
}

enum Result<T, E> {
    ok(value: T)
    err(error: E)
}
```

এই কারণেই `some`, `none`, `ok`, আর `err` lowercase: এরা variant value, আর variant
snake_case। দেখুন [Option and Result](/bn/guide/errors/)।

## একটা পুরো উদাহরণ

payload আর একটা method-সহ একটা enum, একটা value বের করতে match করা হচ্ছে:

```beans
import std.io

enum Shape {
    circle(r: f64)
    rect(w: f64, h: f64)

    fn area() -> f64 {
        return match self {
            circle(r) => 3.14159 * r * r,
            rect(w, h) => w * h,
        }
    }
}

fn main() {
    let s: Shape = Shape.rect(3.0, 4.0)
    io.println("{s.area()}")
}
```

একটা enum-এর ওপর `match`-কে প্রতিটা variant ঢাকতে হবে, নয়তো বাকিগুলো `_` দিয়ে
সামলাতে হবে। দেখুন [Pattern matching](/bn/guide/pattern-matching/)।
