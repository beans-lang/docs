---
title: doctor and upgrade
description: beansc doctor বলে দেয় install দিয়ে কী build করা যাবে; beansc upgrade install-টাকে জায়গায় রেখেই নতুন করে দেয়।
---

দুটো কমান্ড Beans install-টার দেখাশোনা করে: `doctor` বলে দেয় এটা কী কী পারে,
আর `upgrade` এটাকে সবশেষ release-এ নিয়ে যায়।

## `beansc doctor`

```bash
beansc doctor
```

`doctor` আগে একটা banner ছাপায়, তারপর একটা report। প্রতিটা row হয় `ready` বলে, নয়তো
ঠিক যে একটা কমান্ড দিয়ে ওটা ঠিক হবে সেটার নাম বলে। এটা **সবসময় 0 দিয়ে exit করে**,
এমনকি কিছু ready না থাকলেও। এটা একটা report, কোনো গেট না।

এটা যা যা জানায়:

- package class (install-এর VERSION file থেকে)
- host target
- install root (`BEANS_HOME`)
- standard library-র root (`BEANS_STDLIB` মানে)
- runtime-এর source
- wasm host-এর source
- clang, version সহ
- linker
- archiver
- SDK / sysroot (macOS-এ এটা `xcode-select -p` ব্যবহার করে)
- git

তারপর এটা capability-র row-গুলো check করে:

| Capability | কী লাগে |
| --- | --- |
| check / run / llvm / `build --emit ir` | stdlib |
| native build | stdlib + runtime + clang + macOS SDK |
| bindgen | clang |
| static library | native build + archiver |

যে row ready না, সেখানে ঠিক কোন কমান্ড দিয়ে ঠিক হবে সেটার নাম দেওয়া থাকে, যেমন
`xcode-select --install`।

## `beansc upgrade`

```bash
beansc upgrade
```

`upgrade` এই install-টাকে সবশেষ release-এ নিয়ে যায়। এর জন্য একটা **install-করা
release** দরকার: এটা `BEANS_HOME` পড়ে, আর শুধু source checkout-এ কোনো install থাকে
না, তাই সেখানে এটা error দেয়।

এটা যা করে:

- `{BEANS_HOME}/libexec/beans-install.sh` (বা Windows-এ `.ps1`)-এ বাঁধা installer-টা
  `--prefix <BEANS_HOME> --no-modify-path` দিয়ে চালায়
- install-এর জায়গাটা যেমন ছিল তেমনই রাখে
- download-এর SHA-256 যাচাই করে
- staged compiler-টা চালায়
- তারপর পুরনো install-টা বদলে দেয়

Windows-এ এটা install-করা `beansc.cmd` launcher দিয়ে চালান।

শুরুর দিকের একটা view-র জন্য দেখুন [beansc upgrade করা](/bn/start/upgrade/), আর প্রথমবার
install করতে দেখুন [Beans install করা](/bn/start/install/)। কোনো কমান্ড fail করলে কেন
হলো সেটা বলে দেয় [exit code](/bn/tools/exit-codes/)।
