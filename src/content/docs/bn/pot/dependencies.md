---
title: Dependencies and the lock file
description: require দিয়ে Git dependency কীভাবে pin হয়, আর beans.lock কী কী রেকর্ড করে।
---

Beans-এর dependency আসে Git থেকে। কোনো central registry নেই। `beans.pot`-এ একটা
Git host path আর একটা reference লিখে দিলেই Beans সেটা clone করে একটা লোকাল
cache-এ নিয়ে আসে, আর ঠিক যা পেল সেটা `beans.lock`-এ লিখে রাখে।

## একটা dependency ঘোষণা করা

project root থেকে `pot add` চালান:

```bash
beansc pot add acme/http v1.2
```

এটা [manifest](/bn/pot/manifest/)-এ একটা `require` লাইন যোগ করে:

```beans-pot
module shop
require github.com/acme/http v1.2
```

- path হলো একটা Git host path: ঠিক `host/owner/repo` — এর বেশিও না, কমও না।
- reference হলো একটা tag, branch, বা commit-এর মতো কোনো ref (এখানে `v1.2`)।
- যত খুশি `require` লাইন থাকতে পারে।
- একই path দুইটা আলাদা ref-এ pin করলে সেটা error।

`owner/repo` হলো GitHub shorthand। পুরো host path আর HTTPS/SSH Git URL-ও চলে।
ref না দিলে `HEAD` ধরা হয়।

ref শুধু tag নয়; branch আর commit hash-ও চলে। lock সবসময় ঠিক resolved commit
আর tree লেখে। branch বা `HEAD` update করলে lock সামনে যেতে পারে; fixed commit
একই commit-এ থাকে। private repo-র credential Git নিজে সামলায়।

একবার require করে দিলে, এর ভেতর থেকে package গুলো import করা হয় তাদের পুরো
import path দিয়ে, যেমন `import github.com/acme/http`। import path কীভাবে resolve
হয় সেটা দেখুন [Local package আর import](/bn/pot/local-packages/)-এ।

## beans.lock ফাইলটা

`beans.lock` বসে থাকে module রুটে, `beans.pot`-এর পাশেই। প্রতিটা dependency ঠিক
কোন commit আর tree-তে resolve হয়েছিল সেটা এটা রেকর্ড করে রাখে — যাতে পরে আবার
build করলে হুবহু একই bytes পাওয়া যায়।

এটাও লাইন-ভিত্তিক। প্রথম লাইন হলো format version। তারপর প্রতিটা resolve হওয়া
dependency-র জন্য একটা করে row, sort করা অবস্থায়:

```beans-pot
version 1
module github.com/acme/http v1.2 3f1c9a2b... 8ad00e1f...
```

প্রতিটা dependency row দেখতে এমন:

```text
module <path> <requested-ref> <commit> <tree>
```

- `<path>`: `require` থেকে পাওয়া module path।
- `<requested-ref>`: যে ref চাওয়া হয়েছিল (`v1.2`)।
- `<commit>`: ঠিক যে Git commit SHA-তে এটা resolve হয়েছে।
- `<tree>`: ওই commit-এর ভেতরের জিনিসগুলোর Git tree hash।

ফাইলটা নিরাপদভাবে লেখা হয়: Beans আগে একটা temporary ফাইল লেখে, তারপর সেটাকে
atomic ভাবে rename করে জায়গায় বসিয়ে দেয় — ফলে অর্ধেক-লেখা lock কখনো চোখে পড়ে
না।

## lock কখন লেখা হয়

- সাধারণ একটা build নিজে থেকেই `beans.lock` লিখে দেয়।
- [`beansc pot add`](/bn/pot/commands/) একটা dependency যোগ করে আর resolve করে।
- [`beansc pot remove`](/bn/pot/commands/) একটা dependency মুছে lock tidy করে।
- [`beansc pot tidy`](/bn/pot/commands/) কোড যে dependency গুলো সত্যিই ব্যবহার করে
  সেগুলো resolve করে lock লেখে।
- [`beansc pot update`](/bn/pot/commands/) locked dependency গুলো refresh করে lock
  আবার লিখে দেয়।

কিছুটা সিরিয়াস যেকোনো project-এ `beans.lock` commit করে রাখুন। এটা, আর একটা
pin করা compiler — এই দুইটা মিলেই পরে আবার হুবহু একই build পাওয়া যায়। `--locked`
আর `--offline` নিয়ে দেখুন [Reproducible build](/bn/pot/reproducible/), আর 1.0-এর
আগে pin করা কেন জরুরি সেটা দেখুন [Compatibility](/bn/project/compatibility/)-এ।
