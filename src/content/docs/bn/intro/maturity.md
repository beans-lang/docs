---
title: Maturity and platforms
description: Beans এখন কতটা তৈরি, কী কী বানানো হয়ে গেছে, আর কোন কোন platform সাপোর্ট করে।
---

এই পেজে বলা আছে Beans এখন কোন অবস্থায় আছে — কী কাজ করে, কী এখনো প্রমাণ হচ্ছে, আর কোন
কোন platform সাপোর্ট করে।

## Beans এখন কোথায়

Beans এখন 1.0 stabilization লাইনে একটা production preview। এই কথাটার প্রতিটা অংশের
আলাদা মানে আছে:

- **ভাষার contract `1.0`-এ আটকানো।** যে syntax আর semantics-এর উপর কোড লেখা হয়, সেটা
  পাকা হয়ে গেছে। এখন যে কোড লেখা হবে সেটা পরেও চলবে, এটাই লক্ষ্য।
- **সর্বশেষ compiler release `0.1.27`।** ভাষা `1.0`, কিন্তু যে tool সেটা বানায় সেটা এখনো
  মিলে যাওয়া release number-এর দিকে যাচ্ছে।
- **Runtime ABI `7`।**

এটা একটা preview, পুরো 1.0 না। ব্যবহার করা যায়, কিন্তু পুরো 1.0 release-এর আগে এখনো কিছু
কাজ বাকি — নিচে দেওয়া আছে।

## কী কী বানানো হয়ে গেছে

নিচের যা যা আছে, সবই এখন কাজ করে:

- **একটা self-hosted compiler।** `beansc` নিজেই Beans-এ লেখা। এর stage 2 আর stage 3 build
  byte-এ byte এক — এটাই প্রমাণ যে compiler নিজেকে হুবহু তৈরি করতে পারে।
- **পুরো একটা front end।** Whole-program loader আর resolver, একটা generic checker, typed
  custom annotation আর reflection, private/static/singleton/abstract object ফিচার, একটা
  high-level IR (HIR), আর ownership যাচাই করা একটা checked mid-level IR (MIR)।
- **একটা native backend।** MIR থেকে LLVM-এ compile হয় debug, release আর LTO build-এর জন্য,
  সাথে automatic reference counting আর একটা cycle collector।
- **একটা reference interpreter** — যার আচরণ native backend-এর সাথে হুবহু এক।
- **Concurrency।** OS thread, typed atomic, mutex, channel, structured `async`/`await`, আর
  readiness wait।
- **Package management।** Canonical package identity, hash করা একটা `beans.lock`, locked আর
  offline build, আর একটা Git cache।
- **পুরো C interop।** Import, export, header, bindgen, record, union, global, thread-local
  storage, `errno`, আর callback।
- **Editor আর debugger সাপোর্ট।** একটা semantic LSP আর একটা interpreter DAP।
- **Systems access।** File, memory mapping, process, socket, DNS, polling, signal, shared
  memory, dynamic library, SIMD, আর intrinsic। Project-এর 100-point systems-access
  scorecard-এর প্রতিটা জিনিস বানানো হয়ে গেছে।
- **Typed encoding।** Generated JSON আর XML decoder সরাসরি nested struct, list আর option
  লেখে — compile-time-এ mapping check হয়, আর XML namespace URI মিলিয়ে দেখা হয়।

ত্রিশটা target register করা আছে, আর বেশিরভাগই prebuilt release package হিসেবে আসে।

## 1.0-এর আগে এখনো যা যা বাকি

Beans এখনো নিজেকে production-ready 1.0 বলছে না। এই কাজগুলো এখনো বাকি:

- Benchmark suite-এর সাথে পরিষ্কার performance baseline।
- একটা 24-ঘণ্টার fuzz campaign।
- ৩০ দিন পরিষ্কার একটা public beta, তারপর ১৪ দিন পরিষ্কার একটা release candidate।
- কোনো open critical বা high correctness bug না থাকা।

এগুলো শেষ হলে preview-টা পুরো release হয়ে যাবে।

## যেসব platform সাপোর্ট করে

### দরকারি native 1.0 CI host

এই তিনটা platform-এ 1.0 release অবশ্যই build হতে আর pass করতে হবে, আর এগুলোই সবচেয়ে বেশি
test করা:

- macOS arm64
- Linux x86-64 (GNU)
- Linux arm64 (GNU)

### Preview target

এগুলো build হয় আর ship-ও করা হয়, কিন্তু পুরো প্রমাণিত না বলে preview হিসেবে চিহ্নিত:

- WebAssembly
- Bare-metal Cortex-M4 (`thumbv7em-none-eabi`)
- Bare-metal RV32 (`riscv32-unknown-none-elf`)

ভাষা, compiler আর ABI-এর version number-গুলো একে অপরের সাথে কীভাবে জড়িত, সেটা দেখুন
[Versioning](/bn/project/versioning/)-এ। Preview-টা চালিয়ে দেখতে চাইলে
[Beans install করুন](/bn/start/install/)।
