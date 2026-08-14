---
title: Why it is called POT
description: POT জিনিসটা কী, নামটা কোথা থেকে এলো, আর package নিয়ে কাজ করতে গেলে যে চারটা আলাদা জিনিস গুলিয়ে ফেলা যাবে না।
---

POT হলো Beans-এর ভেতরেই বসানো package manager। এটা কাজ করে project-এর রুটে
বসে থাকা `beans.pot` নামের একটা ফাইল নিয়ে। ওই ফাইলটাই হলো manifest — এটা
module-এর নাম রাখে, আর যে Git dependency গুলো টেনে আনা হয় সেগুলোর লিস্ট রাখে।

## নামটা এলো কোথা থেকে

POT কোনো কিছুর সংক্ষিপ্ত রূপ নয়। source-এ, README-তে, spec-এ, এই docs-এ —
কোথাও এর লুকানো কোনো মানে নেই। নামটা project-এর নিজের নাম নিয়ে একটা মজা:
Beans তার package গুলো রাখে একটা **pot of beans**-এ, অর্থাৎ ডালের হাঁড়িতে। manifest
ফাইলের নাম `beans.pot`, আর যে command এটা নিয়ে কাজ করে সেটা `beansc pot`।

Beans-এ নেই এমন কোনো command লিখলে, যেমন `mod`, সেটা সোজাসুজি বলে দেয়:

```text
error: 'mod' is not a Beans command; use 'beansc pot tidy' or 'beansc pot update'
```

## চারটা জিনিস আলাদা রাখা

Package নিয়ে কথা বলতে গেলে অনেকে গুলিয়ে ফেলে, কারণ একটাই শব্দ দিয়ে চারটা আলাদা
জিনিস বোঝানোর চেষ্টা করে। Beans এই চারটাকে আলাদা রাখে। এই চারটা একবার বুঝে
ফেললে POT-এর বাকি সব সহজ লাগবে।

| জিনিস | উদাহরণ | এটা যা বোঝায় |
| --- | --- | --- |
| module path | `shop` | `beans.pot` যে unit-টার নাম রাখে। একটা dependency, lock file-এ একটা row। |
| import path | `shop.money` | একটা package-এর গোটা দুনিয়ায় ইউনিক পরিচয়। দুইটা package কখনো একটা শেয়ার করে না। |
| package name | `money` | একটা package তার `package` clause-এ নিজেকে যে নামে ডাকে। |
| import binding | `cash` | একটা import-এর লোকাল নাম, শুধু একটা ফাইলের ভেতরেই বাঁচে। |

সব একসাথে দেখলে, এমন একটা লাইন এই তিনটাকেই একবারে ব্যবহার করে:

```beans
import shop.money as cash
```

এখানে `shop.money` হলো import path, আর `cash` হলো import binding — এই একটা
ফাইলেই এই নামটা ব্যবহার করা হবে। package-টা কিন্তু তার `package` clause-এ
নিজেকে এখনও `money` নামেই ডাকছে; এখানে শুধু তাকে `cash` বলে ডাকার সিদ্ধান্ত
নেওয়া হয়েছে।

[beans.pot manifest](/bn/pot/manifest/) পেজে প্রতিটা field নিয়ে বলা আছে, আর
[imports guide](/bn/guide/imports/) দেখায় রোজকার কোডে import কীভাবে কাজ করে।
