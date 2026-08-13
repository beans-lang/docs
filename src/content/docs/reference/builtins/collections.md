---
title: Collections
description: The built-in collection types List, Map, and OrderedMap and their methods.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 3 types · 44 instance methods.
<!-- coverage:summary:end -->

Beans has three builtin collection types: `List` for an ordered sequence, and
`Map` and `OrderedMap` for key-value lookups. All three are generic, so you name
the element or key/value types. They are native builtins with no `.b` source, so
their method signatures are positional: the type in each slot is fixed, the names
are not.

`List`, `Map`, and `OrderedMap` are move-only outer handles. When you bind,
assign, or return one, use `move`; function parameters borrow by default. Calling a
method that changes the collection needs a `var` binding. See
[the memory model](/guide/memory/) for what that means.

## List&lt;T&gt;

`List<T>` holds items of type `T` in order. Write a list literal with square
brackets:

```beans
let nums: List<int> = [1, 2, 3]
```

```beans
List<T>.len() -> int
List<T>.is_empty() -> bool
List<T>.first() -> Option<T>
List<T>.last() -> Option<T>
List<T>.get(int) -> Option<T>
List<T>.contains(T) -> bool
List<T>.index_of(T) -> Option<int>
List<T>.max() -> Option<T>
List<T>.min() -> Option<T>
List<T>.push(T)
List<T>.pop() -> Option<T>
List<T>.insert(int, T)
List<T>.remove(int) -> T
List<T>.reverse()
List<T>.clear()
List<T>.reserve(int)
List<T>.clone() -> List<T>
List<T>.slice(int, int) -> List<T>
List<T>.sort()
List<T>.sort_by(fn(T, T) -> bool)
List<T>.sort_by_key(fn(T) -> int)
List<T>.join(string) -> string
```

**Reading.** `len` and `is_empty` report the count. `first`, `last`, and `get(i)`
return an `Option<T>`, `none` when the index is out of range. `contains(x)` and
`index_of(x)` need `T` to implement `Eq`. `max` and `min` need `T` to implement
`Order`.

Bracket read `list[i]` panics if `i` is out of range. Use `get(i)` when you want
an `Option` instead:

```beans
let x: int = nums[0]        // panics if empty
match nums.get(5) {
    some(v) => io.println("{v}"),
    none => io.println("no item there"),
}
```

**Changing.** `push` adds at the end. `pop` removes and returns the last item as an
`Option<T>`. `insert(i, v)` shifts later items down. `remove(i)` removes and returns
the item at `i`, panics if `i` is out of range, and consumes the item. `reverse`
reverses in place, `clear` empties the list, and `reserve(cap)` makes room for
`cap` items without changing the length. Bracket assign `list[i] = v` writes item
`i`.

**Copying and slicing.** `clone()` makes a full copy and needs `T` to implement
`Clone` and not be move-only. `slice(from, to)` returns a fresh list with the items
in `[from, to)` and panics if the range is out of bounds.

There is no new view type or syntax. A normal `for` loop over a stable `List`
borrows its existing storage when the compiler proves that the loop cannot
change the list and the item binding cannot escape. Loops that can mutate the
source keep the old snapshot behavior. A temporary `slice(...)` used only by an
immediate read-only loop or consumer may be fused away; storing or returning the
slice still makes the independent list promised by this API.

**Sorting.** `sort()` needs `T` to implement `Order`. `sort_by` takes a strict
less-than predicate; `sort_by_key` sorts by an integer key computed once per item.
All three sorts are stable: equal items keep their original order.

```beans
var words: List<string> = ["pear", "fig", "apple"]
words.sort_by_key(fn(w: string) -> int { return w.len() })
```

**Joining.** `join(sep)` joins a `List<string>` into one string with `sep` between
items:

```beans
let csv: string = ["a", "b", "c"].join(",")
// "a,b,c"
```

A small program that builds, sorts, and reads a list:

<!-- beans:compile -->
```beans
import std.io

fn main() {
    var nums: List<int> = [3, 1, 2]
    nums.push(4)
    nums.sort()
    io.println("{nums} has {nums.len()} items")

    match nums.first() {
        some(v) => io.println("smallest is {v}"),
        none => io.println("empty"),
    }
    io.println("contains 2: {nums.contains(2)}")
}
```

## Map&lt;K, V&gt; and OrderedMap&lt;K, V&gt;

Both store values under keys, and the key type `K` must implement `Eq` and `Hash`.

- `Map` has no iteration order.
- `OrderedMap` keeps the order in which you inserted keys.

Iterate over keys and values together without making a list or repeating a map
lookup:

```beans
for name: string, age: int in ages {
    io.println("{name}: {age}")
}
```

This direct loop is O(n) and allocation-free. It follows insertion order for an
`OrderedMap`. Adding or removing entries during the loop panics before the next
entry is read. Replacing the value of an existing key is allowed.

They share the same methods. Write a map literal with braces; the empty map is
`{}`:

```beans
let ages: Map<string, int> = {"ann": 30, "ben": 25}
let empty: Map<string, int> = {}
```

```beans
Map<K, V>.get(K) -> Option<V>
Map<K, V>.set(K, V)
Map<K, V>.insert(K, V) -> bool
Map<K, V>.contains_key(K) -> bool
Map<K, V>.remove(K) -> bool
Map<K, V>.keys() -> List<K>
Map<K, V>.values() -> List<V>
Map<K, V>.len() -> int
Map<K, V>.clear()
Map<K, V>.reserve(int)
Map<K, V>.clone() -> Map<K, V>
```

```beans
OrderedMap<K, V>.get(K) -> Option<V>
OrderedMap<K, V>.set(K, V)
OrderedMap<K, V>.insert(K, V) -> bool
OrderedMap<K, V>.contains_key(K) -> bool
OrderedMap<K, V>.remove(K) -> bool
OrderedMap<K, V>.keys() -> List<K>
OrderedMap<K, V>.values() -> List<V>
OrderedMap<K, V>.len() -> int
OrderedMap<K, V>.clear()
OrderedMap<K, V>.reserve(int)
OrderedMap<K, V>.clone() -> OrderedMap<K, V>
```

- `get(k)` returns `Option<V>`, `none` when the key is missing.
- `set(k, v)` writes the value under `k`, replacing any old one; the same as
  `m[k] = v`. `insert(k, v)` writes only when `k` is new, and returns `false`
  without changing anything when the key already exists.
- `contains_key(k)` tests for a key. `remove(k)` deletes it and returns `true` when
  the key was present.
- `keys()` and `values()` return lists in the map's iteration order.
- `len` counts the pairs, `clear` empties the map, and `reserve(cap)` makes room
  for `cap` pairs. `clone()` makes a full copy and needs both `K` and `V` to
  implement `Clone`.

Bracket read `map[key]` panics if the key is missing. Use `get(key)` for an
`Option`.

:::note[The check is contains_key]
To test for a key, the method is `contains_key`, not `contains`.
:::

<!-- beans:compile -->
```beans
import std.io

fn main() {
    var ages: Map<string, int> = {"ann": 30}
    ages.set("ben", 25)

    let added: bool = ages.insert("ann", 99)
    io.println("insert added a new key: {added}")

    match ages.get("ben") {
        some(age) => io.println("ben is {age}"),
        none => io.println("no ben"),
    }

    for name: string, age: int in ages {
        io.println("{name}: {age}")
    }
    io.println("{ages.len()} people")
}
```

## See also

- [The memory model](/guide/memory/), move-only handles and `move`.
- [Option, Result, and Error](/reference/builtins/option-result/), the return type of `get`, `pop`, `first`.
- [string](/reference/builtins/string/), `split` returns a `List<string>`.
