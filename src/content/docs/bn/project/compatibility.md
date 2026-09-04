---
title: Compatibility
description: compatibility-র ওয়াদা, runtime ABI, কীভাবে pin করবে, আর dependency-র উৎস হিসেবে Git।
---

এই পেজটা বলে কী স্থির থাকে, কী নড়তে পারে, আর language যতক্ষণ 1.0-এর আগে আছে
ততক্ষণ একটা project কীভাবে স্থির ধরে রাখা যায়।

## ওয়াদাটা, 1.0-এর আগে আর পরে

- **1.0-এর আগে** (এখনকার `0.1.x` line): language, standard library, CLI, module
  format, আর ABI — এসব minor release-এর মাঝে বদলে যেতে পারে। প্রতিটা minor
  release-কে একটা সম্ভাব্য break ধরে নেওয়া ভালো।
- **1.0-এর পরে**: public কিছু break করলে একটা নতুন major version লাগবে। তখনকার আর
  তার আগের minor line — দুইটাই fix পায়।

number গুলো কীভাবে বসানো হয় সেটা দেখুন [Versioning](/bn/project/versioning/)-এ।

## runtime ABI

runtime ABI-র নিজের একটা number আছে (`runtime_abi=15`)। এটা বদলায়
যখনই compiler-এর generate করা কোড আর ship করা runtime একে অপরের সাথে আর মানানসই
থাকে না। আলাদা ABI number-এর একটা compiler আর একটা runtime মিলিয়ে ফেললে ওরা এক
সাথে খাপ খায় না। একটাই install করা release-এ থাকলে ওরা মিলে থাকে।

## কীভাবে pin করবেন

যেকোনো project নিয়ে সিরিয়াস হলে, দুইটা জিনিস pin করুন:

1. **compiler।** একটা release install করে সেটাই রাখুন। project-এর মাঝপথে
   `upgrade` করে ভাসতে থাকবেন না।
2. **`beans.lock`।** এটা commit করুন। এটা প্রতিটা dependency-র ঠিক commit আর
   tree রেকর্ড করে রাখে। দেখুন [Dependencies আর lock file](/bn/pot/dependencies/)।

তারপর কড়া flag দিয়ে build করুন, যাতে পায়ের নিচ থেকে কিছু না নড়ে:

```bash
beansc build --locked --offline app.b -o app
```

`--locked` lock না থাকলে, পুরানো হলে, বা বদলে গেলে বাতিল করে দেয়; `--offline`
dependency-র network access বন্ধ করে দেয় আর শুধু lock-এর সাথে মেলা একটা cached
tree বোঝায়। দেখুন [Reproducible build](/bn/pot/reproducible/)।

## dependency-র উৎস হলো Git

Beans-এর dependency আসে Git থেকে, আর v1-এও এটা এমনই থাকবে: কোনো central registry
লাগে না। একটা dependency হলো [`beans.pot`](/bn/pot/manifest/)-এ একটা
`host/owner/repo` path আর একটা ref, যা `beans.lock`-এ একটা ঠিক commit আর tree-তে
resolve হয়। যেহেতু উৎস Git আর lock হুবহু, তাই কোনো package server চালু আছে কিনা
তার উপর নির্ভর করতে হয় না।

বড় ছবিটা দেখতে যান [Maturity আর platform](/bn/intro/maturity/)-এ।
