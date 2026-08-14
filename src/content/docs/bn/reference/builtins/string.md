---
title: string
description: Beans-এর immutable UTF-8 string type আর তার প্রতিটা method।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 28 instance methods.
<!-- coverage:summary:end -->

`string` হলো immutable UTF-8 text। একবার string বানালে সেটা আর কখনো বদলায় না।
যে method একটা string "বদলায়" বলে মনে হয়, সেটা একটা নতুন string ফেরত দেয়।

string byte-ভিত্তিক। `len()` byte-এর সংখ্যা দেয়, character-এর না, আর এটা কখনো
বদলায় না। string-এর মধ্যে index হলো byte-এর অবস্থান।

string type একটা native builtin, যেটাতে পৌঁছানো হয় runtime ABI table দিয়ে —
[`compiler/beans/expression.b`](https://github.com/beans-lang/beans/blob/main/compiler/beans/expression.b)-তে।

## string বানানো আর জোড়া লাগানো

string-এ কোনো `+` নেই। কয়েক টুকরা থেকে string বানাতে interpolation ব্যবহার করা হয়:

```beans
let name: string = "beans"
let greeting: string = "hi {name}"
```

একটা `List<string>`-কে separator দিয়ে জোড়া লাগাতে `List.join` ব্যবহার করা হয়।
দেখুন [Collections](/bn/reference/builtins/collections/)।

## Size আর খালি কিনা

```beans
string.len() -> int
string.is_empty() -> bool
```

- `len()` হলো byte-এর সংখ্যা, character-এর না।
- `len()` যখন 0, তখন `is_empty()` true।

## টুকরা নেওয়া

```beans
string.first(int) -> string
string.last(int) -> string
string.slice(int, int) -> string
string.byte_at(int) -> int
```

- `first(n)` প্রথম `n` byte দেয়; `last(n)` শেষ `n` byte দেয়।
- `slice(from, to)` `[from, to)` byte-range টা দেয় (to বাদ)। range যদি সীমার
  বাইরে যায়, panic হয়।
- `byte_at(i)` `i` index-এর byte value দেয়, আর `i` সীমার বাইরে হলে panic হয়।

```beans
let s: string = "hello"
let h: string = s.first(1)
let lo: string = s.slice(3, 5)
```

## খোঁজা

```beans
string.contains(string) -> bool
string.starts_with(string) -> bool
string.ends_with(string) -> bool
string.find(string) -> Option<int>
string.rfind(string) -> Option<int>
```

- `contains`, `starts_with`, আর `ends_with` হ্যাঁ/না ধরনের প্রশ্নের উত্তর দেয়।
- `find` প্রথম match-এর byte index দেয়, `rfind` দেয় শেষটার। খোঁজা জিনিসটা না
  থাকলে দুইটাই `none` দেয়।
- খালি needle-এর বেলায় `find` দেয় `0`, আর `rfind` দেয় `len`।

```beans
match "hello".find("ll") {
    some(i) => io.println("found at {i}"),
    none => io.println("not found"),
}
```

## পরিষ্কার করা আর case

```beans
string.trim() -> string
string.trim_start() -> string
string.trim_end() -> string
string.to_upper() -> string
string.to_lower() -> string
```

- `trim` দুই পাশ থেকে ASCII whitespace সরায়; `trim_start` আর `trim_end` এক পাশ
  থেকে সরায়।
- `to_upper` আর `to_lower` শুধু ASCII অক্ষর বদলায়। non-ASCII byte যেমন ছিল তেমনই
  থাকে।

## নতুন string বানানো

```beans
string.replace(string, string) -> string
string.repeat(int) -> string
```

- `replace(old, new)` `old`-এর প্রতিটা match বদলে দেয়। `old` খালি হলে কিছুই
  বদলায় না।
- `repeat(n)` string-টা `n` বার পুনরাবৃত্তি করে, আর `n` negative হলে panic হয়।

## ভাগ করা

```beans
string.split(string) -> List<string>
string.lines() -> List<string>
```

- `split(sep)` `sep`-এর ওপর ভাগ করে আর খালি টুকরাগুলোও রাখে। `sep` খালি হলে পুরো
  string-টাকেই একটা টুকরা হিসেবে দেয়।
- `lines()` string-টাকে লাইনে লাইনে ভাগ করে।

```beans
let parts: List<string> = "a,b,,c".split(",")
// ["a", "b", "", "c"]
```

## number-এ parse করা

```beans
string.to_int() -> Result<int>
string.to_float() -> Result<float>
string.to_decimal() -> Result<decimal>
```

প্রতিটা `Result` দেয়, কারণ text-টা হয়তো number নয়। দেখুন
[Option, Result, আর Error](/bn/reference/builtins/option-result/)।

## Character (UTF-8)

`len()` byte গোনে। নিচের দুইটা method গোটা UTF-8 character নিয়ে কাজ করে।

```beans
string.chars() -> List<string>
string.count_chars(int, int) -> int
```

- `chars()` প্রতিটা UTF-8 character-কে নিজের একটা এক-character string হিসেবে দেয়।
- `count_chars(from, to)` `[from, to)` byte-range-এ কতগুলো character আছে তা দেয়।

## নিচু-স্তরের সাহায্যকারী

এগুলো সরাসরি byte নিয়ে কাজ করে, আর সাধারণ return value দেয়, `Option` না।

```beans
string.find_byte(int, int) -> int
string.range_equals(int, int, string) -> bool
string.parse_int_range_or(int, int, int) -> int
```

- `find_byte(byte, from)` `from` বা তার পরে `byte`-টা কোথায় আছে তার index দেয়, আর
  না থাকলে `-1` দেয়।
- `range_equals(from, to, other)` true হয় যখন `[from, to)` byte-range টা `other`-এর
  সমান।
- `parse_int_range_or(from, to, fallback)` byte-range-টাকে একটা int হিসেবে parse
  করে, আর number না হলে `fallback` ফেরত দেয়।

## এক ঝলক ঘুরে দেখা

<!-- beans:compile -->
```beans
import std.io

fn main() {
    let s: string = "  Beans Language  "
    let t: string = s.trim()
    io.println("{t.len()} bytes, empty {t.is_empty()}")
    io.println("{t.to_upper()} / {t.to_lower()}")
    io.println("{t.starts_with("Beans")} {t.contains("Lang")}")

    match t.find("Lang") {
        some(i) => io.println("Lang at byte {i}"),
        none => io.println("not found"),
    }

    let parts: List<string> = "a,b,,c".split(",")
    io.println("{parts.len()} parts, third is \"{parts[2]}\"")

    let n: int = "  42  ".trim().to_int().expect("a number")
    io.println("{n + 1}")
}
```

## আরও দেখুন

- [Bytes](/bn/reference/builtins/bytes/), বদলানো যায় এমন byte buffer।
- [Numbers আর decimal](/bn/reference/builtins/numbers/), parse-এর target গুলো।
- [Collections](/bn/reference/builtins/collections/), `List<string>` আর `join`।
