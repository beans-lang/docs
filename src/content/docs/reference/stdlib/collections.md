---
title: std.collections
description: Generic helper functions over List and Map, for counting, filtering, transforming, and merging.
---

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

| Function | What it does |
| --- | --- |
| `sum_int(values: List<int>) -> int` | add up a list of ints |
| `frequencies(values: List<string>) -> Map<string, int>` | count how often each string appears |
| `count<T implements Eq>(values: List<T>, needle: T) -> int` | count how many items equal `needle` |
| `filter<T implements Clone>(values: List<T>, keep: fn(T) -> bool) -> List<T>` | keep items for which `keep` returns true |
| `transform<T implements Clone, U>(values: List<T>, apply: fn(T) -> U) -> List<U>` | make a new list by applying `apply` to each item |
| `unique<T implements Eq & Hash & Clone>(values: List<T>) -> List<T>` | drop duplicates, keeping first-seen order |

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

| Function | What it does |
| --- | --- |
| `increment<K implements Eq & Hash>(inout values: Map<K, int>, key: K, delta: int) -> int` | add `delta` to `key`'s count (starting from 0), return the new count |
| `get_or_insert_with<K implements Eq & Hash, V implements Clone>(inout values: Map<K, V>, key: K, make: fn() -> V) -> V` | return the value at `key`, or insert what `make()` gives and return that |
| `merge_with<K implements Eq & Hash & Clone, V implements Clone>(inout target: Map<K, V>, source: Map<K, V>, combine: fn(V, V) -> V)` | fold `source` into `target`; on a key clash, keep `combine(old, new)` |
| `remove_if<K implements Eq & Hash & Clone, V implements Clone>(inout values: Map<K, V>, remove: fn(K, V) -> bool) -> int` | drop each entry where `remove` returns true; return how many were dropped |
| `map_values_with_key<K implements Eq & Hash & Clone, V implements Clone, U>(values: Map<K, V>, apply: fn(K, V) -> U) -> Map<K, U>` | build a new map with the same keys and values from `apply(key, value)` |

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

- [Collections](/reference/builtins/collections/) — the builtin `List` and `Map`
  types these helpers work on.
