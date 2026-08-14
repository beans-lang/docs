---
title: Checking and running
description: beansc check আর run, সাথে lex, parse, mir, আর llvm — কোড দেখার কমান্ডগুলো।
---

[Native binary build](/bn/tools/build/) করার আগে সাধারণত কোডটা check করা হয়, আর
প্রায়ই reference interpreter-এ চালিয়ে দেখা হয়। এছাড়া `beansc` compiler-এর প্রতিটা
stage আলাদা করে দেখায়, যাতে কোন stage কী বানাল সেটা দেখা যায়।

## `beansc check`

কোনো কিছু build না করেই একটা file type-check করে।

```bash
beansc check app.b
```

- সব ঠিক থাকলে `<file>: ok` ছাপায়।
- কিছু ভুল থাকলে `file:line:col: error: ...` হিসেবে error ছাপায় আর exit 1 দেয়।

`check` কমান্ড `--target`, `--cpu`, `--features`, আর `--runtime` নেয়। এতে build না
করেই দেখে নেওয়া যায় কোডটা কোনো নির্দিষ্ট target আর runtime profile-এর জন্য
ঠিক আছে কি না। কোনো runtime profile-এ যে capability নেই, সেটা এই check-এর সময়েই
নাম ধরে আটকে দেওয়া হয়। দেখুন [target](/bn/tools/targets/)।

## `beansc run`

file-টা check করে, তারপর reference interpreter-এ চালায়। এখানে কোনো native build হয় না।

```bash
beansc run app.b
```

program-এ argument পাঠাতে হলে সেগুলো `--`-এর পরে দিন:

```bash
beansc run app.b -- --verbose input.txt
```

Interpreter-এ program panic করলে `run` exit 3 দেয়। দেখুন [Exit code আর সমস্যা
সমাধান](/bn/tools/exit-codes/)।

## Stage-গুলো দেখা

এই কমান্ডগুলো compiler-এর একেকটা stage ঢেলে দেখায়। এগুলো বোঝা আর debug করার জন্য,
রোজকার কাজের জন্য না।

| কমান্ড | কী ছাপায় |
| --- | --- |
| `beansc lex <file.b>...` | token stream। |
| `beansc parse <file.b>...` | parse-করা AST। |
| `beansc mir <file.b>` | check-করা, ownership-plan-করা MIR। |
| `beansc llvm <file.b>` | native build যে LLVM IR ব্যবহার করে সেটা। |

```bash
beansc parse app.b
beansc mir app.b
beansc llvm app.b
```

`lex` আর `parse` এক বা একাধিক file নেয়। `mir` আর `llvm` একটা file নেয়।
