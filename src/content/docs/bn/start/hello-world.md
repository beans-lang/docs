---
title: Hello world
description: এক-file-এর একটা Beans program লেখা, তারপর সেটা check, run আর build করা।
---

এই পেজে প্রথম Beans program-টা একদম খালি file থেকে শুরু করে native binary পর্যন্ত
নিয়ে যাওয়া হবে।

## program-টা লেখা

এটা `hello.b` নামে save করুন:

<!-- beans:compile -->
```beans
import std.io

fn main() {
    let name: string = "beans"
    io.println("hello from {name}")
}
```

কয়েকটা জিনিস খেয়াল করুন:

- `import std.io` standard I/O package টেনে আনে। `io.println` ওখানেই থাকে।
- `fn main()` হলো যেখান থেকে program শুরু হয়।
- `let name: string = "beans"` একটা value declare করে। `let` বলে দেয় এটা আর বদলাবে না।
  type-টা, `string`, লেখা আছে। Beans নিজে থেকে সেটা ধরে নেয় না।
- `"hello from {name}"` একটা interpolated string। `{name}`-এর জায়গায় `name`-এর value
  বসে যায়।

## check করা

program-টা না চালিয়েই type-check করুন:

```bash
beansc check hello.b
```

```text
hello.b: ok
```

`check` type error আর অন্য ভুলগুলো দ্রুত ধরে ফেলে। এটা কিছু চালায় না।

## চালানো

কোনো build step ছাড়াই program-টা reference interpreter-এ চালান:

```bash
beansc run hello.b
```

```text
hello from beans
```

কাজ করতে করতে output দেখার সবচেয়ে দ্রুত উপায় হলো `run`।

## একটা native binary build করা

LLVM দিয়ে একটা সত্যিকারের executable-এ compile করুন:

```bash
beansc build hello.b -o hello
./hello
```

```text
hello from beans
```

interpreter (`run`) আর native binary (`build`) একই output দেয়। দুই backend-ই হুবহু একরকম
আচরণ করে।

## একটা optimized binary build করা

Release build-এর জন্য optimization, link-time optimization আর নিজের CPU-এর জন্য
tuning চালু করুন:

```bash
beansc build --release --lto --cpu native hello.b -o hello
```

## যে উদাহরণটা compile হয় না

Beans-এ return type আছে এমন কোনো function-কে প্রতিটা পথেই return করতে হবে। এই program-টা
**ইচ্ছা করেই ভুল**। docs-এর example checker নিশ্চিত করে যে এটা compile হতে ব্যর্থ হয়:

<!-- beans:expect-error -->
```beans
fn total() -> int {
    var sum: int = 0
    sum          // a trailing expression is discarded, not returned
}
```

```text
error: 'total' must return int — the body can finish without a return
```

ঠিক করার উপায় হলো `return sum` লেখা। দেখুন [Function আর closure](/bn/guide/functions/)।

এক file পার হয়ে বড় হতে চাইলে [একটা project তৈরি করুন](/bn/start/projects/)। এখানে ব্যবহার করা
command-গুলো নিয়ে আরও জানতে দেখুন [Check আর run](/bn/tools/check-run/) আর
[Build](/bn/tools/build/)।
