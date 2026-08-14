---
title: std.asm
description: অল্প কয়েকটা allowlist করা inline assembly template, শুধু unsafe দিয়েই পৌঁছানো যায়।
---

<!-- coverage:summary -->
**API সারমর্ম** (Beans source থেকে `npm run coverage` দিয়ে বানানো): 2টা package function।
<!-- coverage:summary:end -->

`std.asm` দিয়ে খুব ছোট, নির্দিষ্ট একটা সেটের inline assembly instruction emit করা যায়। এটা একটা native module আর এর জন্য [`unsafe`](/bn/guide/unsafe/) লাগে। এটা কিন্তু সাধারণ inline assembly না: target-এর allowlist-এ যেসব template-এর জন্য একটা row আছে শুধু সেগুলোই নেওয়া হয়, আর template আর constraint string-গুলো নিছক string literal হতে হবে।

```beans
import std.asm
```

## Function

দুটো function-ই native, তাই এদের parameter positional আর কোনো নাম বহন করে না।

```beans
value(string, string, int) -> int
run(string, string)
```

- `value(template, constraints, operand)` এমন একটা template চালায় যেটা একটা `int` operand নেয় আর একটা `int` দেয়। `template` হলো instruction-এর text আর `constraints` হলো LLVM constraint string।
- `run(template, clobbers)` operand ছাড়া একটা template চালায়, volatile হিসেবে। `clobbers` লিস্ট করে instruction-টা কী clobber করে, যেমন `"memory"`।

`template` আর তার পাশের string-টা (`constraints` বা `clobbers`) — দুটোই call-এর মধ্যে ঠিক সেখানেই লেখা literal string হতে হবে। run time-এ এগুলো বানানো যায় না।

## অনুমোদিত template

Architecture অনুযায়ী শুধু এই template-গুলোই অনুমোদিত:

| Architecture | Template |
| --- | --- |
| arm64 | `mov $0, $1`, `dmb ish`, `dmb ishst`, `isb` |
| x86_64 | `mov $0, $1` (Intel syntax), `mfence`, `lfence`, `sfence` |
| arm32 | `dmb sy`, `cpsid i`, `cpsie i`, `wfi` |
| riscv32 | `fence rw, rw`, `csrci mstatus, 8`, `csrsi mstatus, 8`, `wfi` |

32-bit x86 বা wasm32-তে কোনো অনুমোদিত template নেই। value-ফেরত-দেওয়া `asm.value` row-গুলো শুধু 64-bit architecture-এই আছে; যে barrier-ধরনের template কোনো operand নেয় না সেগুলো `asm.run` দিয়ে যায়।

একটা machine register-এর মধ্য দিয়ে একটা value round-trip। `mov $0, $1` arm64 আর x86-64 দুটোতেই একই বানানে লেখা হয়, তাই একই source যেকোনোটায় compile হয়:

<!-- beans:compile -->
```beans
import std.io
import std.asm

fn through_register(value: int) -> int {
    unsafe {
        return asm.value("mov $0, $1", "=r,r", value)
    }
}

fn main() {
    io.println("42 comes back as {through_register(42)}")
    io.println("and zero as {through_register(0)}")
}
```

একটা operand-বিহীন barrier `asm.run` দিয়ে যায়। template-টা build-এর architecture-এর জন্য একটা অনুমোদিত row হতে হবে, তাই target-এর জন্য যেটা মানানসই সেটা বাছতে হবে (যেমন arm64-তে `dmb ish` বা x86-64-তে `mfence`):

```beans
unsafe {
    asm.run("dmb ish", "memory")
}
```

## আরও দেখুন

- [Unsafe guide](/bn/guide/unsafe/), এখানকার সবকিছু `unsafe`-এর ভেতরে থাকে।
- [std.intrinsic](/bn/reference/stdlib/cpu-intrinsic/), high-level hardware operation, যেগুলো সাধারণত এর বদলে দরকার হয়।
