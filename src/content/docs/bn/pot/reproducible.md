---
title: Reproducible builds
description: content-address করা dependency cache, আর --locked ও --offline flag দুইটা।
---

Beans এমনভাবে বানানো যে একই input দিলে পরেও একই build পাওয়া যায়। dependency গুলো
content দিয়ে cache হয়, lock file ঠিক hash গুলো রেকর্ড করে রাখে, আর দুইটা flag
জোর দিয়ে বলার সুযোগ দেয় যে কিচ্ছু যেন না নড়ে।

## content-address করা cache

resolve হওয়া dependency tree গুলো Beans home-এর নিচে cache হয়:

```text
$BEANS_HOME/pkg/<module>/<commit>
```

path-টা content-address করা: এর key হলো ঠিক ওই commit-টা। Beans যখন একটা
dependency fetch করে, তখন fetch করা commit আর tree-টা
[`beans.lock`](/bn/pot/dependencies/)-এর সাথে মিলিয়ে দেখে। lock-এর সাথে না মিললে
সেই fetch **বাতিল**। lock করা tree-র বদলে অন্য একটা tree-র সাথে কখনো চুপচাপ
build হয়ে যায় না।

## `--locked`

`--locked` জোর দিয়ে বলে যে lock একদম ঠিক থাকতে হবে। `beans.lock` যদি না থাকে,
পুরানো হয়ে যায়, বা বদলে যায় — তখন সেটা চুপচাপ আবার লিখে না ফেলে বরং বাতিল করে
দেয়। এটা CI-তে ব্যবহার করুন, যেখানে build-টার fail করা উচিত, pin গুলো নিজে
থেকে update হয়ে যাওয়া উচিত নয়।

## `--offline`

`--offline` dependency-র জন্য সব network access বন্ধ করে দেয়। এটা শুধু একটা
পরিষ্কার cached tree বোঝায়, যার hash lock-এর সাথে মেলে। দরকারি কোনো dependency যদি
cache-এ ঠিক locked রূপে আগে থেকে না থাকে, তাহলে build network-এ হাত না বাড়িয়ে
বরং fail করে।

## flag গুলো কোথায় খাটে

`--locked` আর `--offline` — দুইটাই খাটে `check`, `run`, আর `build`-এ, আর
এগুলোর নিচের loading path-এও। type-check করা হচ্ছে, interpreter-এ চালানো হচ্ছে,
নাকি একটা native binary বানানো হচ্ছে — যাই হোক, একই গ্যারান্টি খাটে।

```bash
beansc build --locked --offline app.b -o app
```

## fetch করাটা কীভাবে নিরাপদ রাখা হয়

- Git সব সময় একটা সাদামাটা argument vector দিয়ে চালানো হয়, কখনো কোনো shell-এর
  ভেতর দিয়ে নয়।
- ব্যবহার করার আগে একটা remote path যাচাই করে দেখা হয় যে সেটা ঠিক
  `host/owner/repo` কিনা।

একটা pin করা compiler (দেখুন [Compatibility](/bn/project/compatibility/)), একটা
commit করা `beans.lock`, আর `--locked --offline` — এই সব মিলে এমন একটা
build দেয় যেটা পায়ের নিচ থেকে বদলে যায় না। এটা যেসব জিনিসের উপর দাঁড়িয়ে
আছে সেগুলোর জন্য দেখুন [Dependencies আর lock file](/bn/pot/dependencies/) আর
[pot command reference](/bn/pot/commands/)।
