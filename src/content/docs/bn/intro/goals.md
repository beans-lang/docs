---
title: Goals and non-goals
description: Beans কোন কাজগুলো ভালোভাবে করার জন্য বানানো, আর কোন ফিচারগুলো ইচ্ছা করে রাখা হয়নি।
---

Beans কোন কাজের জন্য তৈরি, সেটা একদম পরিষ্কার। Beans-এ কী কী আছে সেটা যেমন জানা
দরকার, কী কী নেই সেটাও জানা ততটাই দরকার। তাই এই পেজে দুটোই তুলে ধরা হলো।

## যেসব কাজের জন্য তৈরি

এই কাজগুলো Beans ভালোভাবে করার জন্য তৈরি করা হয়েছে:

- **Business apps.** Accounting, ERP, billing — যেখানে হিসাব একদম ঠিক থাকতে হবে, আর
  কোডটা বছরের পর বছর পড়ে বোঝা যেতে হবে। এই জন্যই আছে explicit type, একদম নিখুঁত
  `decimal` হিসাব, আর কোনো লুকানো control flow নেই।
- **Systems work.** Database, operating system, hardware control — যেসব কোড সরাসরি
  মেশিন ছোঁয়। এই জন্য আছে sized integer, value type, একটা `unsafe` layer, আর C
  interop।
- **মেমরির আচরণ আগে থেকে বোঝা যায়।** Automatic reference counting-এর সাথে একটা cycle
  collector আছে। সাধারণ পথে কোনো garbage-collector pause নেই, আর destructor
  ঠিক কখন চলবে সেটা জানা।
- **ছোট, পড়ার মতো একটা ভাষা।** ছোট একটা grammar, তার উপরে object-oriented ফিচার
  (class, interface, inheritance)।

Fast native code তৈরি করাটা project-এর একটা ঘোষিত লক্ষ্য — মাপা হয় একটা benchmark suite-এ
টিউন করা C++-এর সাথে তুলনা করে। এই কাজ এখন কোন জায়গায় আছে, সেটা দেখতে
[পরিপক্বতা আর platform](/bn/intro/maturity/) পেজটা দেখুন।

## যেসব ইচ্ছা করে রাখা হয়নি

এগুলো Beans-এ ইচ্ছা করেই নেই। এগুলো ফাঁক না যেটা পরে ভরে দিতে হবে — এগুলো সিদ্ধান্ত।

- **কোনো null নেই।** যে value হয়তো থাকবে না, সেটা `Option<T>`। কোনো null pointer নেই
  যেটা check করতে ভুলে যাওয়ার ভয় থাকে।
- **কোনো exception নেই।** ব্যর্থতা হলো `Result<T>`। কোনো `throw` নেই, `try` নেই। আর
  তিনটা function নিচ থেকে হঠাৎ কোনো stack unwinding চমকে দেবে না।
- **কোনো green thread নেই।** Beans সত্যিকারের OS thread ব্যবহার করে। পিছনে লুকানো
  কোনো runtime scheduler নেই যেটা হালকা task-গুলোকে thread-এর উপর ভাগ করে চালায়।
- **কোনো implicit conversion নেই।** একটা number চুপচাপ type বদলায় না। `int`-কে
  `decimal` করতে হলে লিখতে হয় `x as decimal`।
- **কোনো tracing garbage collector নেই।** মেমরি চলে automatic reference counting আর
  একটা cycle collector দিয়ে, tracing GC দিয়ে না।
- **কোনো central package registry নেই।** কোনো package hub নেই। Dependency আসে Git
  থেকে, আর একটা lock file-এ pin করা থাকে। দেখুন [POT package management](/bn/pot/why-pot/)।
- **1.0-এর আগে native object ABI stable না।** C ABI stable আর supported, কিন্তু native
  Beans object-গুলোর layout compiler version বদলালেও একরকম থাকবে — এই কথা 1.0 না
  আসা পর্যন্ত দেওয়া হচ্ছে না।

এই সিদ্ধান্তগুলোর পিছনের design নিয়ম বুঝতে [ল্যাঙ্গুয়েজ ফিলোসফি](/bn/intro/philosophy/) পড়ুন। আর
null আর exception-এর বদলে কী আসছে, সেটা দেখুন [Option আর Result](/bn/guide/errors/) পেজে।
