---
title: Contributing
description: Beans-এ কীভাবে contribute করবে, change loop, আর কোড style-এর মূল নিয়মগুলো।
---

এই পেজটা একটা ছোট overview। পুরো guide আছে repository-তে।

## শুরু করুন CONTRIBUTING.md দিয়ে

আগে repository-র
[`CONTRIBUTING.md`](https://github.com/beans-lang/beans/blob/main/CONTRIBUTING.md)
পড়ে নিন। change কীভাবে গ্রহণ করা হয় — এই ব্যাপারে ওটাই আসল কথা।

## সেটআপ করে নিন

1. [source থেকে compiler build করুন](/bn/project/building/)।
2. কিছু বদলানোর আগে নিশ্চিত হয়ে নিন test গুলো চলছে। দেখুন [test
   চালানো](/bn/project/testing/)।

## change loop

behavior বদলানোর সময় এই order-এ test চালান:

1. যেটা ছোঁয়া হয়েছে তার জন্য **সবচেয়ে ছোট focused test**।
2. `make test`।
3. `make test-sanitize`, ownership, runtime, concurrency, FFI, বা codegen বদলালে।
4. `make test-fixpoint`, frontend, MIR, বা compiler বদলালে।

যেহেতু Beans self-hosted, compiler change-কে নিজেকে build করতে পারা ধরে রাখতে
হয়: release mode-এর দুই self-build byte-identical থাকতে হবে
(`make test-fixpoint`)।

## কোড style-এর গোড়ার কথা

Beans-এর নিজের কোড language design-এর নিয়মগুলো মেনে চলে। কয়েকটা গোড়ার কথা:

- Object বানানো হয় একটা class বা একটা named static-এর উপর `new` দিয়ে, কখনো একটা
  module-এর ভেতর কোনো ফ্রি constructor function দিয়ে নয়। দেখুন [standard
  library](/bn/reference/stdlib/)।
- Package গুলো `snake_case`, প্রতি package-এ একটা directory। দেখুন [Local package
  আর import](/bn/pot/local-packages/)।
- এখনও কোনো formatter নেই, তাই যে ফাইল edit করা হচ্ছে তার style-এর সাথে মিলিয়ে
  নিতে হয়।

change গুলো কীভাবে ship হয় সেটা দেখুন [release process](/bn/project/release/)-এ।
