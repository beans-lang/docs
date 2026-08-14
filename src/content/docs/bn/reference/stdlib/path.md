---
title: std.path
description: শুধু path স্ট্রিং নিয়ে হিসাব — join, parent, name, extension, আর stem। filesystem-এ কোনো হাত নেই।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 5 package functions.
<!-- coverage:summary:end -->

`std.path` শুধু path স্ট্রিং নিয়ে কাজ করে। এটা filesystem-এ কখনো হাত দেয় না, আর
সব সাপোর্টেড target-এ separator হিসেবে সবসময় `/` ব্যবহার করে। এটাকে path-এর জন্য
স্ট্রিং নিয়ে হিসাব ভাবা যায়। সোর্স পড়ুন
[`stdlib/std/path/path.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/path/path.b)-তে।

```beans
import std.path
```

```beans
pub fn join(first: string, second: string) -> string
pub fn parent(value: string) -> string
pub fn name(value: string) -> string
pub fn extension(value: string) -> string
pub fn stem(value: string) -> string
```

- `join` দুই অংশের মাঝে ঠিক একটা `/` বসায় আর খালি segment বাদ দেয়। `second` যদি
  একটা absolute path হয় (`/` দিয়ে শুরু), তাহলে সেটাই জেতে আর যেমন আছে তেমনই ফেরত
  আসে।
- `parent` শেষ segment-এর আগের সবকিছু ফেরত দেয়। শেষের slash গোনায় ধরা হয় না।
  root-লেভেলের path-এর জন্য এটা `/` ফেরত দেয়, আর কোনো parent না থাকলে `""`।
- `name` শেষ segment-টা ফেরত দেয়। শেষের slash গোনায় ধরা হয় না, তাই `name("a/b/")`
  হলো `"b"`।
- `extension` file extension ফেরত দেয়, সামনের dot সহ, যেমন `".txt"`, আর না থাকলে
  `""`। `.env`-এর মতো একটা dotfile-কে name ধরা হয়, extension না, তাই এর extension
  খালি।
- `stem` শেষ segment-টা ফেরত দেয় তার extension বাদ দিয়ে। `stem` আর `extension`
  মিলিয়ে `name` আবার গড়ে তোলে।

```beans
import std.io
import std.path

fn main() {
    io.println(path.join("a/b", "c.txt"))      // a/b/c.txt
    io.println(path.join("a", "/etc"))          // /etc
    io.println(path.parent("a/b/c.txt"))       // a/b
    io.println(path.name("a/b/c.txt"))         // c.txt
    io.println(path.extension("a/b/c.txt"))    // .txt
    io.println(path.extension(".env"))          // (empty)
    io.println(path.stem("a/b/c.txt"))         // c
}
```

## আরও দেখুন

- [std.fs](/bn/reference/stdlib/fs/) — এই path-গুলো যে ফাইল দেখায়, সেগুলো পড়া আর
  লেখা।
