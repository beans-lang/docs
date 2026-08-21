---
title: Variables and constants
description: Beans-এ let আর var, explicit type, move semantics, inout parameter, আর move-only handle।
---

Beans-এ একটা name বাঁধার দুটো উপায়: `let` আর `var`। **প্রতিটা binding তার type
বলে দেয়।** `let`, `var`, parameter, field, বা loop variable — কোনোটার জন্যই type
inference নেই।

```beans
let x: int = 5              // cannot be reassigned
var total: decimal = 0.0    // can be reassigned
```

`let`-এর অর্থ *variable*-টাকে আর নতুন value-তে rebind করা যাবে না। কিন্তু সেটা যে
object-এ point করছে, তার ভেতরটা এখনও বদলাতে পারে। Beans-এ কোনো borrow checker নেই,
কোনো `mut` marker নেই।

```beans
let xs: List<int> = [1, 2, 3]
xs.push(4)                  // fine: the list changes, the binding does not
// xs = [9]                 // error: cannot rebind a let
```

## Literal value বানায়, class না

Struct আর collection-এর literal রূপ আছে:

```beans
let point: Point = Point { x: 3, y: 4 }
let values: List<int> = [1, 2, 3]
let counts: Map<string, int> = {"beans": 2}
```

class কখনও field literal ব্যবহার করে না। এগুলো `new Class(...)` দিয়ে তৈরি করা হয়, যাতে
প্রতিটা construction `init`-এর ভেতর দিয়ে যায়। দেখুন [Classes](/bn/guide/classes/)।

## Move

`move name` একটা local binding থেকে value-টা বের করে নেয়। পুরনো binding-টা আর পড়া
যায় না, যদি না সেটা একটা `var` হয় যেটা আগে নতুন value পায়:

```beans
var job: Job = next_job()
let running: Job = move job
job = next_job()                 // reinitializes it
```

checker use-after-move reject করে, আর শুধু এক branch-এ move হওয়া value-ও reject
করে (প্রতিটা branch-এ move হলে সেটা ঠিক আছে)। সাধারণ parameter, loop variable,
আর match binding borrow করা, তাই move করা যায় না। closure default-এ borrow করে;
`fn() move(a, b) { ... }` named local-গুলো closure-এ move করে।

## Parameter: borrow, move, inout

parameter default-এ **borrow** করে। একটা `move` parameter তার argument-টার মালিক
হয়ে যায়, আর function শেষে সেটা drop করে দেয়, যদি না body সেটাকে আরও এগিয়ে move করে
দেয়:

```beans
fn enqueue(move jobs: List<Job>) { /* ... */ }

var batch: List<Job> = make_batch()
enqueue(move batch)              // batch is moved in
```

একটা নতুন result সরাসরি `move` parameter-এ পাঠানো যায়, keyword ছাড়াই
(`enqueue(make_batch())`); শুধু আগে থেকে থাকা একটা move-only local-এর ক্ষেত্রে
`move` লাগে। interface method আর override জুড়ে move mode-গুলো মিলতে হবে।

একটা `inout` parameter কল চলার পুরো সময়টা caller-এর একটা mutable local-কে alias
করে। এটা copy-in/copy-out না:

```beans
fn swap(inout left: int, inout right: int) {
    let old: int = left
    left = right
    right = old
}

var a: int = 1
var b: int = 2
swap(inout a, inout b)
```

caller-কে `inout` লিখতে হবে, argument-টা একটা `var` হতে হবে, আর এক কল-এর দুটো
`inout` position-এ একই local বসতে পারবে না। একটা `inout` parameter কোনো closure
capture করতে পারবে না।

## Move-only handle

কিছু value হয় **move-only outer handle**: এগুলো bind, assign, store, বা return
করতে `move` লাগে, তবে function parameter আর loop read default-এ borrow করে। `List`,
`Map`, `OrderedMap`, `Box<T>`, আর `Arena<T>` move-only, আর `unique class` declare
করা যেকোনো user type-ও তাই:

```beans
unique class Packet {
    bytes: Bytes
}
```

একটা move-only value bind, assignment, return, বা storage দিয়ে copy করা যায় না;
সরাতে হলে `move` ব্যবহার করা হয়। একটা move-only class-এর subclass-ও move-only। এটা
reference handle-টা control করে; object-এর ভেতরের field-গুলো নিজেদের নিয়ম মতোই
চলে।

`clone()` একটা collection-এর একদম আলাদা copy বানায়, তাই clone বদলালে original
বদলায় না (এর জন্য প্রতিটা stored type-এর `Clone` implement করা লাগে)।

পুরো ownership model (reference counting, cycle collector, `Shared`, `Weak`, আর
`deinit`) নিয়ে আছে [Memory and ownership](/bn/guide/memory/)-এ।
