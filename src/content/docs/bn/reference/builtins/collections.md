---
title: Collections
description: builtin collection type List, Map, আর OrderedMap আর তাদের method গুলো।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 3 types · 44 instance methods.
<!-- coverage:summary:end -->

Beans-এ তিনটা builtin collection type আছে: সাজানো ক্রমের জন্য `List`, আর key-value
lookup-এর জন্য `Map` ও `OrderedMap`। তিনটাই generic, তাই element বা key/value-এর
type নিজে ঠিক করা যায়। এগুলো native builtin, এদের কোনো `.b` source নেই, তাই এদের
method signature গুলো positional: প্রতিটা জায়গায় type-টা fixed, নাম গুলো না।

`List`, `Map`, আর `OrderedMap` হলো move-only outer handle। এদের bind, assign,
বা return করার সময় `move` ব্যবহার করা হয়; function parameter default-এ borrow করে।
collection-টা বদলায় এমন method call করতে একটা `var` binding লাগে। এটা কী বোঝায়,
সেটা দেখতে [memory model](/bn/guide/memory/) পড়ুন।

## List&lt;T&gt;

`List<T>` `T` type-এর item গুলো ক্রম মেনে রাখে। square bracket দিয়ে একটা list
literal লেখা হয়:

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

**পড়া।** `len` আর `is_empty` কতগুলো item আছে সেটা জানায়। `first`, `last`, আর
`get(i)` একটা `Option<T>` দেয়, index সীমার বাইরে হলে `none`। `contains(x)` আর
`index_of(x)`-এর জন্য `T`-কে `Eq` implement করতে হয়। `max` আর `min`-এর জন্য `T`-কে
`Order` implement করতে হয়।

Bracket দিয়ে পড়া `list[i]` `i` সীমার বাইরে হলে panic করে। `Option` চাইলে `get(i)`
ব্যবহার করা হয়:

```beans
let x: int = nums[0]        // panics if empty
match nums.get(5) {
    some(v) => io.println("{v}"),
    none => io.println("no item there"),
}
```

**বদলানো।** `push` শেষে যোগ করে। `pop` শেষ item-টা সরায় আর `Option<T>` হিসেবে ফেরত
দেয়। `insert(i, v)` পরের item গুলোকে নিচে সরিয়ে দেয়। `remove(i)` `i`-এর item-টা
সরায় আর ফেরত দেয়, `i` সীমার বাইরে হলে panic করে, আর item-টা consume করে। `reverse`
জায়গায় বসেই উল্টে দেয়, `clear` list খালি করে, আর `reserve(cap)` length না বদলে
`cap`টা item-এর জায়গা বানায়। Bracket দিয়ে assign `list[i] = v` `i` item-টা লেখে।

**copy আর slice।** `clone()` পুরো একটা copy বানায়, আর এর জন্য `T`-কে `Clone`
implement করতে হয় এবং move-only হওয়া চলবে না। `slice(from, to)` `[from, to)`-এর
item গুলো নিয়ে একটা নতুন list দেয়, আর range সীমার বাইরে হলে panic করে।

এখানে নতুন কোনো view type বা syntax নেই। একটা স্থির `List`-এর ওপর সাধারণ `for`
loop তার বর্তমান storage-ই ধার করে, যখন compiler প্রমাণ করতে পারে যে loop-টা
list বদলাতে পারবে না আর item binding-টা বাইরে বেরোতে পারবে না। যেসব loop source
বদলাতে পারে, সেগুলো পুরনো snapshot নিয়মেই চলে। শুধু একটা তাৎক্ষণিক read-only loop
বা consumer যে `slice(...)` ব্যবহার করে, সেটা মিলিয়ে ফেলা হতে পারে; কিন্তু slice-টা
জমিয়ে রাখলে বা return করলে এই API যেমন বলেছে তেমন আলাদা একটা list-ই তৈরি হয়।

**Sort।** `sort()`-এর জন্য `T`-কে `Order` implement করতে হয়। `sort_by` একটা কড়া
less-than predicate নেয়; `sort_by_key` একটা integer key দিয়ে sort করে, যেটা প্রতি
item-এ একবার হিসাব হয়। তিনটা sort-ই stable: সমান item গুলো তাদের আগের ক্রমেই থাকে।

```beans
var words: List<string> = ["pear", "fig", "apple"]
words.sort_by_key(fn(w: string) -> int { return w.len() })
```

**জোড়া লাগানো।** `join(sep)` একটা `List<string>`-কে একটা string-এ জোড়া লাগায়,
item গুলোর মাঝে `sep` বসিয়ে:

```beans
let csv: string = ["a", "b", "c"].join(",")
// "a,b,c"
```

একটা ছোট program, যেটা একটা list বানায়, sort করে, আর পড়ে:

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

দুইটাই key-এর নিচে value রাখে, আর key type `K`-কে `Eq` ও `Hash` implement করতে হয়।

- `Map`-এর কোনো iteration order নেই।
- `OrderedMap` যে ক্রমে key ঢোকানো হয়েছে সেই ক্রম রাখে।

কোনো list না বানিয়ে বা বারবার map lookup না করে key আর value একসাথে ঘুরে দেখা যায়:

```beans
for name: string, age: int in ages {
    io.println("{name}: {age}")
}
```

এই সরাসরি loop-টা O(n) আর কোনো allocation করে না। `OrderedMap`-এর বেলায় এটা
insertion order মেনে চলে। loop চলার সময় entry যোগ বা সরালে, পরের entry পড়ার আগেই
panic হয়। কোনো existing key-এর value বদলানো চলে।

দুইটার method একই। brace দিয়ে map literal লেখা হয়; খালি map হলো `{}`:

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

- `get(k)` `Option<V>` দেয়, key না থাকলে `none`।
- `set(k, v)` `k`-এর নিচে value লেখে, আগের যেকোনোটা বদলে দিয়ে; এটা `m[k] = v`-এর
  সমান। `insert(k, v)` শুধু তখনই লেখে যখন `k` নতুন, আর key আগে থেকেই থাকলে কিছু না
  বদলে `false` দেয়।
- `contains_key(k)` একটা key আছে কিনা দেখে। `remove(k)` সেটা মুছে দেয় আর key
  ছিল বলে `true` দেয়।
- `keys()` আর `values()` map-এর iteration order-এ list দেয়।
- `len` জোড়া গোনে, `clear` map খালি করে, আর `reserve(cap)` `cap`টা জোড়ার জায়গা
  বানায়। `clone()` পুরো একটা copy বানায়, আর এর জন্য `K` ও `V` দুইটাকেই `Clone`
  implement করতে হয়।

Bracket দিয়ে পড়া `map[key]` key না থাকলে panic করে। `Option`-এর জন্য `get(key)`
ব্যবহার করা হয়।

:::note[চেক করার method হলো contains_key]
একটা key আছে কিনা দেখতে method-টা `contains_key`, `contains` না।
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

## আরও দেখুন

- [memory model](/bn/guide/memory/), move-only handle আর `move`।
- [Option, Result, আর Error](/bn/reference/builtins/option-result/), `get`, `pop`, `first`-এর return type।
- [string](/bn/reference/builtins/string/), `split` একটা `List<string>` দেয়।
