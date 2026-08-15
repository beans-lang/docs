---
title: The pot command reference
description: beansc pot এর subcommand গুলো, আর --locked ও --offline কোথায় খাটে।
---

`beansc pot` command কাজ করে project-এর dependency আর
[`beans.lock`](/bn/pot/dependencies/) নিয়ে। এর চারটা subcommand আছে।

```text
beansc pot add <dependency> [ref]
beansc pot tidy
beansc pot remove <dependency>
beansc pot update [dependency]
```

## `beansc pot add`

`beans.pot`-এ Git dependency যোগ করে, সেটা resolve করে, আর `beans.lock` লেখে।

```bash
beansc pot add acme/http v1.2
```

`owner/repo` লিখলে সেটা `github.com/owner/repo` ধরা হয়। পুরো host path, HTTPS
URL, বা SSH URL-ও paste করা যায়। ref না দিলে `HEAD` ধরা হয়।

ref tag, branch, বা commit hash হতে পারে:

```bash
beansc pot add acme/http main
beansc pot add acme/http feature/new-api
beansc pot add acme/http 4f82c9a7d13e
```

এখানে কোনো package registry search হয় না। `acme/http` সবসময়
`github.com/acme/http`, আর Git `https://github.com/acme/http.git` fetch করে।

private repo-র জন্যও একই command। Beans credential save করে না; Git তার
স্বাভাবিক credential helper ব্যবহার করে। GitHub-এ SSH ব্যবহার করতে চাইলে একবার
এটা চালানো যায়:

```bash
git config --global url."git@github.com:".insteadOf "https://github.com/"
```

`beans.pot` বা dependency argument-এ access token লিখবেন না।

## `beansc pot tidy`

কোড যে dependency গুলো সত্যিই ব্যবহার করে সেগুলো resolve করে, আর
`beans.lock` লেখে।

```bash
beansc pot tidy
```

import বদলানোর পর এটা চালান, যাতে lock-টা কোডের সাথে মিলে যায়।

## `beansc pot remove`

`beans.pot` থেকে Git dependency মুছে দেয়, তারপর `beans.lock` tidy করে।

```bash
beansc pot remove acme/http
```

আগে ওই dependency-র import মুছুন। import থেকে গেলে command fail করবে আর
`beans.pot` বদলাবে না।

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

dependency-র নাম `pot add`-এর মতো short name, host path, বা Git URL হতে পারে।

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
