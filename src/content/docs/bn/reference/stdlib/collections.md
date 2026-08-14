---
title: std.collections
description: List আর Map-এর উপর generic helper function — গোনা, filter করা, রূপান্তর, আর মার্জ করার জন্য।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 11 package functions.
<!-- coverage:summary:end -->

`std.collections` builtin `List` আর `Map` type-এর উপর কিছু কমন algorithm যোগ করে।
storage-টা থাকে কম্পাইলারে; এই function-গুলো তার উপরে বসানো সাদামাটা Beans কোড।
সোর্স পড়ো
[`stdlib/std/collections/collections.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/collections/collections.b)-তে।

```beans
import std.collections
```

কিছু function generic, আর এরা `T implements Eq`-এর মতো trait bound ব্যবহার করে।
অর্থাৎ element-এর type-টাকে সেই trait সাপোর্ট করতে হবে (যেমন সমতার জন্য `Eq`, map key
হতে হলে `Hash`, কপি হতে হলে `Clone`)। সাধারণত যেসব builtin type ব্যবহার করা হয়,
সেগুলো এসব আগে থেকেই সাপোর্ট করে।

## List helper

```beans
pub fn sum_int(values: List<int>) -> int
pub fn frequencies(values: List<string>) -> Map<string, int>
pub fn count<T implements Eq>(values: List<T>, needle: T) -> int
pub fn filter<T implements Clone>(values: List<T>, keep: fn(T) -> bool) -> List<T>
pub fn transform<T implements Clone, U>(values: List<T>, apply: fn(T) -> U) -> List<U>
pub fn unique<T implements Eq & Hash & Clone>(values: List<T>) -> List<T>
```

- `sum_int` int-এর একটা list যোগ করে দেয়। `frequencies` কোন string কতবার আছে সেটা
  গোনে। `count` `needle`-এর সমান কয়টা item আছে সেটা গোনে।
- `filter` শুধু সেই item-গুলো রাখে যেগুলোর জন্য `keep` true ফেরত দেয়। `transform`
  প্রতিটা item-এ `apply` চালিয়ে একটা নতুন list বানায়। `unique` ডুপ্লিকেট বাদ দেয়,
  আর প্রথমবার দেখার ক্রমটা রাখে।

```beans
import std.io
import std.collections

fn main() {
    let nums: List<int> = [3, 1, 3, 2, 1]
    io.println(collections.sum_int(nums))                 // 10
    io.println(collections.count(nums, 3))                // 2
    let odds: List<int> = collections.filter(nums, fn(n: int) -> bool { return n % 2 == 1 })
    io.println(odds)                                       // [3, 1, 3, 1]
    io.println(collections.unique(nums))                  // [3, 1, 2]
}
```

## Map helper

এদের কয়েকটা `inout` map নেয়। `inout`-এর অর্থ function-টা caller-এর নিজের map-টাকেই
জায়গামতো বদলে দেয়; আলাদা কোনো কপি ফেরত আসে না। কল শেষে map-এ নতুন
অবস্থাটাই থাকে।

```beans
pub fn increment<K implements Eq & Hash>(inout values: Map<K, int>, key: K, delta: int) -> int
pub fn get_or_insert_with<K implements Eq & Hash, V implements Clone>(inout values: Map<K, V>, key: K, make: fn() -> V) -> V
pub fn merge_with<K implements Eq & Hash & Clone, V implements Clone>(inout target: Map<K, V>, source: Map<K, V>, combine: fn(V, V) -> V)
pub fn remove_if<K implements Eq & Hash & Clone, V implements Clone>(inout values: Map<K, V>, remove: fn(K, V) -> bool) -> int
pub fn map_values_with_key<K implements Eq & Hash & Clone, V implements Clone, U>(values: Map<K, V>, apply: fn(K, V) -> U) -> Map<K, U>
```

- `increment` `key`-এর value-তে `delta` যোগ করে, key না থাকলে 0 থেকে শুরু করে, আর
  নতুন count ফেরত দেয়।
- `get_or_insert_with` `key`-এর value ফেরত দেয়, নয়তো `make()` যা দেয় সেটা insert
  করে আর সেটাই ফেরত দেয়।
- `merge_with` `source`-কে `target`-এর ভেতর ভাঁজ করে ঢোকায়। যে key দুই জায়গাতেই
  আছে, সেখানে সে `combine(old, new)` রাখে।
- `remove_if` প্রতিটা entry বাদ দেয় যেখানে `remove` true ফেরত দেয়, আর কয়টা বাদ
  গেল সেটা জানায়।
- `map_values_with_key` একই key নিয়ে একটা নতুন map বানায়, আর value নেয়
  `apply(key, value)` থেকে।

```beans
import std.io
import std.collections

fn main() {
    var counts: Map<string, int> = {}
    collections.increment(inout counts, "a", 1)
    collections.increment(inout counts, "a", 2)   // counts["a"] is now 3
    io.println(counts.get("a"))              // some(3)
}
```

## আরও দেখুন

- [Collections](/bn/reference/builtins/collections/) — builtin `List` আর `Map` type,
  যাদের উপর এই helper-গুলো কাজ করে।
