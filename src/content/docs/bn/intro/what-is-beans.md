---
title: What Beans is
description: Beans ভাষার ছোট একটা পরিচয় — কী কী ভালো করার জন্য তৈরি, আর কাজ করতে যে একটাই tool লাগে।
---

Beans একটা ছোট object-oriented programming language। এতে class, interface আর
reference semantics-সহ inheritance আছে, আর এই সবই বসানো একটা ছোট grammar-এর উপর।
মেমরির আচরণ আগে থেকে বোঝা যায়, আর operating system-এ সরাসরি হাত দেওয়া যায়।

Source file-এর শেষে থাকে `.b`।

## exact আর low-level, দুটোর জন্যই তৈরি

Beans তৈরি হয়েছে exact আর low-level — দুটোই হওয়ার জন্য। বেশিরভাগ design সিদ্ধান্ত
এই দুটোর কোনো একটা বা দুটোকেই কাজে লাগে, তাই business software-এ যেমন মানায়,
systems-এর কাজেও তেমন।

### Business apps

Accounting, ERP, billing — যেসব program-এ একটা number ভুল হলে সেটা সত্যিকারের সমস্যা।
এই কাজের জন্য Beans দেয়:

- **বাধ্যতামূলক explicit type।** প্রতিটা নাম বলে দেয় সে কী, তাই কোডটা কয়েক মাস পরেও
  পড়ে বোঝা যায়।
- **নিখুঁত `decimal` হিসাব।** `19.99 * 3` হলো ঠিক `59.97`, প্রায়-ঠিক কোনো float না।
- **কোনো null নেই, কোনো exception নেই।** যা থাকতে পারে না সেটা `Option<T>`; ব্যর্থতা
  `Result<T>`। কোনো লুকানো control flow নেই।

### Systems work

Database, operating system, hardware control — যেসব program সরাসরি মেশিন ছোঁয়। এই কাজের
জন্য Beans দেয়:

- **Sized integer** যেমন `i32` আর `u64`, আর value type (`struct`, `union`)।
- **একটা `unsafe` layer** — raw memory আর C interop সহ।
- **কোনো garbage-collector pause নেই।** মেমরি চলে automatic reference counting আর একটা
  cycle collector দিয়ে, তাই কোনো tracing collector হঠাৎ program থামিয়ে দেয় না।

## একটাই tool: `beansc`

একটাই command, `beansc`, আর এটাই পুরো toolchain:

- একটা **type checker** যেটা program যাচাই করে,
- একটা **reference interpreter** যেটা কোনো build step ছাড়াই সেটা চালায়,
- একটা **native LLVM backend** যেটা সেটাকে সত্যিকারের binary বানায়,
- একটা **package manager** (`beansc pot`),
- editor-এর জন্য একটা **language server (LSP)**, আর
- একটা **debugger (DAP)**।

`beansc` self-hosted: Beans compiler নিজেই Beans-এ লেখা, আর নিজেকেই compile করে।

## একটা ছোট উদাহরণ

এটা একটা পুরো Beans program। `hello.b` নামে save করুন।

```beans
import std.io

fn main() {
    let name: string = "beans"
    io.println("hello from {name}")
}
```

String-এর ভিতরে `{name}` হলো interpolation — এটা `name`-এর value প্রিন্ট করে। এভাবে চালান:

```bash
beansc run hello.b
```

```text
hello from beans
```

এরপর এই সিদ্ধান্তগুলোর পিছনের নিয়ম জানতে [ল্যাঙ্গুয়েজ ফিলোসফি](/bn/intro/philosophy/) পড়ুন, নয়তো
[Beans install করুন](/bn/start/install/) আর প্রথম program চালান।
