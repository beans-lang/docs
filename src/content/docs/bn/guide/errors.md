---
title: Option and Result
description: Beans-এ null নেই, exception নেই। absence-এর জন্য Option, failure-এর জন্য Result, আর ? error উপরে ঠেলে দেয়।
---

Beans-এ **null নেই** আর **exception নেই**। দুটো builtin enum এই কাজ সামলায়:

- `Option<T>`: এমন একটা value যা হয়তো নেই, হয় `some(value)` নয় `none`।
- `Result<T, E>`: এমন একটা operation যা fail করতে পারে, হয় `ok(value)` নয়
  `err(error)`।

মূল নিয়ম: **যে function fail করতে পারে, সেটা তার return type-এই সেটা বলে দেয়।**

```beans
fn find(users: List<User>, name: string) -> Option<User> {
    for u: User in users {
        if u.name == name {
            return some(u)
        }
    }
    return none
}

fn parse_age(s: string) -> Result<int> {
    let n: int = s.to_int()?         // ? = if err, return it up; else unwrap
    if n < 0 {
        return err("negative age")
    }
    return ok(n)
}
```

`some`, `none`, `ok`, আর `err` সাধারণ prelude name, keyword না।

## Result আর Error

`Result<T>` হলো `Result<T, Error>`-এর সংক্ষিপ্ত রূপ। `Error` একটা builtin class,
যার একটা message আর একটা slug আছে:

- `msg: string`: মানুষের পড়ার মতো message।
- `kind: string`: একটা ছোট slug, যেমন `not_found`, `eof`, `timeout`, বা `invalid`।

একটা error তিনভাবে তৈরি করা হয়:

```beans
return err("file is gone")                 // just a message
return err("closed after 3 of 8 bytes", "eof")   // message + kind slug
return err(my_custom_error)                // a custom error type: Result<T, MyError>
```

`msg`/`kind` রূপটা শুধু builtin `Error`-এর জন্য। একটা custom error type নিজের field
বয়ে নেয়, তাই সেখানে `err(value)` রূপটাই চলে।

## `?` operator

`?` একটা error উপরে ঠেলে দেয়। `err`-এ, এটা current function থেকে ওই error return করে
দেয়; `ok`-এ, এটা value-টা unwrap করে।

```beans
fn load_and_parse(path: string) -> Result<int> {
    let text: string = fs.read(path)?      // returns the error on failure
    return text.to_int()
}
```

## match দিয়ে সামলানো

```beans
match parse_age(input) {
    ok(n)  => io.println("age {n}"),
    err(e) => io.println("bad: {e.msg}"),
}
```

## Helper method

```beans
let age: int = parse_age(input).or(18)                    // fallback
let u: User = find(users, "jul").expect("must exist")     // crash with message

let adult: Option<User> = find(users, "jul").filter(fn(u: User) -> bool {
    return u.age >= 18
})
let label: Option<string> = adult.map(fn(u: User) -> string {
    return u.name
})
let parsed: Result<int> = load_text().and_then(fn(s: string) -> Result<int> {
    return s.to_int()
})
let count: int = parsed.recover(fn(e: Error) -> int { return 0 })
```

- `Option`-এ আছে `map`, `and_then`, `filter`, `or`, `expect`, `is_some`,
  `is_none`।
- `Result`-এ আছে `map`, `and_then`, `recover`, `or`, `expect`, `is_ok`।

এই combinator-গুলো active payload-টা copy করে, তাই তার type-কে `Clone` implement
করতে হবে। এরা value-র ওপর instance method; কোনো `std.option` বা `std.result`
package নেই।

## panic

একদম যেটা আর কিছুতেই সামলানো যায় না, তার জন্য `panic(message)` call location আর
message জানায়, তারপর status 3 দিয়ে বেরিয়ে যায়। এটা কখনও return করে না, আর
[`defer`](/bn/guide/control-flow/) block চালায় না। এটা bug-এর জন্য ব্যবহার করা হয়।
যেসব failure আগেই জানা, সেগুলোর জন্য `Result` আছেই।

## একটা পুরো উদাহরণ

`?` দিয়ে উপরে ঠেলে দেওয়া, তারপর `match` দিয়ে সামলানো:

```beans
import std.io

fn parse_positive(s: string) -> Result<int> {
    let n: int = s.to_int()?          // returns the error up on failure
    if n < 0 {
        return err("negative", "invalid")
    }
    return ok(n)
}

fn main() {
    match parse_positive("42") {
        ok(n)  => io.println("got {n}"),
        err(e) => io.println("bad: {e.msg} ({e.kind})"),
    }
}
```

পুরো method-এর তালিকা আছে
[Option and Result reference](/bn/reference/builtins/option-result/)-এ।
