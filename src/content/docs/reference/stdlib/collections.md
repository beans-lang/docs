---
title: std.collections
description: Generic helper functions over List and Map, for counting, filtering, transforming, and merging.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 11 package functions.
<!-- coverage:summary:end -->

`std.collections` adds common algorithms on top of the builtin `List` and `Map`
types. The storage lives in the compiler; these functions are plain Beans on top.
Read the source at
[`stdlib/std/collections/collections.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/collections/collections.b).

```beans
import std.collections
```

Some functions are generic and use trait bounds like `T implements Eq`. That
means the element type must support that trait (for example, `Eq` for equality,
`Hash` to be a map key, `Clone` to be copied). The builtin types you normally use
already support these.

## List helpers

```beans
pub fn sum_int(values: List<int>) -> int
pub fn frequencies(values: List<string>) -> Map<string, int>
pub fn count<T implements Eq>(values: List<T>, needle: T) -> int
pub fn filter<T implements Clone>(values: List<T>, keep: fn(T) -> bool) -> List<T>
pub fn transform<T implements Clone, U>(values: List<T>, apply: fn(T) -> U) -> List<U>
pub fn unique<T implements Eq & Hash & Clone>(values: List<T>) -> List<T>
```

- `sum_int` adds up a list of ints. `frequencies` counts how often each string
  appears. `count` counts how many items equal `needle`.
- `filter` keeps the items for which `keep` returns true. `transform` makes a new
  list by applying `apply` to each item. `unique` drops duplicates, keeping
  first-seen order.

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

## Map helpers

Several of these take `inout` maps. `inout` means the function changes the
caller's own map in place; you do not get a copy back. After the call, your map
holds the new state.

```beans
pub fn increment<K implements Eq & Hash>(inout values: Map<K, int>, key: K, delta: int) -> int
pub fn get_or_insert_with<K implements Eq & Hash, V implements Clone>(inout values: Map<K, V>, key: K, make: fn() -> V) -> V
pub fn merge_with<K implements Eq & Hash & Clone, V implements Clone>(inout target: Map<K, V>, source: Map<K, V>, combine: fn(V, V) -> V)
pub fn remove_if<K implements Eq & Hash & Clone, V implements Clone>(inout values: Map<K, V>, remove: fn(K, V) -> bool) -> int
pub fn map_values_with_key<K implements Eq & Hash & Clone, V implements Clone, U>(values: Map<K, V>, apply: fn(K, V) -> U) -> Map<K, U>
```

- `increment` adds `delta` to `key`'s value, starting from 0 for a missing key, and
  returns the new count.
- `get_or_insert_with` returns the value at `key`, or inserts what `make()` gives
  and returns that.
- `merge_with` folds `source` into `target`. On a key that exists in both, it keeps
  `combine(old, new)`.
- `remove_if` drops each entry where `remove` returns true and returns how many were
  dropped.
- `map_values_with_key` builds a new map with the same keys and values taken from
  `apply(key, value)`.

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

## See also

- [Collections](/reference/builtins/collections/), the builtin `List` and `Map`
  types these helpers work on.
