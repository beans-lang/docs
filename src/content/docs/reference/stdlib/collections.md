---
title: std.collections
description: Deque, Set, SortedMap and PriorityQueue, plus generic helper functions over List and Map.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 11 package functions · 4 types · 4 constructors · 59 instance methods.
<!-- coverage:summary:end -->

`std.collections` is two things: four container types the builtins do not
cover — `Deque`, `Set`, `SortedMap` and `PriorityQueue` — and a set of generic
helper functions over the builtin `List` and `Map`. All of it is plain Beans.
Read the source under
[`stdlib/std/collections/`](https://github.com/beans-lang/beans/tree/main/stdlib/std/collections).

```beans
import std.collections
```

Some functions are generic and use trait bounds like `T implements Eq`. That
means the element type must support that trait (for example, `Eq` for equality,
`Hash` to be a map key, `Clone` to be copied). The builtin types you normally use
already support these.

## Deque

A queue open at both ends. `List.insert(0, v)` and `List.remove(0)` shift every
other element, so a list used as a queue is quadratic; this is not. Both ends
push and pop in constant time.

```beans
pub class Deque<T implements Clone>

new Deque()

pub fn push_front(value: T)
pub fn push_back(value: T)
pub fn pop_front() -> Option<T>
pub fn pop_back() -> Option<T>
pub fn first() -> Option<T>
pub fn last() -> Option<T>
pub fn get(index: int) -> Option<T>
pub fn len() -> int
pub fn is_empty() -> bool
pub fn clear()
pub fn to_list() -> List<T>
```

- `push_front`/`push_back` add at either end; `pop_front`/`pop_back` take from
  either end and answer `none` when the deque is empty.
- `first` and `last` look without removing. `get(index)` indexes from the front,
  `0` being the same element `first()` answers, and gives `none` out of range.
- `to_list` copies the elements out front-to-back and leaves the deque alone.

Reach for it when the front is a working end too: a work queue, a sliding
window, a breadth-first walk, an undo/redo pair.

<!-- beans:compile -->
```beans
import std.io
import std.collections

fn main() {
    var line: collections.Deque<string> = new collections.Deque<string>()
    line.push_back("second")
    line.push_front("first")
    line.push_back("third")
    io.println(line.len())                  // 3
    io.println(line.pop_front().or("-"))    // first
    io.println(line.last().or("-"))         // third
    io.println(line.to_list())              // [second, third]
}
```

## Set

A membership-only collection, with O(1) add, membership and removal. A
`Map<T, bool>` does the same job with a value nobody reads; this says what it
means, and answers the set-algebra questions by walking the storage rather than
copying keys into lists first.

```beans
pub class Set<T implements Eq & Hash & Clone>

new Set()

pub fn add(value: T) -> bool
pub fn add_all(values: List<T>) -> int
pub fn contains(value: T) -> bool
pub fn remove(value: T) -> bool
pub fn len() -> int
pub fn is_empty() -> bool
pub fn clear()
pub fn reserve(capacity: int)
pub fn items() -> List<T>
pub fn union_with(other: Set<T>) -> Set<T>
pub fn intersection(other: Set<T>) -> Set<T>
pub fn difference(other: Set<T>) -> Set<T>
pub fn symmetric_difference(other: Set<T>) -> Set<T>
pub fn is_subset_of(other: Set<T>) -> bool
pub fn is_superset_of(other: Set<T>) -> bool
pub fn is_disjoint_from(other: Set<T>) -> bool
pub fn equals(other: Set<T>) -> bool
```

- `add` answers true when the value was new, so you can count what you actually
  added. `add_all` returns how many of the list were new. `remove` answers true
  when the value was there.
- `reserve` sizes the storage up front. `items` copies the members out; the
  order is the storage's, not an order you should rely on.
- The four algebra methods each build a new set and leave both inputs alone.
  `union_with` is spelled that way because `union` is a keyword.
- `is_subset_of`, `is_superset_of`, `is_disjoint_from` and `equals` answer
  without building anything.

<!-- beans:compile -->
```beans
import std.io
import std.collections

fn main() {
    var left: collections.Set<int> = new collections.Set<int>()
    left.add_all([1, 2, 3])
    var right: collections.Set<int> = new collections.Set<int>()
    right.add_all([3, 4])
    io.println(left.contains(2))                    // true
    io.println(left.intersection(right).items())    // [3]
    io.println(left.is_disjoint_from(right))        // false
}
```

## SortedMap

The ordered half of the map story. `Map` answers "is this key here" and
`OrderedMap` answers "what went in first"; neither answers "what is the next key
after this one", "how many keys are below it", or "give me every key in this
range" — the questions a leaderboard, a time-series index or an expiry scan is
made of. Sorting a list answers them once and is wrong the moment the collection
changes again.

```beans
pub class SortedMap<K implements Order & Clone, V implements Clone>

new SortedMap()

pub fn set(key: K, value: V)
pub fn insert(key: K, value: V) -> bool
pub fn get(key: K) -> Option<V>
pub fn contains_key(key: K) -> bool
pub fn remove(key: K) -> bool
pub fn len() -> int
pub fn is_empty() -> bool
pub fn clear()
pub fn keys() -> List<K>
pub fn values() -> List<V>
pub fn first_key() -> Option<K>
pub fn last_key() -> Option<K>
pub fn first_value() -> Option<V>
pub fn last_value() -> Option<V>
pub fn floor_key(key: K) -> Option<K>
pub fn ceiling_key(key: K) -> Option<K>
pub fn lower_key(key: K) -> Option<K>
pub fn higher_key(key: K) -> Option<K>
pub fn rank(key: K) -> int
pub fn key_at(index: int) -> Option<K>
pub fn value_at(index: int) -> Option<V>
pub fn range_keys(from: K, to: K) -> List<K>
pub fn range_values(from: K, to: K) -> List<V>
pub fn range_count(from: K, to: K) -> int
```

- `set` writes whatever is there; `insert` only writes when the key is new and
  answers whether it did. `remove` answers true when the key was there.
- `keys` and `values` come back in key order, and every other reader below is in
  that order too.
- The four neighbour queries differ only in whether an exact match counts:
  `floor_key` is the largest key `<= key`, `ceiling_key` the smallest `>= key`,
  `lower_key` the largest strictly `<`, `higher_key` the smallest strictly `>`.
- `rank(key)` is how many keys sort before it — so it is where the key would go,
  whether or not it is present. `key_at`/`value_at` are the inverse, indexing by
  position in key order.
- The three range readers take a half-open `[from, to)`. `range_count` answers
  without building a list.

<!-- beans:compile -->
```beans
import std.io
import std.collections

fn main() {
    var scores: collections.SortedMap<int, string> = new collections.SortedMap<int, string>()
    scores.set(30, "carol")
    scores.set(10, "alice")
    scores.set(20, "bob")
    io.println(scores.keys())              // [10, 20, 30]
    io.println(scores.first_key().or(0))   // 10
    io.println(scores.floor_key(25).or(0)) // 20
    io.println(scores.rank(25))            // 2
    io.println(scores.range_keys(10, 30))  // [10, 20]
}
```

## PriorityQueue

"What happens next" — an expiry wheel, a scheduler, a Dijkstra frontier. A
binary min-heap keyed on a priority kept separate from the value: the smallest
priority comes out first. A sorted list gives the same answer and pays O(n) per
insert; this pays O(log n) and never sorts what it is not asked about.

```beans
pub class PriorityQueue<P implements Order & Clone, V implements Clone>

new PriorityQueue()

pub fn push(priority: P, value: V)
pub fn peek() -> Option<V>
pub fn peek_priority() -> Option<P>
pub fn pop() -> Option<V>
pub fn len() -> int
pub fn is_empty() -> bool
pub fn clear()
```

- `push` adds a value under a priority. Priorities need not be unique, and two
  equal priorities come out in no guaranteed order relative to each other.
- `peek` reads the next value without removing it, `peek_priority` reads its
  priority — useful for "is the earliest deadline due yet" without popping.
- `pop` removes and answers the next value, or `none` when empty.

<!-- beans:compile -->
```beans
import std.io
import std.collections

fn main() {
    var work: collections.PriorityQueue<int, string> = new collections.PriorityQueue<int, string>()
    work.push(30, "later")
    work.push(10, "urgent")
    work.push(20, "soon")
    io.println(work.peek_priority().or(0))  // 10
    io.println(work.pop().or("-"))          // urgent
    io.println(work.pop().or("-"))          // soon
    io.println(work.len())                  // 1
}
```

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
