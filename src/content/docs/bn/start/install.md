---
title: Install Beans
description: macOS, Linux বা Windows-এ এক লাইনের ইনস্টলার দিয়ে beansc টুলচেইন বসানো।
---

Beans আসে একটাই টুল হয়ে, `beansc`। প্রতিটা প্ল্যাটফর্মের জন্য এক লাইনের
ইনস্টলার আছে। admin/root লাগে না, আর সব বসে হোম ডিরেক্টরির ভেতরে।

## এক লাইনে ইনস্টল

### macOS আর Linux

```bash
curl -fsSL https://github.com/beans-lang/beans/releases/latest/download/beans-install.sh | sh
```

### Windows (PowerShell)

```bash
irm https://github.com/beans-lang/beans/releases/latest/download/beans-install.ps1 | iex
```

তারপর একটা **নতুন** টার্মিনাল খুলুন (যাতে আপডেট হওয়া PATH ধরা পড়ে), আর যাচাই করুন:

```bash
beansc --version
beansc doctor
```

## ইনস্টলার যা করে

ইনস্টলার:

- OS, CPU আর C library (libc) কী, সেটা বের করে,
- মেশিনের জন্য ঠিক প্যাকেজটা বাছে,
- আনপ্যাক করার **আগে** তার SHA-256 checksum মিলিয়ে দেখে,
- হোম ডিরেক্টরির ভেতরে বসায়, `sudo` বা admin কিছু লাগে না, আর
- `bin` ফোল্ডারটা PATH-এ যোগ করে দেয়।

আবার চালালেও সমস্যা নেই। ডাউনলোড কোনো কারণে ফেল করলে আগের ইনস্টলটা যেমন ছিল
তেমনই থাকে।

## কোথায় ইনস্টল হয়

ডিফল্ট জায়গা:

| প্ল্যাটফর্ম | ডিফল্ট জায়গা |
| --- | --- |
| macOS / Linux | `$HOME/.beans` |
| Windows | `%LOCALAPPDATA%\Beans` |

জায়গাটা বদলাতে চাইলে `BEANS_HOME` environment variable বা `--prefix` অপশন
ব্যবহার করুন।

ইনস্টল ডিরেক্টরির ভেতরে যা যা থাকে:

```text
bin/         beansc launcher, compiler, আর runtime C সোর্স
lib/std/     স্ট্যান্ডার্ড লাইব্রেরি
lib/encoding/  std.encoding ব্রিজ আর তার vendored সোর্স
libexec/     `beansc upgrade` যে checked ইনস্টলার ব্যবহার করে
toolchain/   বান্ডল করা Clang, LLD আর llvm-ar (খালি full প্যাকেজে)
VERSION      যে ভার্সন ইনস্টল হয়েছে
```

লেআউটটা fixed, আর ইনস্টল করার পর পুরো ফোল্ডারটা অন্য জায়গায় সরানো যায় —
ভেতরের সব পাথ launcher-এর সাপেক্ষে হিসাব হয়।

## Full আর slim প্যাকেজ

ইনস্টলার দুই ধরনের প্যাকেজের একটা বাছে:

- **Full** প্যাকেজে Clang, LLD আর `llvm-ar` বান্ডল করা থাকে, তাই native build-এর
  জন্য বাড়তি কিছু লাগে না। এগুলো আসে Linux x86-64 আর ARM64 (GNU), আর Windows
  x64, ARM64 আর x86 (LLVM-MinGW)-এর জন্য।
- **Slim** প্যাকেজ আসে বাকি সব জায়গায়। slim প্যাকেজ দিয়ে `--version`, `doctor`,
  `check`, `run`, `llvm`, আর `build --emit ir` — সব কিছু কোনো কিছু ইনস্টল ছাড়াই
  চলে। শুধু **native** `build` করতে হলে PATH-এ একটা C compiler (Clang) লাগবে।

দুইটা কথা মনে রাখুন:

- **macOS:** native build করতে Apple-এর Command Line Tools লাগে।
  `xcode-select --install` দিয়ে বসান। `check` আর `run` এগুলো ছাড়াও চলে।
- **Git** শুধু তখনই লাগবে যখন Git package dependency টানা হবে।

C++ bootstrap compiler, `beansc0`, কখনো ইনস্টল হয় না। ওটা লাগবে না।

## ভার্সন, জায়গা বা target বেছে নেওয়া

ইনস্টলারকে অপশন দিতে হলে `-s --`-এর পরে দিন:

```bash
curl -fsSL https://github.com/beans-lang/beans/releases/latest/download/beans-install.sh | sh -s -- --version 0.1.17 --prefix /opt/beans
```

কোন build target হবে সেটা `BEANS_TARGET` environment variable দিয়ে ঠিক করুন:

```bash
BEANS_TARGET=x86_64-unknown-linux-musl curl -fsSL https://github.com/beans-lang/beans/releases/latest/download/beans-install.sh | sh
```

আরও কিছু ইনস্টলার অপশন:

- `--force`: একটা ভার্সন থাকলেও আবার ইনস্টল করে।
- `--no-modify-path`: PATH-এ হাত না দিয়ে ইনস্টল করে।
- `--help`: সব অপশন দেখায়।

## Uninstall করা

আলাদা কোনো uninstaller নেই। ইনস্টল ফোল্ডারটা মুছে দিন, আর ইনস্টলার যে PATH
লাইনটা যোগ করেছিল সেটা সরিয়ে দিন।

## সোর্স থেকে ইনস্টল

নিজে compiler বিল্ড করতে চাইলে:

1. আগে একটা release compiler বসান (উপরের এক-লাইনার দিয়ে)। self-hosted compiler
   বিল্ড করতে একটা চালু `beansc` লাগে।
2. Clone করে বিল্ড করুন:

```bash
git clone https://github.com/beans-lang/beans.git
cd beans
make
./build/beansc --version
```

Beans বসানো হয়ে গেলে, [ইনস্টল যাচাই করুন](/bn/start/verify/) আর তারপর [প্রথম
প্রোগ্রাম লিখুন](/bn/start/hello-world/)। পরে নতুন release-এ যেতে চাইলে দেখুন
[beansc আপগ্রেড](/bn/start/upgrade/)।
