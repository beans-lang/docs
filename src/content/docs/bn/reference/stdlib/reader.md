---
title: std.reader
description: একটা File-এর উপর buffered লাইন পড়া, একবারে এক লাইন করে, ফাইলের cursor না নাড়িয়ে।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 1 type · 1 constructor · 1 instance method.
<!-- coverage:summary:end -->

`std.reader` একটা `Reader` দেয় যেটা একটা [`File`](/bn/reference/builtins/files/)
কে একবারে এক লাইন করে পড়ে। এটা পেছনে buffer করে, তাই প্রতি লাইনে একটা করে
syscall করতে হয় না। সোর্স পড়ুন
[`stdlib/std/reader/reader.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/reader/reader.b)-তে।

```beans
import std.reader
```

## Reader

একটা `Reader` তৈরি করা হয় `new` দিয়ে, তাকে একটা খোলা ফাইল ধরিয়ে দিয়ে:

```beans
pub class Reader
new Reader(file: File)

pub fn read_line() -> Result<Option<string>>
```

- `read_line` প্রতিটা লাইনের জন্য `ok(some(line))` ফেরত দেয়, শেষের newline বাদ
  দিয়ে। ফাইল শেষ হলে `ok(none)` ফেরত দেয়। পড়া ফেল করলে একটা error পাওয়া যায়।

Reader নিজের একটা offset রাখে আর `pread` দিয়ে পড়ে, তাই এটা underlying ফাইলের cursor
কখনো নাড়ায় না। একই ফাইল একই সময়ে আরেকভাবে পড়া যায়, দুইটা একে অন্যের সাথে
বাধা দেবে না।

```beans
import std.io
import std.reader

fn main() {
    let file: File = File.open("log.txt", "r").expect("open")
    let r: reader.Reader = new reader.Reader(file)
    for true {
        let line: Option<string> = r.read_line().expect("read")
        match line {
            some(text) => io.println(text),
            none => { break },
        }
    }
    file.close()
}
```

## আরও দেখুন

- [Files and mapping](/bn/reference/builtins/files/) — `File` type, যেটা খুলে
  এখানে পাঠানো হয়।
- [std.fs](/bn/reference/stdlib/fs/) — যখন লাইন ধরে পড়ার দরকার নেই, তখন একবারে পুরো
  ফাইল পড়া।
