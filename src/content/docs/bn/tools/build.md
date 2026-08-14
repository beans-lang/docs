---
title: Building
description: beansc build-এর option, --emit, release আর debug build, library build, আর C header।
---

`beansc build` Beans কোডকে LLVM আর Clang দিয়ে native binary বানায়। এটা ঠিক
**একটাই** entry file নেয়।

```bash
beansc build app.b -o app
```

Clang চালু হওয়ার আগে প্রতিটা setting যাচাই করা হয়, আর প্রতিটা tool সরাসরি চালানো হয় —
কখনো কোনো shell-এর ভেতর দিয়ে না।

## Option

| Option | কী করে |
| --- | --- |
| `--release` | Optimize করে: `-O3`, `NDEBUG`। |
| `--debug` | Optimize ছাড়া `-O0`, frame pointer রাখা, আর platform-এর debug info (DWARF/CodeView)। |
| `--lto` | Link-time optimization। `--debug` দিলে এটা বন্ধ থাকে। |
| `--target <triple>` | এই target-এর জন্য build করে। ডিফল্টে host। |
| `--cpu <generic\|native\|name>` | Target CPU। `native` শুধু host build-এর জন্য। |
| `--features <+f,-f,...>` | CPU feature চালু বা বন্ধ করে। |
| `--sysroot <path>` | Cross link-এর জন্য target sysroot। আগে থেকে থাকা একটা directory হতে হবে। |
| `--cc <path>` | C driver। ডিফল্ট `clang`। |
| `--linker <name>` | driver-কে `-fuse-ld=<name>` হিসেবে পাঠানো হয়। |
| `--ar <path>` | Static archive tool। ডিফল্ট `ar`। |
| `--header <path>` | Library export-এর জন্য একটা C header লেখে। শুধু `--emit static` বা `--emit shared`-এর সাথে চলে। |
| `-o <path>` | Output-এর path। |
| `--emit <bin\|obj\|static\|shared\|ir>` | কী বানাবে। ডিফল্ট `bin`। |
| `--runtime <full\|minimal\|freestanding>` | কতটুকু runtime রাখবে। |
| `--locked` | `beans.lock`-এর হুবহু entry থাকতেই হবে। |
| `--offline` | dependency-র জন্য network ব্যবহার করা যাবে না। |

`--release` আর `--debug` একসাথে দিলে সেটা error।

Target-সংক্রান্ত option (`--target`, `--cpu`, `--features`, `--sysroot`,
`--cc`, `--linker`, `--ar`, `--runtime`) নিয়ে পুরোটা আছে
[Cross-compile আর target](/bn/tools/targets/) পেজে। আর `--locked` আর `--offline`
নিয়ে আছে [Reproducible build](/bn/pot/reproducible/) পেজে।

## `--emit`

`--emit` দিয়ে output-এর ধরন ঠিক করা হয়:

| Value | Output |
| --- | --- |
| `bin` | একটা native executable (ডিফল্ট)। |
| `obj` | একটা object file। |
| `static` | একটা static library (`.a`)। |
| `shared` | একটা shared library (`.dylib` / `.so`)। |
| `ir` | LLVM IR। |

## Release আর debug

- `--release` দিলে `-O3` চালু হয় আর `NDEBUG` define হয়। Link-time optimization
  চাইলে সাথে `--lto` যোগ করুন।
- `--debug` দিলে optimize-ছাড়া একটা `-O0` binary পাও, যেটা frame pointer রাখে আর
  platform-এর debug info বয়ে নেয় (Unix-এ DWARF, Windows-এ CodeView)। এই debug
  info-টা C runtime-এর জন্য — native backtrace আর profiler-এর কাজে লাগে। এটা কিন্তু
  Beans কোডের source-level debugging **না**; সেটার জন্য দেখুন [Debugger
  (DAP)](/bn/tools/dap/)।

## Library build

[`beans.pot`](/bn/pot/manifest/)-এ `kind library` সেট করুন (library-তে কোনো `main`
থাকা যাবে না)। তারপর:

- `beansc build api.b` একটা static library বানায়, ডিফল্টে `build/libmath.a`।
- `--emit shared` দিলে তার বদলে একটা `.dylib` বা `.so` বানায়।
- `--header math.h` দিলে module-এর `pub extern "C"` export-গুলোর জন্য একটা C
  header লেখে। এটা শুধু `--emit static` বা `--emit shared`-এর সাথেই চলে।

```bash
beansc build api.b --emit shared --header math.h -o libmath.dylib
```

একটা single file-ও চলবে, শুধু explicit করে `--emit static` বা `--emit shared`
দিতে হবে আর কোনো `main` রাখা যাবে না।

মনে রাখতে হবে: Beans থেকে Beans library **source package**-ই থাকে, আর
[`beans.pot`](/bn/pot/manifest/) দিয়ে import হয়। static আর shared artifact হলো stable
**C ABI**-র পথ — অর্থাৎ C-কে একটা library ধরিয়ে দেওয়া, বা কোনো stable সীমানার ওপার
দিয়ে একটা library নেওয়া। দেখুন [FFI guide](/bn/guide/ffi/)।

## Cross compile আর cross link — পার্থক্যটা

একটা cross **compile**-এর জন্য target-এর কোনো library লাগে না: `--emit obj` আর
`--emit ir` sysroot ছাড়াই চলে। শুধু cross **link**-এর সময় — যখন অন্য target-এর
জন্য একটা linked binary বা shared library বানানো হচ্ছে — তখনই `--sysroot` লাগে। দেখুন
[Cross-compile আর target](/bn/tools/targets/)।
