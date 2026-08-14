---
title: std.io and std.os
description: প্রিন্ট করা, ইনপুট পড়া, প্রোগ্রামের arguments, environment variable, আর প্রোগ্রাম বন্ধ করা।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 11 package functions.
<!-- coverage:summary:end -->

এই দুইটা নেটিভ মডিউলই টার্মিনাল আর operating system-এর সাথে মূল যোগসূত্র।
`std.io` ইনপুট-আউটপুট সামলায়। `std.os` সামলায় arguments, environment, আর exit।
দুইটাই কম্পাইলার আর runtime-এর ভেতরে বানানো, তাই পড়ার মতো কোনো `stdlib/std/` সোর্স
নেই, আর এদের function-গুলো checker-এ typed হয় positional parameter দিয়ে যাদের কোনো
নাম নেই।

## std.io

```beans
import std.io
```

### প্রিন্ট করা

```beans
print(any)
println(any)
eprint(any)
eprintln(any)
```

`print` stdout-এ লেখে newline ছাড়া; `println` শেষে একটা newline যোগ করে। `eprint`
আর `eprintln` একই জিনিস, তবে stderr-এ লেখে। প্রতিটা যেকোনো type-এর একটা মাত্র value নেয়।

কী কী প্রিন্ট করা যায়:

- সংখ্যা, bool, আর string — যেমনটা আশা করা যায়;
- enum, দেখায় `variant` বা `variant(payload)` হিসেবে;
- list, দেখায় `[a, b, c]` হিসেবে।

Map, class instance, আর `Result` value প্রিন্ট হয় না। ওগুলো নিজে আগে ফরম্যাট করে নিতে হয়
(দেখুন [std.fmt](/bn/reference/stdlib/fmt/) আর string interpolation)।

<!-- beans:compile -->
```beans
import std.io

fn main() {
    io.println("count is {3}")     // count is 3
    io.println([1, 2, 3])          // [1, 2, 3]
    io.eprintln("something went wrong")
}
```

### ইনপুট পড়া

```beans
read_line() -> Option<string>
read_all() -> string
```

`read_line` stdin থেকে একটা লাইন পড়ে, আর ইনপুট শেষ হলে `none` ফেরত দেয়। `read_all`
পুরো stdin-কে একটা string হিসেবে পড়ে।

<!-- beans:compile -->
```beans
import std.io

fn main() {
    let line: Option<string> = io.read_line()
    match line {
        some(text) => io.println("you typed {text}"),
        none => {},
    }
}
```

## std.os

```beans
import std.os
```

```beans
args() -> List<string>
env(string) -> Option<string>
exit(int)
```

- `args()` প্রোগ্রামের arguments দেয়। `beansc run f.b -- a b` চালানো হলে
  arguments হলো `--`-এর পরের অংশগুলো (`a` আর `b`)। কম্পাইল করা native binary
  সরাসরি `argv` থেকে এগুলো পড়ে।
- `env(name)` `name` নামের environment variable-এর value ফেরত দেয়, আর সেট করা না
  থাকলে `none`।
- `exit(code)` প্রোগ্রামটাকে `code` exit code দিয়ে থামায়, আর কিছু ফেরত দেয় না।

<!-- beans:compile -->
```beans
import std.io
import std.os

fn main() {
    for arg in os.args() {
        io.println(arg)
    }
    let home: Option<string> = os.env("HOME")
    match home {
        some(path) => io.println("home is {path}"),
        none => {},
    }
    os.exit(0)
}
```

## C errno, hosted interop-এর জন্য

hosted target-এ যখন C কোড কল করা হয়, তখন `std.c`-এর দুইটা helper C-র
`errno` value পড়তে আর সেট করতে দেয়:

```beans
errno() -> i32
set_errno(i32)
```

- `errno()` এখনকার `errno` পড়ে।
- `set_errno(value)` এটা সেট করে।

এগুলো শুধু তখনই ব্যবহার করুন যখন C interop করা হচ্ছে আর কোনো C কল যে error রেখে গেছে
সেটা দেখা দরকার। দেখুন [FFI guide](/bn/guide/ffi/)।
