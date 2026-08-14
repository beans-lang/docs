---
title: Operators and precedence
description: Beans-এ যেসব operator আছে, তাদের precedence, আর cast, error propagation ও assignment-এর নিয়ম।
---

এই পেজে প্রতিটা operator আর সেটা কতটা শক্ত করে বাঁধে, তার তালিকা।

## Binary operator precedence

Precedence ঢিলা (1) থেকে শক্ত (10)-এর দিকে ওঠে। সংখ্যা যত বড়, তত শক্ত করে
বাঁধে, তাই `a + b * c` পড়া হয় `a + (b * c)` হিসেবে।

| Level | Operator | অর্থ |
|---|---|---|
| 1 | `..`  `..=`  `\|\|` | range (শেষটা বাদ / শেষটাসহ), logical OR |
| 2 | `&&` | logical AND |
| 3 | `==`  `!=` | সমান কিনা |
| 4 | `<`  `<=`  `>`  `>=` | তুলনা |
| 5 | `\|` | bitwise OR |
| 6 | `^` | bitwise XOR |
| 7 | `&` | bitwise AND |
| 8 | `<<`  `>>` | shift |
| 9 | `+`  `-` | যোগ, বিয়োগ |
| 10 | `*`  `/`  `%` | গুণ, ভাগ, ভাগশেষ |

range (`0..10`, `0..=10`) সবচেয়ে নিচের level-এ বসে, `||`-এর পাশে। এগুলো
ব্যবহার করা হয় `for i: int in 0..10`-এ, আর `match` arm-এ (`400..=499 => ...`)।

## Unary আর postfix

- Unary `-` (ঋণাত্মক করা) আর `!` (logical not)।
- Postfix `.field` / `.method(...)`, `[index]`, আর call `(...)`।
- `?` কোনো `Result`/`Option`-এ error উপরে পাঠায়। `err`/`none` হলে সেটা উপরে
  return করে দেয়; নয়তো unwrap করে। দেখুন [Option and Result](/bn/guide/errors/)।
- `as` হলো একটা স্পষ্ট numeric cast বা upcast: `qty as decimal`।
- `as?` হলো একটা check করা downcast, যেটা একটা `Option` ফেরত দেয়। দেখুন
  [Interface আর inheritance](/bn/guide/interfaces/)।

Postfix, `as`, `as?` আর `?` উপরের binary operator-গুলোর চেয়ে শক্ত করে বাঁধে।

## Assignment

Assignment একটা statement, precedence-এর ওঠানামার অংশ না:

```text
=   +=   -=   *=   /=   %=
```

```beans
var n: int = 1
n += 4
n *= 2       // n is now 10
```

Bracket assignment list, map আর fixed array-তে খাটে: `xs[i] = v`,
`m[key] = v`। List আর Map-এর bracket assignment-এর কোনো compound form নেই
(`xs[i] += 1` চলবে না); fixed array কিন্তু compound element assignment
সমর্থন করে, কারণ তার element একটা আসল inline জায়গা।

## Number আর তুলনার নিয়ম

- fixed-width integer-এর `+`, `-`, `*`, unary `-`, আর bit operation-গুলো
  type-এর width অনুযায়ী wrap করে। shift-এর count `width - 1` দিয়ে mask হয়।
  শূন্য দিয়ে ভাগ বা modulo করলে panic।
- কোনো **implicit numeric conversion নেই**। `int`, `float` আর `decimal`
  মেশাতে হলে একটা স্পষ্ট `as` লাগে।
- Float-এর তুলনা IEEE-754 মেনে চলে: একটা NaN operand থাকলে `==`, `<`, `<=`,
  `>`, `>=` false হয়ে যায় আর `!=` true।

দেখুন [Number আর decimal](/bn/reference/builtins/numbers/)।

## যেগুলোর জন্য কোনো operator নেই

- **string-এ কোনো `+` নেই।** string তৈরি করা হয় interpolation দিয়ে (`"a {b} c"`),
  [`std.fmt`](/bn/reference/stdlib/fmt/) দিয়ে, বা `list.join(sep)` দিয়ে।
- **কোনো `++` / `--` নেই।** `+= 1` / `-= 1` ব্যবহার করা হয়।
- **কোনো ternary নেই।** value position-এ `if`/`match` ব্যবহার করা হয় (দেখুন
  [Control flow](/bn/guide/control-flow/))।
