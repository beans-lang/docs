---
title: bindgen
description: beansc bindgen দিয়ে C header থেকে Beans-এর C declaration বানানো, আর এটা কী কী bind করতে পারে আর পারে না।
---

`beansc bindgen` একটা C header-কে Beans-এর C declaration-এ বদলে দেয়। বেছে নেওয়া
target-এর জন্য এটা Clang-এর কাছ থেকে header-টার AST নেয় JSON হিসেবে, তারপর তার সাথে
মিলিয়ে Beans declaration বানায়। এতে Beans-এর [FFI](/bn/guide/ffi/) দিয়ে ওই C
library ব্যবহার করা যায়।

```bash
beansc bindgen sqlite3.h -o sqlite3.b
```

## Usage

```text
beansc bindgen <header.h> -o <bindings.b> [options] [-- clang-options]
```

`--`-এর পরে যা দেওয়া হয়, সেটা সরাসরি Clang-এ চলে যায় (যেমন include path আর define)।

## Option

| Option | মানে |
| --- | --- |
| `-o <path>` | Output file। **লাগবেই।** |
| `--target <triple>` | কোন target-এর জন্য বানাবে। |
| `--cpu <name>` | Target CPU। ডিফল্ট `generic`। |
| `--features <list>` | CPU feature। একাধিকবার দেওয়া যায়। |
| `--sysroot <path>` | Target sysroot। |
| `--cc <path>` | C driver। ডিফল্ট `clang`। |
| `--package <name>` | output-এর ওপরে একটা `package` clause লেখে। |
| `--only <name>` | শুধু নাম-করা declaration-গুলোর মধ্যে সীমিত রাখে। একাধিকবার দেওয়া যায়। |
| `--allow-unsupported` | fail করার বদলে প্রতিটা unsafe declaration (আর যা ওটার ওপর নির্ভর করে) বাদ দিয়ে দেয়। |
| `-- <clang-options>` | `--`-এর পরের সবকিছু Clang-এ যায়। |

```bash
beansc bindgen sqlite3.h -o sqlite3.b --package sqlite --only sqlite3_open --only sqlite3_close -- -I/usr/include
```

## কী কী bind করতে পারে

bindgen যা যা সামলায়: typedef, record (struct), union, array, enum, global,
thread-local storage, function, আর function pointer।

## যা এটা করে না

bindgen খুব কড়া: এটা আন্দাজে কিছু করে না। যে জিনিসটা হুবহু **exact** করে বানাতে
পারবে না, তার জন্য কোনো binding লেখে না:

- varargs
- bitfield
- flexible array
- anonymous record
- ডিফল্ট নয় এমন calling convention
- `_Atomic` member
- packed বা aligned record
- যেসব type-এর Beans-এ হুবহু মিল নেই: `long double`, 128-bit integer,
  `_Complex`, আর `_BitInt`

ডিফল্টে এদের একটার সাথে দেখা হলেই সেটা error। কিন্তু `--allow-unsupported` দিলে
bindgen তার বদলে প্রতিটা unsafe declaration আর যা ওটার ওপর নির্ভর করে সেগুলো বাদ
দিয়ে দেয়, আর কাজ চালিয়ে যায়।

## বাস্তবে কতটা কাজ করে

SQLite, zlib আর curl-এর মতো আসল library-র যে অংশগুলো সাপোর্ট করা, সেগুলোর জন্য
bindgen কাজে-লাগার মতো binding বানিয়ে দেয়।

উল্টো দিকটা — অর্থাৎ একটা Beans library থেকে C header বের করা — সেটা করে
[`beansc build`](/bn/tools/build/)-এর `--header` flag।
