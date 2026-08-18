---
title: Memory and ownership
description: Beans কীভাবে memory সামলায় — automatic reference counting, cycle collector, move semantics আর shared-ownership handle দিয়ে।
---

Beans memory সামলায় **automatic reference counting (ARC)** আর তার সাথে একটা
**cycle collector** দিয়ে। কোনো tracing garbage collector নেই, আর সোজা পথে
চলা কোডে কোনো pause-ও নেই। এই পেজে model-টা আর সেটাকে নিয়ন্ত্রণ করার
tool-গুলো, দুটোই ব্যাখ্যা করা হয়েছে।

## Reference counting

heap-এ থাকা প্রতিটা value-এর সাথে একটা ছোট header থাকে (একটা atomic count আর
shape-এর তথ্য)। compiler ownership-এর সীমানায় retain আর release বসিয়ে দেয়,
আর কোনো value-এর count শূন্যে নামলে একটা generic destructor তার ভেতরের গড়ন
ঘুরে ঘুরে পরিষ্কার করে। ধ্বংসটা একদম নিশ্চিত: শেষ reference-টা যেই মুহূর্তে
পড়ে যায়, ঠিক তখনই — আর যে thread-এ পড়েছে সেই thread-এই — [`deinit`](/bn/guide/classes/)
চলে।

design-টা reference counting-কে hot path থেকে দূরে রাখে: **function argument,
loop variable আর read — এগুলো retain না করে borrow করে।** retain-এর দাম
তখনই দিতে হয় যখন সত্যিই value-টা রেখে দেওয়া হচ্ছে। যেহেতু একটা সাধারণ reference পাস
হওয়া আর পড়ার সময় শুধু borrow হয়, বেশিরভাগ কোডে ownership নিয়ে একটা লাইনও লিখতে
হয় না।

## Cycle

শুধু reference counting দিয়ে একটা cycle মুক্ত করা যায় না (`a.next = some(b);
b.next = some(a)`)। Beans cycle ধরে একটা **cycle collector** দিয়ে (trial
deletion, Bacon-Rajan / Nim ORC ঘরানার): কোনো decrement শূন্যে না নামলে সেই
object-কে সম্ভাব্য cycle root হিসেবে সরিয়ে রাখা হয়; যখন যথেষ্ট root জমে যায়,
collector প্রতিটা root-এর subgraph-কে trial-delete করে, বাইরে থেকে এখনও যেসব
রেফার হচ্ছে সেগুলো ফিরিয়ে আনে, আর বাকিটা মুক্ত করে দেয়।

- এটা চলে শুধু statement-এর মাঝখানে, যখন কোনো worker thread চালু নেই, আর আরও
  একবার program শেষ হওয়ার সময়।
- সব walk iterative, তাই খুব বড় একটা drop হওয়া গড়নও stack overflow ঘটাবে না।
- কোনো object যদি **cycle-এর ভেতরে** মরে, তার `deinit` চলে না। cycle নিজে
  থেকে কখনও শূন্যে নামে না, তাই object যদি কোনো resource ধরে থাকে (একটা file,
  একটা socket), সেই resource ছাড়া হয় না। declarative সমাধান হলো একটা `weak`
  field, যেটা এর পরেই বলা আছে; `Shared<T>`-এর cycle ভাঙে `Weak<T>` দিয়ে।

:::note[যেটা এখনও পারে না]
worker thread চলার সময় collection পিছিয়ে রাখা হয়। কোনো program যদি একটা
দীর্ঘজীবী worker-এর পাশে বসে অবিরাম cycle বানাতে থাকে, worker-টা শেষ না হওয়া
পর্যন্ত সেটা বাড়তেই থাকতে পারে।
:::

## weak field

`weak` declare করা class field হলো একটা **zeroing reference**: referent-এর ওপর
এটা কোনো ownership count ধরে না, তাই এটা কখনও cycle-এর edge হয় না। এর type
হতে হবে `Option<C>` — যেখানে `C` একটা non-`unique` class — আর default হতে
হবে `none`।

<!-- beans:compile -->
```beans
package main

import std.io

class Node {
    name: string = ""
    child: Option<Node> = none        // owning: parent-ই child-কে বাঁচিয়ে রাখে
    weak parent: Option<Node> = none  // non-owning: parent মরলেই শূন্য হয়ে যায়

    fn deinit() { io.println("gone {self.name}") }
}

fn main() {
    let parent: Node = new Node()
    parent.name = "parent"
    let child: Node = new Node()
    child.name = "child"
    child.parent = some(parent)
    parent.child = some(child)
    match child.parent {
        some(found) => { io.println("up: {found.name}") }
        none => { io.println("up: gone") }
    }
}
// up: parent, তারপর দুটো deinit-ই চলে — back edge-টা weak,
// তাই leak করার মতো কোনো cycle-ই নেই
```

read করলে declare করা `Option<C>`-ই পাওয়া যায়: referent বেঁচে থাকলে `some` —
load হওয়া value-টা read-এর জন্য retain হয়, তাই ব্যবহারের মাঝপথে সেটা মরতে
পারে না — আর referent-এর মৃত্যুর প্রথম মুহূর্ত থেকে `none`, এমনকি তার
`deinit` body চলার *আগেই*, তাই কোনো destructor weak slot দিয়ে নিজেকে
resurrect করতে পারে না। collector যখন কোনো strong cycle মেরে ফেলে, সেই
cycle-এর দিকে তাক করা weak field-গুলোও তখন থেকেই `none` পড়ে।

প্রতিটা parent/child graph-এর back edge, আর owner-এর দিকে তাক করা প্রতিটা
stored callback — `weak` করে বানান, দুই পাশই তাদের `deinit` পাবে। slot-এ
থাকে একটা zeroing handle, object নয়, তাই weak field reflection-এর চোখে
অদৃশ্য। `weak` শুধু class-এর instance field-এর জন্য — static নয়, struct নয়,
local নয়।

## Move

`move` কোনো value-কে copy না করে একটা binding থেকে তার ownership বের করে
নিয়ে যায়। `return move local` retain না করে শেষ reference-টাই ফেরত দেয়।
checker compile-time-এ use-after-move ধরে ফেলে, তাই move হয়ে যাওয়া কোনো
binding আর পড়া যায় না:

<!-- beans:expect-error -->
```beans
fn main() {
    var a: List<int> = [1, 2, 3]
    let b: List<int> = move a
    a.push(4)                    // error: use of moved value 'a'
}
```

একটা `var`-কে move করে বের করে নিয়ে, পরের বার পড়ার আগে তাতে একটা নতুন value
আবার বসানো যায়। parameter, loop variable, match binding আর closure capture —
এগুলো borrow করা, তাই এগুলোকে move করা যায় না। পুরো move, `move` parameter
আর `inout`-এর নিয়মের জন্য দেখুন [Variables and constants](/bn/guide/variables/)।

## Move-only handle

`List`, `Map`, `OrderedMap`, `Box<T>` আর `Arena<T>` হলো **move-only বাইরের
handle**, আর যেকোনো `unique class`-ও তাই। bind করা, assign করা, store করা
বা return করা — সব `move` দিয়ে হয়; parameter আর loop read borrow করে।
`clone()` একটা আলাদা স্বাধীন copy বানায় (এর জন্য যেসব type store করা আছে
তাদের `Clone` লাগে)।

```beans
var value: Box<int> = new Box(7)
value.set(9)
let owned: Box<int> = move value       // move the handle

var arena: Arena<string> = new Arena(1024)
let handle: int = arena.add("bean")
let word: string = arena.at(handle)    // checked; panics on a bad handle
arena.clear()                          // drops all values in one pass
```

- `Box<T>` একটা heap slot-এর মালিক: `get()` value ফেরত দেয়, `set(value)`
  সেটা বদলে দেয়। কোনো value-এর একজন পরিষ্কার মালিক আছে আর সেটাকে শুধু
  heap-এ দরকার — তখন এটা ব্যবহার করুন।
- `Arena<T>` হলো শুধু-যোগ-করা যায় এমন একটা slab: `add(value)` একটা স্থির
  integer handle ফেরত দেয়; `at`, `get`, `len` আর `clear` পুরো region-এর
  উপর কাজ করে। `clear` capacity ধরে রাখে কিন্তু আগের সব handle অকেজো করে দেয়।

কোনো function শুধু পড়ার জন্য move-only handle নিলে সেখানে `move` লাগে না,
কারণ parameter তো borrow করে:

```beans
fn total(xs: List<int>) -> int {
    var sum: int = 0
    for x: int in xs { sum += x }
    return sum
}
```

## thread-জুড়ে ভাগ করা ownership

`Shared<T>` হলো সরাসরি thread-safe shared-ownership handle। `Weak<T>` একই
value-কে জীবিত না রেখে শুধু দেখে:

```beans
let shared: Shared<string> = new Shared("beans")
let weak: Weak<string> = shared.downgrade()
let live: Option<Shared<string>> = weak.upgrade()
let gone: bool = weak.is_expired()
```

`get()` value-এর একটা copy ফেরত দেয়। কোনো `Shared` handle copy করলে আরেকজন
strong মালিক যোগ হয়, আর শেষ strong handle না মরা পর্যন্ত value-টা বেঁচে
থাকে। `upgrade` একটা atomic compare/exchange ব্যবহার করে, তাই মরে যাওয়া
value-কে সেটা কখনও বাঁচিয়ে তুলতে পারে না।

cycle collector `Shared` control block-এর ভেতর দিয়ে trace করে না, তাই
`Shared` value দিয়ে বানানো কোনো cycle নিজে থেকে কখনও drop হয় না। এক পাশকে
`Weak` বানিয়ে সেটা ভাঙতে হয়। কোনো back-pointer-এর জন্য (child থেকে parent,
observer থেকে subject) — যেটা তার target-কে জীবিত রাখা উচিত না — `Weak`-কে
ঠিক এভাবেই ব্যবহার করা হয়।

`Shared<T>` আর `Weak<T>` তখনই `Send` আর `Sync`, যখন `T` দুটোই। কোনো value-এর
একজন স্পষ্ট মালিক নেই অথবা সেটাকে আরেকটা thread-এ পাঠাতে হবে — তখন `Shared`
ব্যবহার করুন; আর যখন একজন মালিক স্পষ্ট, তখন `Box<T>` ব্যবহার করুন, কারণ ওতে কোনো atomic count
লাগে না।

## Send আর Sync

সাধারণ class reference, `List`, `Map`, `Box`, `Arena`, `Bytes`, `File` আর
`MMap` — এগুলো **`Send` না**: default-এই এগুলো local reference value। scalar,
immutable string, `AtomicInt`, `Mutex`, `Send` value-এর `Channel`, আর
`Send + Sync` type-এর `Shared`/`Weak` — এগুলো thread-এর সীমানা পার হতে পারে।
`thread.spawn` এমন কোনো closure মানবে না যেটা কোনো non-`Send` value capture
বা return করে, তাই ভুলবশত shared mutable data নিয়ে race হয়ে যাওয়ার সুযোগ
নেই। তার বদলে সেটাকে একটা `Mutex`-এ মুড়ে নিতে হয়। দেখুন [Concurrency](/bn/guide/concurrency/)।

## একটা পুরো program

কয়েক জায়গা যতক্ষণ কোনো value ধরে রাখে ততক্ষণ `Shared` সেটাকে জীবিত রাখে;
`Weak` সেটাকে আটকে না রেখে শুধু নজরে রাখে:

<!-- beans:compile -->
```beans
import std.io

class Cache {
    label: string
    fn init(label: string) { self.label = label }
    fn deinit() { io.println("drop {self.label}") }
}

fn main() {
    let strong: Shared<Cache> = new Shared(new Cache("db"))
    let observer: Weak<Cache> = strong.downgrade()

    match observer.upgrade() {
        some(live) => io.println("cache {live.get().label} still here"),
        none       => io.println("gone"),
    }

    io.println("expired {observer.is_expired()}")
}
```

এই type-গুলোর প্রতিটা method-এর তালিকা আছে
[ownership handle reference](/bn/reference/builtins/handles/)-এ।
