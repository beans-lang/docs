---
title: Option, Result, and Error
description: Beans কীভাবে না-থাকা value আর ব্যর্থতা সামলায় — Option, Result, Error, ? operator, আর combinator দিয়ে।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 3 types · 11 instance methods · 2 public fields · 4 prelude values.
<!-- coverage:summary:end -->

Beans-এ null নেই, exception নেই। এর বদলে "হয়তো আছে" আর "ব্যর্থ হলো" — এই ধরনের
উত্তরের জন্য দুইটা builtin enum আর একটা builtin class দেওয়া আছে। এই পেজে তিনটাই
বোঝানো হলো, আর এদের নিয়ে কাজ করার tool গুলোও। বড় ছবিটা দেখতে language guide-এর
[error handling](/bn/guide/errors/) পড়ুন।

`Error` `Send`। `Option<T>` আর `Result<T, E>` তখন `Send`, যখন payload type
`Send`; তাই worker `?` ব্যবহার করে typed failure return করতে পারে।

## Option&lt;T&gt;

`Option<T>` হলো এমন একটা value যা হয়তো থাকে না। এটা একটা builtin enum, দুইটা
variant নিয়ে:

- `some(value: T)`: একটা value আছে।
- `none`: কিছুই নেই।

prelude-এর নাম `some` আর `none` দিয়ে একটা তৈরি করা হয়, আর `match` দিয়ে পড়া হয়:

```beans
let found: Option<int> = some(42)
match found {
    some(v) => io.println("got {v}"),
    none => io.println("nothing"),
}
```

## Result&lt;T, E&gt;

`Result<T, E>`-তে থাকে হয় একটা value, নয়তো একটা error। এটা একটা builtin enum:

- `ok(value: T)`: সফল, সাথে একটা value।
- `err(error: E)`: ব্যর্থ, সাথে একটা error।

শুধু `Result<T>` লিখলে সেটা `Result<T, Error>` বোঝায়, standard `Error` type ব্যবহার
করে।

```beans
fn parse(s: string) -> Result<int> {
    s.to_int()
}
```

## Error

`Error` হলো standard builtin error class। এর এই field গুলো আছে:

- `msg: string`: মানুষের পড়ার মতো একটা message।
- `kind: string`: error-টা কী ধরনের সেটা বলা একটা ছোট slug, যেমন `"eof"`।
- একটা `cause`: নিচের দিকের একটা error, যা হয়তো থাকে, হয়তো থাকে না।

## some, none, ok, err হলো prelude-এর নাম

`some`, `none`, `ok`, আর `err` হলো prelude-এর সাধারণ নাম। এরা keyword না। এদের
function-এর মতো call করা হয়।

একটা `err` বানানোর উপায়:

| রূপ | অর্থ |
| --- | --- |
| `err(message)` | সেই message নিয়ে একটা `Error` |
| `err(message, kind)` | message আর একটা kind slug নিয়ে একটা `Error` |
| `err(value)` | নিজের `E`-র জন্য একটা custom error type |

```beans
fn read_more() -> Result<Bytes> {
    err("closed", "eof")
}
```

## ? operator

`?` operator একটা `Result`-কে খুলে দেয়। value যদি `err` হয়, `?` সাথে সাথে সেই
error-টা caller-এর কাছে ফেরত পাঠিয়ে দেয়। আর `ok` হলে `?` ভেতরের value-টা দেয়।

```beans
fn total(a: string, b: string) -> Result<int> {
    let x: int = a.to_int()?
    let y: int = b.to_int()?
    ok(x + y)
}
```

দুইটা arm-ই নিজে সামলাতে চাইলে বরং `match` ব্যবহার করা হয়।

## panic

`panic(message: string)` হলো এমন error-এর জন্য prelude function যেটা থেকে আর
ফেরা যায় না। এটা call কোথায় হলো সেটা আর message-টা জানায়, status 3 নিয়ে বেরিয়ে
যায়, আর কখনো return করে না। এটা defer **চালায় না**।

```beans
panic("unreachable state")
```

যেসব error সামলানো যায় সেগুলোর জন্য `Option` আর `Result` ব্যবহার করা হয়। `panic`
শুধু সেই bug-এর জন্য যেগুলো কখনোই হওয়ার কথা না। দেখুন
[Prelude function](/bn/reference/builtins/functions/)।

## Option-এর method

```beans
Option<T>.or(T) -> T
Option<T>.expect(string) -> T
Option<T>.is_some() -> bool
Option<T>.is_none() -> bool
```

- `or(fallback)` value-টা দেয়, আর `none` হলে `fallback` দেয়।
- `expect(msg)` value-টা দেয়, আর `none` হলে `msg` নিয়ে panic করে।
- `is_some()` true যখন value আছে; `is_none()` true যখন নেই।

`Option<T>`-এর তিনটা higher-order combinator-ও আছে, closure-এর result নিয়ে
generic:

- `map(fn(T) -> U) -> Option<U>` value থাকলে তার ওপর `fn` চালায়।
- `and_then(fn(T) -> Option<U>) -> Option<U>` এমন একটা `fn` চালায় যেটা নিজেই একটা
  `Option` দেয়।
- `filter(fn(T) -> bool) -> Option<T>` value-টা রাখে শুধু তখনই যখন `fn` true দেয়।

```beans
let n: int = "7".to_int().or(0)
let name: Option<string> = some("ann")
let upper: Option<string> = name.map(fn(s: string) -> string { s.to_upper() })
```

## Result-এর method

```beans
Result<T>.or(T) -> T
Result<T>.expect(string) -> T
Result<T>.is_ok() -> bool
```

- `or(fallback)` value-টা দেয়, আর `err` হলে `fallback` দেয়।
- `expect(msg)` value-টা দেয়, আর `err` হলে `msg` নিয়ে panic করে।
- `is_ok()` সফল হলে true।

`Result<T>`-এরও তিনটা higher-order combinator আছে:

- `map(fn(T) -> U) -> Result<U>` সফল হলে value-এর ওপর `fn` চালায়।
- `and_then(fn(T) -> Result<U>) -> Result<U>` এমন একটা `fn` চালায় যেটা নিজেই একটা
  `Result` দেয়।
- `recover(fn(Error) -> T) -> T` একটা error-কে একটা value-তে বদলে দেয়।

```beans
let count: int = "42".to_int().recover(fn(e: Error) -> int { 0 })
```

:::note[Combinator payload copy করে]
`map`, `and_then`, `filter`, আর বাকি combinator গুলো active value-টা copy করে, তাই
তার type-কে `Clone` implement করতে হয়। কোনো `std.option` বা `std.result` package
নেই; এগুলো builtin method।
:::

## একটা সাজানো উদাহরণ

`?` প্রথম error-টা caller-এর কাছে পাঠায়; `match` দুইটা arm-ই সামলায়; আর
`err(msg, kind)` একটা kind slug বসিয়ে দেয় যেটা পরে `Error` থেকে পড়া যায়:

<!-- beans:compile -->
```beans
import std.io

fn parse_qty(s: string) -> Result<int> {
    let n: int = s.to_int()?
    if n < 0 {
        return err("quantity cannot be negative", "invalid")
    }
    return ok(n)
}

fn main() {
    match parse_qty("42") {
        ok(n) => io.println("qty {n}"),
        err(e) => io.println("{e.kind}: {e.msg}"),
    }
    match parse_qty("-3") {
        ok(n) => io.println("qty {n}"),
        err(e) => io.println("{e.kind}: {e.msg}"),
    }

    let fallback: int = parse_qty("nope").or(0)
    io.println("fallback {fallback}")
}
```

## আরও দেখুন

- language guide-এর [error handling](/bn/guide/errors/)।
- [Prelude function](/bn/reference/builtins/functions/), `panic` পুরোটা।
- [string](/bn/reference/builtins/string/), `to_int`, `to_float`, `to_decimal` `Result` দেয়।
