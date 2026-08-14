---
title: The beansc command
description: beansc-এর usage ব্লক, পুরো subcommand-এর লিস্ট, আর যেসব environment variable এটা মানে।
---

`beansc` হলো Beans-এর compiler আর তার command-line tool। এটাই কোড lex করে,
parse করে, check করে, run করে, আর build করে। সাথে package manager, language server
আর debug adapter — সবই এর ভেতরে আছে। শুরুর পয়েন্ট হলো
[`compiler/beans/main.b`](https://github.com/beans-lang/beans/blob/main/compiler/beans/main.b),
আর সেটা চালায়
[`compiler/beans/driver.b`](https://github.com/beans-lang/beans/blob/main/compiler/beans/driver.b)।

## Usage

```text
usage: beansc <lex|parse|check|mir|run> <file.b>...
       beansc build [options] <file.b> [-o out]
       beansc bindgen <header.h> -o <bindings.b> [options] [-- clang-options]
       beansc pot <tidy|update [dependency]>
       beansc upgrade
       beansc doctor
       beansc lsp-probe <file.b>:<line>:<col>
       beansc lsp   (language server on stdio)
       beansc --version

build options:
  --release              -O3, NDEBUG
  --lto                  link-time optimization
  --target <triple>      <supported target names>
  --cpu <generic|native|name>
  --features <+f,-f,...> enable or disable CPU features
  --sysroot <path>       target sysroot for a cross link
  --cc <path>            C driver to use (default clang)
  --linker <name>        pass -fuse-ld=<name>
  --ar <path>            static archive tool (default ar)
  --header <path>        write a C header for library exports
  --emit <bin|obj|static|shared|ir>
  --runtime <full|minimal|freestanding>
                         how much runtime; anything a profile
                         drops is refused at check time
  --locked               require exact beans.lock entries
  --offline              forbid dependency network access
```

## Subcommand

| কমান্ড | কী করে |
| --- | --- |
| `beansc --version` | compiler, language, আর runtime ABI-এর version ছাপায়। |
| `beansc doctor` | এই install দিয়ে কী কী build করা যাবে, আর যা যায় না সেটা কীভাবে ঠিক করা যায় — সব বলে দেয়। সবসময় 0 দিয়ে exit করে। |
| `beansc lex <file.b>...` | token stream-টা ঢেলে দেখায়। |
| `beansc parse <file.b>...` | parse করে AST ছাপায়। |
| `beansc check <file.b>` | type-check করে। ঠিক থাকলে `<file>: ok`, না হলে error। কোনো error হলেই exit 1। |
| `beansc mir <file.b>` | check-করা, ownership-plan-করা MIR ছাপায়। |
| `beansc llvm <file.b>` | native build যে LLVM IR ব্যবহার করে সেটা ছাপায়। |
| `beansc run <file.b> [-- args...]` | আগে check করে, তারপর reference interpreter-এ চালায়। |
| `beansc build [options] <file.b> [-o out]` | LLVM/Clang দিয়ে native binary বানায়। |
| `beansc target <triple>` | একটা target-এর layout আর capability-এর তথ্য ছাপায়। |
| `beansc bindgen <header.h> -o <bindings.b> [options] [-- clang-options]` | Clang দিয়ে Beans-এর C declaration বানিয়ে দেয়। |
| `beansc pot tidy` | কোন কোন dependency সত্যিই ব্যবহার হচ্ছে সেটা মিলিয়ে `beans.lock` লেখে। |
| `beansc pot update [dependency]` | lock-করা সব dependency নতুন করে আনে, নাম দিলে শুধু ওই একটা। |
| `beansc upgrade` | এই Beans install-টাকে সবশেষ release-এ তুলে দেয়। |
| `beansc lsp` | stdio-তে language server চালায়। |
| `beansc debug-adapter` | stdio-তে debug adapter (DAP) চালায়। |

আলাদা আলাদা জায়গার পেজ:

- [Build করা](/bn/tools/build/): `beansc build`, `--emit`, release আর library build।
- [Check আর run](/bn/tools/check-run/): `check`, `run`, আর `lex`/`parse`/`mir`/`llvm` — এই দেখার কমান্ডগুলো।
- [Cross-compile আর target](/bn/tools/targets/): `--target` আর তার সঙ্গীরা, `beansc target`, runtime profile।
- [bindgen](/bn/tools/bindgen/): C binding বানানো।
- [Language server (LSP)](/bn/tools/lsp/): `beansc lsp` আর `lsp-probe`।
- [Debugger (DAP)](/bn/tools/dap/): `beansc debug-adapter`।
- [doctor আর upgrade](/bn/tools/doctor-upgrade/)।
- [Exit code আর সমস্যা সমাধান](/bn/tools/exit-codes/)।
- [pot কমান্ডের রেফারেন্স](/bn/pot/commands/)।

## Environment variable

`beansc` এই environment variable-গুলো মানে:

| Variable | কী ঠিক করে |
| --- | --- |
| `BEANS_HOME` | Install-এর root, আর `upgrade` যে prefix-এ লেখে সেটা। |
| `BEANS_STDLIB` | Standard library-র root। |
| `BEANS_RUNTIME` | C runtime-এর source। |
| `BEANS_WASM_HOST` | WebAssembly host-এর source। |
| `BEANS_ENCODING` | Encoding bridge-এর source। |
| `BEANS_CC` | কোন C driver ব্যবহার হবে। |
| `BEANS_WASM_CC` | WebAssembly-র জন্য C driver। |
| `BEANS_AR` | Static archive tool। |
| `BEANS_CPU_FEATURES` | একটা allowlist — এটা শুধু detect-করা CPU feature লুকাতে পারে, নতুন কিছু যোগ করতে পারে না। |
| `PATH` | `clang` আর linker-এর মতো tool খুঁজে পেতে ব্যবহার হয়। |

## যা এখানে নেই

কোনো **formatter নেই** (`beansc fmt` বলে কিছু নেই, আলাদা কোনো formatter tool-ও নেই)
আর কোনো **`beansc test`** subcommand নেই। দেখুন [Exit code আর সমস্যা
সমাধান](/bn/tools/exit-codes/)।
