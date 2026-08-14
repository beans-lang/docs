---
title: std.fs
description: একটা কলেই পুরো ফাইল পড়া আর লেখা, bytes হিসেবে বা টেক্সট হিসেবে।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 7 package functions.
<!-- coverage:summary:end -->

`std.fs` এক-কলে পুরো ফাইল পড়া বা লেখার helper দেয়। ভেতরে ভেতরে এটা একটা
[`File`](/bn/reference/builtins/files/) খোলে, কাজটা করে, আর বন্ধ করে দেয়। সোর্স পড়ুন
[`stdlib/std/fs/fs.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/fs/fs.b)-তে।

প্রতিটা function একটা [`Result`](/bn/reference/builtins/option-result/) ফেরত দেয়, কারণ
filesystem-এর কাজ ফেল করতে পারে। error উপরে পাঠাতে `?` ব্যবহার করুন।

```beans
import std.fs
```

## পড়া

```beans
pub fn read_bytes(path: string) -> Result<Bytes>
pub fn read(path: string) -> Result<string>
```

- `read_bytes` ফাইলটা খোলে, offset 0 থেকে পুরোটা পড়ে, আর bytes ফেরত দেয়।
- `read` একই কাজ করে আর তার ফেরত দেওয়া string-টা সরাসরি ভরে দেয়। এটা মাঝখানে
  কোনো `Bytes` value বানায় না।

## লেখা

```beans
pub fn write_bytes(path: string, data: Bytes) -> Result<int>
pub fn write(path: string, data: string) -> Result<int>
pub fn append_bytes(path: string, data: Bytes) -> Result<int>
pub fn append(path: string, data: string) -> Result<int>
pub fn copy(from: string, to: string) -> Result<int>
```

পাঁচটাই কত byte লেখা হলো সেটা ফেরত দেয়।

- `write_bytes` আর `write` ফাইলটা "create" মোডে খোলে, খালি করে ফেলে, আর position
  0 থেকে লেখা শুরু করে। `write` একটা string নেয়; `write_bytes` `Bytes` নেয়। Text
  লেখার সময় সরাসরি string storage ব্যবহার হয়।
- `append_bytes` আর `append` ফাইলটা "append" মোডে খোলে আর খালি না করে `data`-কে
  শেষে যোগ করে।
- `copy` যেখানে পারে সেখানে প্ল্যাটফর্মের file-copy পথ ব্যবহার করে, নয়তো একটা
  fixed-size fallback। এটা পুরো সোর্স ফাইলকে কোনো Beans বাফারে ধরে রাখে না।
  একই-ফাইল বা hard-link কপি destination খালি হওয়ার আগেই ফেল করে।

```beans
import std.io
import std.fs

fn main() {
    fs.write("greeting.txt", "hello\n").expect("write")
    fs.append("greeting.txt", "again\n").expect("append")
    let text: string = fs.read("greeting.txt").expect("read")
    io.print(text)                          // hello / again
}
```

## আরও দেখুন

- [Files and mapping](/bn/reference/builtins/files/) — `File` type, যখন positional
  আর cursor I/O-র জন্য আরও সূক্ষ্ম নিয়ন্ত্রণ লাগে।
- [std.path](/bn/reference/stdlib/path/) — এখানে যে path স্ট্রিং পাঠানো হয়, সেগুলো
  তৈরি করা।
- [std.reader](/bn/reference/stdlib/reader/) — একবারে পুরোটা না পড়ে একটা ফাইল লাইন
  ধরে ধরে পড়া।
