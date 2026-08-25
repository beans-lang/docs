---
title: Standard library
description: Beans-এর স্ট্যান্ডার্ড লাইব্রেরি কী, কীভাবে এটা Beans-সোর্স প্যাকেজ আর নেটিভ মডিউলে ভাগ হয়, আর প্রতিটা প্যাকেজ পেজের ম্যাপ।
---

`import std.*` দিয়ে যেসব প্যাকেজ ব্যবহার করা হয়, সেগুলো মিলেই স্ট্যান্ডার্ড লাইব্রেরি।
এতে থাকে ফাইল, টেক্সট ফরম্যাটিং, math, collections-এর helper, structured logging,
encoding, networking, process, thread, time, randomness, আর নিচু-লেভেলের মেশিন অ্যাক্সেস।

একটা প্যাকেজ ইমপোর্ট করা হয় তার dotted নাম দিয়ে, আর ব্যবহার করা হয় তার শেষ নাম দিয়ে:

```beans
import std.io
import std.encoding.json

fn main() {
    io.println("hello")
    let value: json.Value = json.parse("[1, 2, 3]").expect("parse")
}
```

## দুই রকমের প্যাকেজ

লাইব্রেরিটা দুইটা স্তরে সাজানো।

- **Beans-সোর্স প্যাকেজ।** এগুলো Beans দিয়েই লেখা আর কম্পাইলারের সাথে
  `stdlib/std/<pkg>/<pkg>.b`-তে আসে। এদের কোড নিজে পড়া যায়। যেমন:
  `std.fmt` আছে
  [`stdlib/std/fmt/fmt.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/fmt/fmt.b)-তে,
  আর সাথে `std.collections`, `std.math`, `std.path`, `std.fs`, `std.log`, আর
  encoding প্যাকেজগুলো। কিছু Beans-সোর্স package OS বা third-party library-র
  কাজের জন্য native bridge ব্যবহার করে।
- **নেটিভ মডিউল।** এগুলো কম্পাইলার আর runtime-এর ভেতরেই বানানো, `stdlib/std/`-তে
  না। এগুলোই সেই অংশ যেগুলোকে সরাসরি operating system বা CPU-র সাথে কথা বলতে হয়:
  `std.io`, `std.os`, `std.thread`, `std.time`, `std.random`, `std.target`,
  `std.cpu`, `std.intrinsic`, আর `std.asm`।

কোড লেখার সময় কোন প্যাকেজ কোন স্তরে আছে, সেটা নিয়ে ভাবার দরকার নেই। এটা শুধু
তখনই দরকার হয় যখন সোর্স কোড খুঁজতে হয়।

## অবজেক্ট বানানোর একটাই নিয়ম

Beans-এ মডিউলের ভেতরে কোনো আলাদা "constructor function" নেই। যেটা কোনো অবজেক্ট
তৈরি করে, সেটা হয় সেই অবজেক্টের class-এর উপর একটা `new`, নয়তো সেই class-এর একটা
named static — কখনোই সাদামাটা কোনো মডিউল function না।

```beans
import std.net

fn main() {
    // a class instance: use new
    let addr: net.Address = new net.Address("localhost", 8080)
    // fallible construction: a named static returning Result
    let stream: Result<net.TcpStream> = net.TcpStream.connect("localhost", 8080)
}
```

তাই `new process.Command("ls")` একটা command তৈরি করে, আর `File.open(path, "r")`
একটা ফাইল খোলে (এটা ফেল করতে পারে, তাই এটা একটা named static যেটা `Result` ফেরত দেয়)।

## loader-কে অন্য কোনো root-এ পাঠানো

কম্পাইলার নিজে থেকেই স্ট্যান্ডার্ড লাইব্রেরি খুঁজে নেয়। কোথায় খুঁজবে সেটা বদলাতে
চাইলে `BEANS_STDLIB` environment variable-টা আরেকটা root directory-তে সেট করুন,
তখন loader সেখান থেকেই প্যাকেজ পড়বে।

## প্যাকেজ পেজগুলো

| প্যাকেজ | কী কাজ করে |
| --- | --- |
| [std.io and std.os](/bn/reference/stdlib/io-os/) | প্রিন্ট করা, ইনপুট পড়া, প্রোগ্রামের arguments, environment, exit |
| [std.collections](/bn/reference/stdlib/collections/) | `List` আর `Map`-এর উপর generic helper |
| [std.fmt](/bn/reference/stdlib/fmt/) | সংখ্যা আর টেক্সট ফরম্যাটিং |
| [std.math](/bn/reference/stdlib/math/) | ছোটখাটো numeric helper |
| [std.bytes](/bn/reference/stdlib/bytes/) | `Bytes`-এর উপর CRC-32 আর varint helper |
| [std.path](/bn/reference/stdlib/path/) | path স্ট্রিং নিয়ে হিসাব, filesystem ছাড়াই |
| [std.fs](/bn/reference/stdlib/fs/) | পুরো ফাইল পড়া আর লেখা |
| [std.reader](/bn/reference/stdlib/reader/) | একটা `File`-এর উপর buffered লাইন পড়া |
| [std.reflect](/bn/reference/stdlib/reflect/) | runtime type, member, annotation, checked field access আর call |
| [std.log](/bn/reference/stdlib/log/) | asynchronous structured log, file, rotation, NDJSON আর export sink |
| [std.encoding.json](/bn/reference/stdlib/json/) | JSON parse আর build করা |
| [std.encoding.xml](/bn/reference/stdlib/xml/) | XML parse আর build করা |
| [std.encoding.base64](/bn/reference/stdlib/base64/) | Base64 encode আর decode |
| [std.encoding.binary](/bn/reference/stdlib/binary/) | `Bytes`-এর উপর fixed-width integer আর varint |
| [std.net](/bn/reference/stdlib/net/) | TCP আর UDP socket |
| [std.process](/bn/reference/stdlib/process/) | অন্য প্রোগ্রাম চালানো, shell ছাড়াই |
| [std.poll](/bn/reference/stdlib/poll/) | একসাথে অনেক descriptor-এর জন্য অপেক্ষা করা |
| [std.signal](/bn/reference/stdlib/signal/) | OS signal-কে data হিসেবে পাওয়া |
| [std.dylib](/bn/reference/stdlib/dylib/) | run time-এ dynamic library খোলা |
| [std.thread](/bn/reference/stdlib/thread/) | OS thread-এ closure চালানো |
| [std.time and std.random](/bn/reference/stdlib/time-random/) | clock, sleep করা, আর secure random |
| [std.target](/bn/reference/stdlib/target/) | কম্পাইল টাইমে বেছে নেওয়া target সম্পর্কে তথ্য |
| [std.cpu and std.intrinsic](/bn/reference/stdlib/cpu-intrinsic/) | CPU-কে জিজ্ঞেস করা, আর নিচু-লেভেলের intrinsic |
| [std.asm](/bn/reference/stdlib/asm/) | সীমাবদ্ধ inline assembly |

## আরও দেখুন

- [Builtins](/bn/reference/builtins/) — যেসব type কম্পাইলার কোনো import ছাড়াই
  দিয়ে দেয়।
- [language guide](/bn/guide/errors/) — `Option`, `Result`, আর `?` কীভাবে কাজ করে,
  সেটা জানতে।
