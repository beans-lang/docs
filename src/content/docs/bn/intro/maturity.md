---
title: Maturity and platforms
description: Beans এখন কতটা তৈরি, কী কী বানানো হয়ে গেছে, আর কোন কোন platform সাপোর্ট করে।
---

এই পেজে বলা আছে Beans এখন কোন অবস্থায় আছে — কী কাজ করে, কী এখনো প্রমাণ হচ্ছে, আর কোন
কোন platform সাপোর্ট করে।

## Beans এখন কোথায়

Beans এখন 1.0 stabilization লাইনে একটা preview। এই কথাটার প্রতিটা অংশের
আলাদা মানে আছে:

- **ভাষার contract `1.0` candidate।** Compatibility লক্ষ্য, কিন্তু 1.0-এর আগে
  পরিবর্তন হতে পারে। Compiler আর dependency pin করে রাখুন।
- **এই reference compiler `0.1.51`-এর source ধরে লেখা; এটা unreleased।** Source-এ
  fix থাকলেই package প্রকাশ বা কোনো ব্যবহারকারীর কাজ শেষ হওয়া প্রমাণ হয় না।
- **Runtime ABI `22`।**

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
- **একটা reference interpreter** — behavioral suite-এ native execution-এর সাথে
  তুলনা করা হয়। Backend-এর সীমা আর বাদ পড়া platform check আলাদাভাবে দেখতে হবে।
- **Concurrency।** `brew` দিয়ে fiber, OS thread, typed atomic, mutex, channel,
  আর readiness wait।
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

ত্রিশটা target register করা আছে। শেষ প্রকাশিত release-এর ২৬টা host package/install
gate pass করেছে; এতে প্রতিটা library বা application-এর platform support প্রমাণ হয় না।
Compiler-এর [issue আর release audit](https://github.com/beans-lang/beans/blob/main/docs/BUGFIX_TODO.md)-এ
প্রকাশিত release-এর evidence আছে।

## প্রথম dependability pilot

macOS ARM64 আর Linux x86_64 (GNU)-তে ছোট command-line data tool দিয়ে শুরু করুন।
এই দুই platform-এ SQLite-এর local check interpreter আর native দুটোতেই পাস করেছে।
সম্ভাব্য ব্যবহারকারীর কাজের সঙ্গে platform মেলে কি না যাচাই করুন; এই check হলো
local evidence, ব্যবহারকারীর acceptance নয়।
Standard library আর existing SQLite package দিয়ে record পড়ুন, validate আর
transform করুন, persist করুন, তারপর interpreter আর native report মিলিয়ে দেখুন।
প্রতিটা dependency-র নিজস্ব platform আর failure check দরকার।

[Contributor pilot checklist](https://github.com/beans-lang/beans/blob/main/CONTRIBUTING.md#dependability-pilot)-এ
setup, malformed input, duplicate, write failure, locked/offline build আর আবার চালানোর
check আছে। পাঁচজন সম্ভাব্য ব্যবহারকারীর interview-এর প্রশ্নও আছে। Interview, নিয়মিত
ব্যবহারকারী, দুটো সফল upgrade আর দীর্ঘ সময় service চালানোর evidence compiler gate
দেয় না। স্বাধীন project থেকে সেই evidence পাওয়ার পর scope বাড়ান।

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

এগুলোর preview build বা execution gate আছে। এগুলো ২৬টা host installer archive-এর
অংশ না, আর production support দাবি করা হচ্ছে না:

- WebAssembly
- Bare-metal Cortex-M4 (`thumbv7em-none-eabi`)
- Bare-metal RV32 (`riscv32-unknown-none-elf`)

ভাষা, compiler আর ABI-এর version number-গুলো একে অপরের সাথে কীভাবে জড়িত, সেটা দেখুন
[Versioning](/bn/project/versioning/)-এ। Preview-টা চালিয়ে দেখতে চাইলে
[Beans install করুন](/bn/start/install/)।
