---
title: Cross-compiling and targets
description: target বেছে নেওয়া, cross-build-এর option, runtime profile, আর যেসব target সাপোর্ট করে।
---

[`beansc build`](/bn/tools/build/) একবারে ঠিক একটা target-এর জন্য compile করে। ডিফল্টে
সেটা host। অন্য target-এর জন্য `--target` ব্যবহার করা হয়, আর নিচের CPU, sysroot আর
runtime option দিয়ে build-টাকে প্রয়োজনমতো সাজানো যায়।

## Target বেছে নেওয়া

```bash
beansc build app.b --target x86_64-unknown-linux-gnu -o app
```

মোট ৩০টা triple registered আছে। চেনা কিছু বিকল্প বানানও এদের কোনো একটার সাথে মিলে
যায়, যেমন `aarch64-apple-darwin` আর `riscv64gc-unknown-linux-musl`।

কোনো একটা target-এর তথ্য দেখতে চাইলে:

```bash
beansc target x86_64-unknown-linux-gnu
```

`beansc target <triple>` ওই target-এর layout আর capability-এর তথ্য ছাপায়।

## Cross-build-এর option

| Option | মানে |
| --- | --- |
| `--target <triple>` | কোন target-এর জন্য build হবে। ডিফল্টে host। |
| `--cpu <generic\|native\|name>` | Target CPU। `native` শুধু host build-এর জন্য। |
| `--features <+f,-f,...>` | CPU feature চালু বা বন্ধ করে। |
| `--sysroot <path>` | Cross link-এর জন্য target sysroot। থাকতেই হবে। |
| `--cc <path>` | C driver। ডিফল্ট `clang`। |
| `--linker <name>` | `-fuse-ld=<name>` হিসেবে পাঠানো হয়। |
| `--ar <path>` | Static archive tool। ডিফল্ট `ar`। |

## Compile আর link

একটা cross **compile**-এর জন্য target-এর কোনো library লাগে না: `--emit obj` আর
`--emit ir` sysroot ছাড়াই চলে। শুধু cross **link**-এর সময় — যখন অন্য target-এর
জন্য একটা তৈরি binary বা shared library বানানো হচ্ছে — তখনই `--sysroot` লাগে। Clang
চালু হওয়ার আগে প্রতিটা setting যাচাই করা হয়, আর tool-গুলো সরাসরি চালানো হয়, কখনো কোনো
shell-এর ভেতর দিয়ে না।

## Runtime profile

`--runtime` দিয়ে ঠিক করা হয় build-এ কতটুকু runtime ঢুকবে। কোনো profile-এ যে
capability বাদ পড়ে, সেটা **check**-এর সময়েই নাম ধরে আটকে দেওয়া হয় — link-এর
সময় নয়, অনেক আগেই টের পাওয়া যায়।

| Profile | কী পাও |
| --- | --- |
| `full` (ডিফল্ট) | সবকিছু। |
| `minimal` | libc আছে, কিন্তু কোনো OS service নেই। filesystem, socket, poller, process, signal, shared memory আর dylib বাদ পড়ে। |
| `freestanding` | কোনো OS-ই নেই। এর সাথে thread, clock, random আর environment-ও বাদ পড়ে। |

যে target-এ কোনো OS নেই, তার জন্য `--runtime freestanding` লাগবেই।

```bash
beansc build blink.b --target thumbv7em-none-eabi --runtime freestanding -o blink
```

## যেসব target সাপোর্ট করে

registered ৩০টা triple-এর মধ্যে আছে:

- **macOS:** `arm64-apple-darwin`।
- **Linux GNU:** `x86_64`, `aarch64`, `riscv64`, `i686`, `armv7`, `arm`,
  `loongarch64`, `powerpc64le`, `powerpc`, `powerpc64`, `s390x`।
- **Linux musl:** `x86_64`, `aarch64`, `riscv64`, `loongarch64`, `powerpc64le`,
  `powerpc64`।
- **Windows (সাতটা ABI):** `x86_64-pc-windows-gnu`, `i686-pc-windows-gnu`,
  `x86_64-pc-windows-gnullvm`, `aarch64-pc-windows-gnullvm`,
  `x86_64-pc-windows-msvc`, `i686-pc-windows-msvc`, `aarch64-pc-windows-msvc`।
- **WebAssembly:** `wasm32-wasip1`, `wasm32-unknown-unknown`।
- **Bare metal:** `thumbv7em-none-eabi`, `riscv32-unknown-none-elf`।

WebAssembly আর bare-metal দুটো target **preview** পর্যায়ে আছে।

## Full আর slim package

Beans-এর install package দুই রকমের হয়:

- **Full package**-এ Clang, LLD আর llvm-ar একসাথে বাঁধা থাকে। এগুলো আসে Linux
  x86-64 আর ARM64 GNU, আর Windows x64, ARM64 আর x86 (LLVM-MinGW)-এর জন্য। এতে
  native build করতে আলাদা কোনো tool লাগে না।
- **Slim package** বাকি সব জায়গার জন্য। তখন native build করতে `PATH`-এ Clang
  থাকতে হবে।

install-এ কোন কোন tool ইতিমধ্যে আছে সেটা দেখতে
[`beansc doctor`](/bn/tools/doctor-upgrade/) চালান।

Native 1.0-এর জন্য যে CI host-গুলো লাগবেই সেগুলো হলো macOS arm64, Linux x86-64
GNU, আর Linux arm64 GNU। দেখুন [পরিপক্বতা আর platform](/bn/intro/maturity/)।
