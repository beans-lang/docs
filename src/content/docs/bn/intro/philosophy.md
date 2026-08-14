---
title: Language philosophy
description: Beans যে design নিয়মগুলো মেনে চলে আর তার পিছনের যুক্তি — কেন Option বড় হাতের আর some ছোট হাতের, সেটাও।
---

Beans-এর নিজের একটা মত আছে। কয়েকটা design নিয়ম মেনে চলে, আর প্রতিটা ফিচারকে সেই
নিয়মের সামনে নিজের জায়গা প্রমাণ করতে হয়। এই নিয়মগুলো একবার বুঝে গেলে ভাষার বেশিরভাগ
জিনিসই আর অবাক করে না।

## design নিয়মগুলো

### ১. ছোট grammar

প্রতিটা keyword-কে যতটা জটিলতা যোগ করে, তার চেয়ে বেশি জটিলতা কমাতে হবে। Grammar ইচ্ছা
করেই ছোট রাখা। যে ফিচার শুধু একটু টাইপিং বাঁচায় কিন্তু শেখার জন্য নতুন একটা জিনিস যোগ
করে, সেটা ঢুকতে পারে না।

### ২. সবকিছুই একটা object

যেকোনো value-এর উপর method call করা যায়, এমনকি primitive-এও। `5.abs()` কাজ করে।
Primitive-গুলো ভিতরে unboxed, তাই run time-এ এতে কোনো খরচ হয় না।

### ৩. কোনো null নেই, কোনো exception নেই

ভাষার কোথাও `null` নেই, কোনো exception নেই। যে value হয়তো থাকবে না, তার type
`Option<T>`। যে operation হয়তো fail করবে, সেটা `Result<T>` ফেরত দেয়। দুটোই সাধারণ
value, যেগুলো খোলাখুলি handle করা হয়। কোনো control flow না জানিয়ে হঠাৎ
কোড থেকে লাফ দিয়ে বেরিয়ে যায় না।

### ৪. প্রতিটা নতুন নাম নিজের type বলে দেয়

`let`, `var`, function parameter, field বা loop variable — কোথাও type inference নেই।
Type নিজে লিখতে হয়। কোনটা কী জিনিস সেটা editor-কে জিজ্ঞেস না করেও কোড পড়ে বোঝা যায়।

একটা ব্যতিক্রম আছে: match binding। কোনো `match`-এ যে value-টা match করা হচ্ছে, সেটাই
type ঠিক করে দেয়, তাই binding-এ আর type লিখতে হয় না।

```beans
match find_user(id) {
    some(u) => io.println(u.name),  // u's type comes from the match
    none    => io.println("not found"),
}
```

### ৫. একটাই casing নিয়ম

- function, method, variable, package আর enum variant-এর জন্য `snake_case`।
- type-এর জন্য `PascalCase`।
- primitive-এর জন্য `lowercase` (`int`, `bool`, `decimal`, `string`)।

কোনো নাম কী জিনিস, সেটা বাকি সব পড়ার আগেই casing দেখেই বোঝা যায়।

### ৬. by default package-private

class, interface, enum, function, method আর field নিজের package-এর ভিতরেই থাকে, যতক্ষণ না
সেটাকে `pub` দিয়ে চিহ্নিত করা হয়। ভুল করে API বের হয়ে যায় না। যে field বা method
নিজের declaring type-এর ভিতরেই থাকতে হবে, সেটা `priv` ব্যবহার করে — একই package-এর কোড আর
subclass-ও তখন সেটা ধরতে পারে না।

### ৭. দুটো design কাজ করলে, কম syntax-এরটা বেছে নেওয়া হয়

দুটো design যখন কাজটা সমানভাবে করে, Beans তখন সেটাই নেয় যেটা কম symbol দিয়ে পড়া যায়।
অনেক ছোট ছোট সিদ্ধান্তের পিছনে এই tie-breaker-টাই কাজ করে।

## `Option` বড় হাতের কিন্তু `some` কেন না

এখানে পুরো কাজটা করে দেয় casing নিয়মটা (নিয়ম ৫):

- `PascalCase` মানে একটা type। `Option<User>` একটা type।
- `snake_case` মানে একটা value। `some(u)` একটা value।

`Option` আর `Result` কোনো বিশেষ syntax না। এগুলো built-in enum, আর enum variant হয়
`snake_case`, তাই variant-গুলো হলো `some`, `none`, `ok`, আর `err` — সবই ছোট হাতের।

```beans
let found: Option<User> = some(user)   // Option = type, some = value
let missing: Option<User> = none
```

দিনে দিনে এগুলো কীভাবে ব্যবহার করা হয়, সেটা দেখুন [Option আর Result](/bn/guide/errors/)-এ। আর
Beans ইচ্ছা করে কী কী বাদ দিয়েছে, সেটা আছে [কী পারে, কী পারে না](/bn/intro/goals/) পেজে।
