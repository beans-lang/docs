---
title: The pot command reference
description: beansc pot এর subcommand গুলো, আর --locked ও --offline কোথায় খাটে।
---

`beansc pot` command কাজ করে project-এর dependency আর
[`beans.lock`](/bn/pot/dependencies/) নিয়ে। এর দুইটা subcommand আছে।

```text
beansc pot <tidy|update [dependency]>
```

## `beansc pot tidy`

কোড যে dependency গুলো সত্যিই ব্যবহার করে সেগুলো resolve করে, আর
`beans.lock` লেখে।

```bash
beansc pot tidy
```

[`beans.pot`](/bn/pot/manifest/)-এ `require` লাইন যোগ করা বা মুছে ফেলার পর এটা
চালান, যাতে lock-টা যা import করা হচ্ছে তার সাথে মিলে যায়।

## `beansc pot update`

locked dependency গুলোকে refresh করে তাদের ref যতটুকু অনুমতি দেয় ততটুকুর মধ্যে
সবচেয়ে নতুন commit-এ নিয়ে যায়, আর lock আবার লেখে।

```bash
beansc pot update
```

শুধু একটা dependency update করতে চাইলে তার নাম বলে দিন:

```bash
beansc pot update github.com/acme/http
```

## যা কিছু নেই

কোনো `pot init` নেই, `pot add` নেই, `pot remove`-ও নেই। `beans.pot` নিজ হাতে
edit করতে হয় — একটা `require` লাইন যোগ করা বা মুছে ফেলা — তারপর
`beansc pot tidy` চালিয়ে lock update করা হয়। `tidy` আর `update` — এই দুইটাই `pot`
এর একমাত্র subcommand।

## `--locked` আর `--offline`

এই দুইটা flag কিন্তু `pot`-এর subcommand নয়। এগুলো খাটে `check`, `run`, আর
`build`-এ (আর এগুলোর নিচের loading path-এ), যেখানে এরা ঠিক করে lock আর network-কে
কতটা কড়াভাবে ধরা হবে:

- `--locked`: হুবহু `beans.lock` entry দরকার; lock না থাকলে, পুরানো হলে, বা বদলে
  গেলে সেটা বাতিল করে দেয়।
- `--offline`: dependency-র network access বন্ধ; শুধু একটা পরিষ্কার cached tree
  বোঝায়, যার hash locked hash-এর সাথে মেলে।

পুরো বিস্তারিত আছে [Reproducible build](/bn/pot/reproducible/)-এ। সাথে দেখুন
[Dependencies আর lock file](/bn/pot/dependencies/) আর [beansc command](/bn/tools/beansc/)।
