---
title: The beans.pot manifest
description: beans.pot project manifest-এর field গুলো আর তার লাইন-ভিত্তিক syntax।
---

`beans.pot` হলো একটা Beans module-এর রুটে বসে থাকা manifest ফাইল। এটা module-এর
নাম রাখে, বলে দেয় module-টা application না library, Git dependency গুলো pin করে,
আর native linker-এর জন্য দরকারি directive পাস করে। এটা parse হয়
[`src/module.b`](https://github.com/beans-lang/beans/blob/main/src/module.b)-তে।

## Syntax

manifest পুরোটাই **লাইন-ভিত্তিক**। এটা TOML নয়, JSON-ও নয়। প্রতিটা লাইন একটা
করে directive। খালি লাইন গুলো ধরাই হয় না। আর `//` দিয়ে শুরু হওয়া লাইন হলো
comment, সেটাও বাদ যায়।

সবচেয়ে ছোট আসল manifest মাত্র এক লাইনের। example project-টা যে `beans.pot` নিয়ে
আসে, সেটা শুধু এটুকুই:

```beans-pot
module shop
```

compiler-এর নিজের manifest আরো ছোট — শুধু `module compiler`।

বর্তমান directory-তে ছোট manifest বানাতে
`beansc pot init <module-name>` চালান। আগে থেকে manifest থাকলে command সেটা
overwrite করে না।

## Field গুলো

### `module <name>` (লাগবেই)

module-এর নাম রাখে। ঠিক একটা `module` লাইন থাকতেই হবে। এই নামটাই হলো
**module path**: এই রুটটার সাথেই local package আর lock file ঝুলে থাকে।

```beans-pot
module shop
```

### `kind application` বা `kind library` (ইচ্ছা করলে)

module-টা কী বানাচ্ছে সেটা বলে। কিছু না লিখলে ধরে নেয় `application`।

- `kind application`: module-এ একটা `fn main()` লাগবে।
- `kind library`: module-এ `main` থাকা **যাবে না**।

```beans-pot
module shop
kind application
```

একটা library build কীভাবে একটা `.a`, একটা `.dylib`/`.so`, আর ইচ্ছা করলে একটা C
header বানায় — সেটা দেখুন [Building](/bn/tools/build/)-এ।

### `require <host/owner/repo> <ref>` (যতবার খুশি)

একটা করে Git dependency pin করে। path হলো Git host-এর path; ref হলো একটা tag,
branch, বা commit-এর মতো কোনো reference।

```beans-pot
require github.com/acme/http v1.2
```

একই path দুইটা আলাদা ref-এ pin করলে সেটা error। এর পুরো বিস্তারিত, আর এটা
`beans.lock`-এ কীভাবে যায় — সব আছে [Dependencies আর lock
file](/bn/pot/dependencies/)-এ।

### `link <selector> <search|library|framework> "<value>"` (যতবার খুশি)

C library-র সাথে link করা module-এর জন্য একটা native linker directive পাস করে।

- `selector` হতে পারে `all`, একটা OS-এর নাম (যেমন `macos`, `linux`, `windows`),
  বা একটা পুরো target triple (যেমন `x86_64-unknown-linux-gnu`)।
- kind এর যেকোনো একটা:
  - `search`: একটা library search directory। Search path গুলো **`beans.pot`
    ফাইলের সাপেক্ষে relative**।
  - `library`: link করার একটা library (নাম দিয়ে)।
  - `framework`: link করার একটা framework (macOS)।
- value হলো quote-এর ভেতর একটা string।

যে order-এ লেখা হবে, linker-এও ঠিক সেই order-এই entry গুলো যাবে।

### `csrc <selector> "<file.c>"` (যতবার খুশি)

package-এর নিজের একটা C source file declare করে। toolchain-ই সেটা compile
করে, তাই C-wrap করা library-কে prebuilt binary vendor করতে হয় না, consumer-এর
ঘাড়ে কোনো বাইরের build step-ও চাপে না — `import github.com/owner/lib` এমনিই
কাজ করে।

- selector `link`-এর মতোই: `all`, একটা OS-এর নাম, বা একটা পুরো triple।
- path-টা যে `beans.pot` declare করছে তার সাপেক্ষে relative, আর file-টা
  থাকতেই হবে — না থাকলে সেটা manifest error।
- native build বাছাই হওয়া প্রতিটা file নিজের Clang আর নিজের flag দিয়ে compile
  করে একটা content-hash-cached object বানায়, আর সেটা প্রতিটা emit path-এ
  চড়ে: binary আর shared object-এ link হয়, `--emit static`-এ archive হয়,
  `--emit obj`-এর output-এর পাশে বসে।
- `beansc run` বাছাই হওয়া set-টা একবারে একটা host shared library-তে compile
  করে, cache রাখে `$BEANS_HOME/cache/csrc`-এ, আর `extern "C"` symbol সেটা
  দিয়েই resolve করে। Host target-এর `link ... search`, `library`, আর
  `framework` row-ও এই link-এ যায়, তাই run mode আর native build একই dependency
  resolve করে। selected link row cache key-এর অংশ।
- quote করা `#include "..."` header প্রতিটা source-এর পাশেই resolve হয়।
- row গুলো local আর Git dependency থেকে ঠিক `link` row-এর মতোই propagate করে।

## একটু বড় একটা উদাহরণ

```beans-pot
module shop
kind application
require github.com/acme/http v1.2
link all search "native/lib"
link all library "shop_native"
link macos framework "CoreFoundation"
link x86_64-unknown-linux-gnu library "platform_helper"
csrc all "native/shim.c"
```

এই module-টা একটা application, একটা Git dependency টেনে আনে, `native/lib`-এর
নিচে ship করা একটা native library link করে — তার সাথে একটা macOS framework আর
শুধু Linux-এর জন্য একটা helper — আর প্রতিটা target-এ নিজের C shim নিজেই
compile করে।

`require` কীভাবে `beans.lock`-এ যায় সেটা দেখুন [Dependencies আর lock
file](/bn/pot/dependencies/)-এ, আর `link` কীভাবে C interop-এর সাথে খাপ খায় সেটা
দেখুন [FFI guide](/bn/guide/ffi/)-এ।
