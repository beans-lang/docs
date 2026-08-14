---
title: Exit codes and troubleshooting
description: প্রতিটা beansc exit code-এর মানে, আর যেসব tool নেই (কোনো formatter নেই, কোনো beansc test নেই)।
---

`beansc` অল্প কয়েকটা বাঁধা exit code ব্যবহার করে। Script আর CI নিশ্চিন্তে এদের ওপর
ভরসা করতে পারে।

## Exit code

| Code | মানে |
| --- | --- |
| `0` | সফল। (`doctor` সবসময় 0 দেয়।) |
| `1` | Compile, analysis, বা build fail। |
| `2` | Usage বা argument-এ ভুল। |
| `3` | `beansc run`-এ interpreter চালানোর সময় একটা runtime panic। |

কোনটার নিচে কী পড়ে:

- **1**: load, resolve, check, layout, MIR, LLVM, বা native-build-এর error; কোনো
  lex বা parse fail; কোনো `pot` load fail; আর `upgrade`-এর শর্ত পূরণ না হওয়া।
- **2**: কোনো argument না দেওয়া; অচেনা কমান্ড; অচেনা বা ভুলভাবে ব্যবহার-করা flag;
  flag-এর value বাদ পড়া; ভুল `--emit` বা `--runtime`; অচেনা target; আর গোলমেলে
  `pot`, `bindgen`, বা `lsp` invocation।
- **3**: [`beansc run`](/bn/tools/check-run/)-এর নিচে reference interpreter-এ চলার
  সময় program panic করা।

## কোনো formatter নেই

Beans-এ **কোনো formatter নেই**। `beansc fmt` বলে কিছু নেই, আলাদা কোনো formatter
tool-ও নেই। Formatting এখনো বানানো হয়নি। "format on save"-এর মতো কিছু খুঁজলে
এখনো সেট করার মতো কিছু নেই।

## কোনো `beansc test` নেই

**কোনো `beansc test` subcommand নেই**। Beans-এর নিজের test suite চালানো হয় project-এর
Makefile দিয়ে (`make test` আর তার সঙ্গীরা), source থেকে build করার সময়। দেখুন
[Test চালানো](/bn/project/testing/)। ওটা compiler নিয়ে কাজ করার জন্য, প্রতি-project
test runner না।

## সমস্যা সমাধান

- **"is not a Beans command"**: এমন একটা কমান্ড দেওয়া হয়েছে যেটা নেই।
  [subcommand-এর লিস্ট](/bn/tools/beansc/) দেখুন। Dependency-র কমান্ডগুলো থাকে `beansc
  pot`-এর নিচে, যেমন `beansc pot tidy` আর `beansc pot update`।
- **কোনো capability "refused at check time"**: `--runtime` profile ওটা বাদ
  দিয়ে দিয়েছে। দেখুন [runtime profile](/bn/tools/targets/)।
- **native build clang খুঁজে পায় না**: সম্ভবত একটা slim package আছে।
  [`beansc doctor`](/bn/tools/doctor-upgrade/) চালান; এটা ঠিক করার উপায় বলে দেবে।
- **কোনো dependency reject হয়ে যাচ্ছে**: এর commit বা tree `beans.lock`-এর সাথে
  মিলছে না। দেখুন [Reproducible build](/bn/pot/reproducible/)।
