---
title: Collections
description: The built-in collection types List, Map, and OrderedMap and their methods.
---

Beans has three builtin collection types: `List` for an ordered sequence, and
`Map` and `OrderedMap` for key-value lookups. All three are generic, so you name
the element or key/value types.

`List`, `Map`, and `OrderedMap` are move-only outer handles. When you bind,
assign, or return one, use `move`; function parameters borrow by default. See
[the memory model](/guide/memory/) for what that means.

## List&lt;T&gt;

`List<T>` holds items of type `T` in order. Write a list literal with square
brackets:

```beans
let nums: List<int> = [1, 2, 3]
```

### Reading

| Method | Returns | Notes |
| --- | --- | --- |
| `len()` | `int` | number of items |
| `is_empty()` | `bool` | true when empty |
| `first()` | `Option<T>` | first item, or `none` |
| `last()` | `Option<T>` | last item, or `none` |
| `get(i)` | `Option<T>` | item at `i`, or `none` |
| `contains(x)` | `bool` | is `x` present (needs `T: Eq`) |
| `index_of(x)` | `Option<int>` | index of `x` (needs `T: Eq`) |
| `max()` | `Option<T>` | largest item (needs `T: Order`) |
| `min()` | `Option<T>` | smallest item (needs `T: Order`) |

Bracket read `list[i]` panics if `i` is out of range. Use `get(i)` when you want
an `Option` instead.

```beans
let x: int = nums[0]        // panics if empty
match nums.get(5) {
    some(v) => io.println("{v}"),
    none => io.println("no item there"),
}
```

### Changing

| Method | Returns | Notes |
| --- | --- | --- |
| `push(x)` | | add at the end |
| `pop()` | `Option<T>` | remove and return the last item |
| `insert(i, v)` | | insert `v` at index `i` |
| `remove(i)` | `T` | remove and return item at `i`; panics if out of range; consumes the item |
| `reverse()` | | reverse in place |
| `clear()` | | remove all items |
| `reserve(cap)` | | make room for `cap` items |

Bracket assign `list[i] = v` writes item `i`.

### Copying and slicing

| Method | Returns | Notes |
| --- | --- | --- |
| `clone()` | `List<T>` | a full copy (needs `T: Clone`, not move-only) |
| `slice(from, to)` | `List<T>` | a copy of items in `[from, to)`; panics if out of range |

### Sorting

| Method | Notes |
| --- | --- |
| `sort()` | sort in order (needs `T: Order`) |
| `sort_by(fn(a: T, b: T) -> bool)` | sort by a strict less-than predicate |
| `sort_by_key(fn(T) -> int)` | sort by an integer key |

All sorts are stable: equal items keep their original order.

```beans
let words: List<string> = ["pear", "fig", "apple"]
words.sort_by_key(fn(w: string) -> int { w.len() })
```

### Joining

`join(sep)` returns a `string`. It joins a `List<string>` with the separator
between items.

```beans
let csv: string = ["a", "b", "c"].join(",")
// "a,b,c"
```

## Map&lt;K, V&gt; and OrderedMap&lt;K, V&gt;

Both store values under keys. The key type `K` must implement `Eq` and `Hash`.

- `Map` has no iteration order.
- `OrderedMap` keeps the order in which you inserted keys.

They share the same methods. Write a map literal with braces; the empty map is
`{}`:

```beans
let ages: Map<string, int> = {"ann": 30, "ben": 25}
let empty: Map<string, int> = {}
```

### Methods

| Method | Returns | Notes |
| --- | --- | --- |
| `get(k)` | `Option<V>` | value under `k`, or `none` |
| `set(k, v)` | | set the value under `k`; also `m[k] = v` |
| `insert(k, v)` | `bool` | insert only if `k` is new; `false` leaves the old value |
| `contains_key(k)` | `bool` | is `k` present |
| `remove(k)` | `bool` | remove `k`; `true` if it was there |
| `keys()` | `List<K>` | all keys |
| `values()` | `List<V>` | all values |
| `len()` | `int` | number of pairs |
| `clear()` | | remove all pairs |
| `reserve(cap)` | | make room for `cap` pairs |
| `clone()` | `Map<K, V>` | a full copy (needs `K, V: Clone`) |

Bracket read `map[key]` panics if the key is missing. Use `get(key)` for an
`Option`.

:::note[The check is contains_key]
To test for a key, the method is `contains_key`, not `contains`.
:::

```beans
if ages.contains_key("ann") {
    let a: int = ages["ann"]
    io.println("{a}")
}
```

## See also

- [The memory model](/guide/memory/) — move-only handles and `move`.
- [Option, Result, and Error](/reference/builtins/option-result/) — the return type of `get`, `pop`, `first`.
- [string](/reference/builtins/string/) — `split` returns a `List<string>`.
