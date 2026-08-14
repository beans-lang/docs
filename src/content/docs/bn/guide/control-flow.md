---
title: Control flow
description: Beans-এর একটাই for loop, value হিসেবে if আর match, আর defer।
---

Beans control flow ছোট রাখে: একটা loop keyword, `if`, `match`, আর `defer`। কোনো
`do-while` নেই, কোনো `switch` নেই, কোনো ternary নেই, আর কোনো `++`/`--` নেই।

## for loop

`for`-এর তিনটা রূপ:

```beans
for { }                        // forever
for x < 10 { }                 // while: run while the condition holds
for i: int in 0..10 { }        // range, exclusive. 0..=10 is inclusive
for u: User in users { }       // over any iterable
```

`break`, `continue`, আর `return` স্বাভাবিক ভাবেই কাজ করে। loop variable তার type
বলে দেয় (`i: int`, `u: User`)। condition-এ কোনো parenthesis লাগে না, আর brace
সবসময় লাগবে।

## value হিসেবে if আর match

`if` আর `match` একটা value বানাতে পারে:

```beans
let grade: string = if score >= 90 { "a" } else { "b" }
```

এই branch-গুলোর ভেতরে কোনো `return` নেই। `return` সবসময় বোঝায় "function ছেড়ে বেরিয়ে
যাওয়া", তাই একটা branch-এ `return` দিলে branch-এর value বানানোর বদলে সেটা পুরো
function থেকেই বেরিয়ে যাবে। নিয়মটা হলো:

- **Statement position:** branch-গুলোয় statement থাকে; `return` স্বাভাবিক ভাবেই
  function ছেড়ে বেরোয়।
- **Value position:** প্রতিটা branch ঠিক একটা expression, আর সেই expression-টাই
  value। কয়েকটা statement লাগলে একটা `var` আর statement রূপটা ব্যবহার করা হয়।

`match` ঠিক একইভাবে কাজ করে। pattern-এর রূপগুলো নিয়ে আছে
[Pattern matching](/bn/guide/pattern-matching/)-এ:

```beans
let label: string = match code {
    200        => "ok",
    301 | 302  => "moved",
    400..=499  => "client bug",
    _          => "who knows",
}
```

## defer

`defer` একটা expression schedule করে, যেটা function বেরিয়ে যাওয়ার সময় চলে —
`return` আর `?`-এর মধ্য দিয়ে বেরোলেও। defer করা expression-গুলো নতুনটা আগে চলে, আর
local destruction-এর আগে:

```beans
fn read_config(path: string) -> Result<string> {
    let f: File = File.open(path, "r")?
    defer f.close()
    return read_all(f)              // f.close() runs on the way out
}
```

নিয়মগুলো:

- `defer` function body-র একদম top level-এ বসতে হবে, কোনো `if`, `for`, বা nested
  block-এর ভেতরে না। এটা একটা function-exit hook, আর কোনো nested position থেকে একটা
  register করা checker reject করে।
- একটা **panic** কোনো defer না চালিয়েই process থেকে বেরিয়ে যায়, আর একটা defer-এর
  ভেতরের panic নিজেই fatal।
- একটা defer করা expression-এর ভেতরে `?` চলে না, কারণ function-এর return path
  ততক্ষণে process হচ্ছেই।

`defer` ব্যবহার করা হয় একটা cleanup-কে যে acquisition সেটা undo করে তার সাথে জোড়া
লাগাতে, যাতে cleanup-টা প্রতিটা exit path-এ চলে। একটা `File` বন্ধ করা, একটা resource
unlock করা, বা একটা `Channel` বন্ধ করার এটাই স্বাভাবিক উপায়।

## একটা পুরো program

এটা loop, `match`, `if`, আর value position — সব একসাথে দেখায়:

<!-- beans:compile -->
```beans
import std.io

fn classify(n: int) -> string {
    return match n {
        0        => "zero",
        1 | 2    => "small",
        3..=9    => "medium",
        _        => "large",
    }
}

fn main() {
    for i: int in 0..5 {
        let word: string = classify(i)
        let parity: string = if i % 2 == 0 { "even" } else { "odd" }
        io.println("{i}: {word}, {parity}")
    }
}
```
