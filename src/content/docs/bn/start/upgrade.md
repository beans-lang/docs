---
title: Upgrade beansc
description: beansc upgrade দিয়ে install করা একটা Beans release-কে নতুন version-এ নিয়ে যাওয়া।
---

Beans একবার install হয়ে গেলে, একটা command দিয়েই এটা upgrade করা যায়।

## জায়গায় বসেই upgrade

```bash
beansc upgrade
```

এটা install করা release-টাকে জায়গায় বসেই upgrade করে। এটা:

- নতুন release নামায়,
- তার SHA-256 checksum যাচাই করে, আর
- install-এর জায়গাটা একই রাখে।

## Windows

Windows-এ upgrade-টা install করা `beansc.cmd` launcher দিয়ে চালান:

```bash
beansc.cmd upgrade
```

এই launcher-টা আছে কারণ Windows-এ একটা চলন্ত program সবসময় নিজের file নিজে বদলাতে পারে
না; `.cmd` wrapper-টা এই বদলটা সামলায়।

## যখন এটা খাটে না

`beansc upgrade`-এর জন্য upgrade করার মতো একটা **install করা release** লাগে।
`beansc`-কে source থেকে build করা হলে (একটা `git clone` + `make`), বদলানোর মতো
কোনো release package নেই, তাই `upgrade`-এর কিছু করার নেই। এর বদলে নতুন source টেনে নিয়ে
আবার build করুন।

`doctor` আর `upgrade`-এর পুরো খুঁটিনাটি জানতে দেখুন [doctor আর upgrade](/bn/tools/doctor-upgrade/)।
Upgrade করার পর নতুন version-টা নিশ্চিত করতে [install-টা verify করুন](/bn/start/verify/)।
