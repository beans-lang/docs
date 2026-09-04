---
title: Versioning
description: version-এর একমাত্র উৎস, SemVer, 0.1.x preview line, আর 1.0-এ যেতে কী কী লাগে।
---

Beans-এর version কত সেটা বলার একটাই জায়গা আছে, এটা SemVer মেনে চলে, আর এখন
1.0-এর দিকে যাওয়া একটা preview line-এ আছে।

## version-এর একটাই সত্যের উৎস

সব version number আসে একটা ফাইল থেকে:
[`VERSION`](https://github.com/beans-lang/beans/blob/main/VERSION)।

```text
compiler=0.1.37
language=1.0
runtime_abi=15
```

- **compiler**: compiler-এর version (`0.1.37`)।
- **language**: language-এর version (`1.0`)।
- **runtime_abi**: runtime ABI number (`15`)।

ওই file থেকেই `src/version.b` generate হয়। একটা test
(`test/version.sh`) পুরানো একটা copy মানতে চায় না, তাই generate হওয়া Beans ফাইল
কখনো `VERSION` থেকে সরে যেতে পারে না।

`beansc --version` তিনটাই ছাপায়।

## SemVer

Beans [Semantic Versioning](https://semver.org/) মেনে চলে।

- **1.0-এর আগে**, language, standard library, CLI, module format, আর ABI — এসব
  minor release-এর মাঝে বদলে যেতে পারে। সিরিয়াস project-এর জন্য compiler pin করুন
  আর `beans.lock` commit করুন। দেখুন [Compatibility](/bn/project/compatibility/)।
- **1.0-এর পরে**, public কিছু break করলে একটা নতুন major version লাগবে, আর তখনকার
  আর তার আগের minor line — দুইটাই fix পাবে।

**runtime ABI number** বদলায় যখনই generate হওয়া কোড আর ship করা runtime একে
অপরের সাথে আর মানানসই থাকে না।

## 0.1.x preview line

`0.1.x` line হলো **1.0 stabilization line-এর উপর একটা production preview**। এটা
এর উপর দাঁড়িয়ে কাজ করার মতো যথেষ্ট শক্ত, কিন্তু এটা 1.0 নয়, আর এটাকে
1.0.0 বলাও ঠিক নয়।

1.0-এ পৌঁছাতে হলে roadmap-এর প্রতিটা release gate পাস করতে হবে:

- performance gate গুলো পাস করে
- একটা 24-ঘণ্টার fuzz campaign
- একটা 30-দিন-পরিষ্কার beta, তারপর একটা 14-দিন-পরিষ্কার release candidate
- কোনো খোলা critical বা high correctness bug নেই
- পুরো 26-target release manifest প্রকাশ করা

বড় ছবিটা দেখতে যান [Maturity আর platform](/bn/intro/maturity/)-এ, আর একটা version
কীভাবে বানানো আর প্রকাশ করা হয় সেটা দেখুন [release process](/bn/project/release/)-এ।
