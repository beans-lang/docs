---
title: Pattern matching
description: Beans-এ match — variant, literal, range, or-pattern, wildcard, exhaustiveness আর block arm সব একসাথে।
---

কোনো value-এর গড়ন দেখে `match` একটা arm বেছে নেয়। প্রতিটা arm হলো
`pattern => result`।

```beans
let label: string = match code {
    200        => "ok",
    301 | 302  => "moved",
    400..=499  => "client bug",
    _          => "who knows",
}
```

প্যাটার্ন যা যা হতে পারে:

- একটা **literal** (`200`),
- একটা **or-pattern**, অর্থাৎ কয়েকটা মিলিয়ে (`301 | 302`),
- একটা **range** (`400..=499` দুই দিক ধরে, `0..10` শেষটা বাদ দিয়ে),
- একটা wildcard `_`, যেটা যেকোনো কিছুর সাথে মেলে।

## enum variant ম্যাচ করা

কোনো enum-এ ম্যাচ করলে সাথে সাথে তার payload-ও bind হয়ে যায়। যে value ম্যাচ
হচ্ছে সেটাই type ঠিক করে দেয়, তাই আলাদা করে type লেখার দরকার নেই:

```beans
enum Payment {
    cash
    card(number: string)
    transfer(iban: string, amount: decimal)
}

let text: string = match p {
    cash => "cash",
    card(n) => "card ending {n.last(4)}",
    transfer(iban, amt) => "sent {amt} to {iban}",
}
```

`Option` আর `Result`-ও ঠিক একইভাবে ম্যাচ হয়:

```beans
match parse_age(input) {
    ok(n)  => io.println("age {n}"),
    err(e) => io.println("bad: {e.msg}"),
}
```

payload-এর type নিজে লিখে দেওয়া যায়: `some(u: User) =>`।

## Exhaustiveness

`match`-কে সব case সামলাতে হবে। একটাও বাদ দিলে compile error হবে — কোন case
বাদ পড়েছে সেটা বলে দেবে, আর সেটা যোগ করতে বলবে অথবা একটা `_` arm দিতে বলবে।
enum ম্যাচ করার সময় হয় প্রতিটা variant ধরতে হয়, নয়তো একটা `_` দিতে হয়। literal বা
range কখনও নিজে থেকে গোটা type ঢাকে না, তাই বাকিটুকু ধরতে ওখানে সবসময় একটা `_`
লাগবেই:

```beans
let label: string = match code {
    200        => "ok",
    404        => "not found",
    _          => "other",
}
```

## Value position বনাম statement position

`if`-এর মতোই `match`-এরও দুইটা জায়গা আছে:

- **Value position:** প্রতিটা arm ঠিক একটা expression, আর গোটা `match`-টাই সেই
  value। এখানে block arm দিলে error।
- **Statement position:** এখানে arm block হতে পারে, তার ভেতর কয়েকটা statement
  থাকতে পারে, আর কোনো value বানায় না:

```beans
match ch.receive() {
    some(v) => {
        total += v
        io.println("got {v}")
    }
    none => { break }
}
```

`{` টা অবশ্যই `=>`-এর পরে একই লাইনে থাকতে হবে। একটা কোনার কেস: arm-এর *value*
হিসেবে কোনো map literal দিলে সেটাকে বন্ধনী দিতে হয়, `x => ({"a": 1})`।

## match-এর ভেতর as?

[`as?`](/bn/guide/interfaces/) downcast একটা `Option` ফেরত দেয়, তাই এটা `match`-এর
সাথে দিব্যি খাপ খায়:

```beans
match shape as? Circle {
    some(c) => io.println("circle r={c.r}"),
    none    => io.println("not a circle"),
}
```

যেসব enum-এ ম্যাচ করা হচ্ছে সেগুলোর জন্য দেখুন [Enums](/bn/guide/enums/); আর `Option`
ও `Result`-এর জন্য দেখুন [Option and Result](/bn/guide/errors/)।
