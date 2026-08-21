---
title: Verify the install
description: beansc --version, beansc doctor আর একটা hello program দিয়ে Beans install ঠিকঠাক কিনা যাচাই করা।
---

Install করার পর তিনটা দ্রুত check-ই বলে দেবে সব জায়গামতো আছে কিনা। আগে একটা **নতুন**
terminal খুলুন, যাতে নতুন করা PATH-টা চালু থাকে।

## ১. version দেখা

```bash
beansc --version
```

```text
beansc 0.1.27 (language 1.0, runtime ABI 7)
```

এটা তিনটা জিনিস বলে: compiler-এর version (`0.1.27`), সে যে ভাষার contract মেনে চলে
সেটা (`1.0`), আর runtime ABI (`7`)।

## ২. doctor চালানো

```bash
beansc doctor
```

`doctor` জানায় install কী কী build করতে পারে, আর কোথাও ফাঁক থাকলে সেটা কীভাবে ঠিক
করতে হবে। যেমন, একটা native `build`-এর জন্য যদি এমন কোনো C compiler লাগে যেটা PATH-এ
নেই, `doctor` সেটা বলে দেয় আর কী install করতে হবে তা-ও বলে।

`doctor` সবসময় code 0 দিয়ে বের হয়। এটা একটা report, কোনো pass/fail-এর দরজা না। তাই এটা যা
প্রিন্ট করে সেটা পড়ে নিন।

## ৩. একটা program চালানো

এটা `hello.b` নামে save করুন:

```beans
import std.io

fn main() {
    let name: string = "beans"
    io.println("hello from {name}")
}
```

reference interpreter-এ চালান:

```bash
beansc run hello.b
```

```text
hello from beans
```

তিনটা check-ই কাজ করলে install ঠিক আছে। এরপর [প্রথম program লিখুন আর
চালান](/bn/start/hello-world/) নয়তো [একটা project সাজান](/bn/start/projects/)। `beansc doctor`
নিয়ে আরও জানতে দেখুন [doctor আর upgrade](/bn/tools/doctor-upgrade/)।
