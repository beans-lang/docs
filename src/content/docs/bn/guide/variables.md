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

## Constant

`let` আর `var` statement — এরা function-এর ভেতরে থাকে। যে named value module-এর
নিজের, সেটা একটা `const`।

```beans
const TERMIOS_BYTES: int = 128
const O_NONBLOCK: i32 = 1 << 11
const GREETING: string = "hello"
pub const MAX_FRAME: int = 1 << 20      // pub, library package-এর জন্য
```

`const`-এর **কোনো storage নেই, কোনো address নেই**। checker initializer-টা একবার
fold করে আর প্রতিটা use-এর জায়গায় ওই value-টাই বসায়, তাই একটা constant-এর খরচ
ঠিক ততটুকুই যতটুকু ওখানে literal-টা লিখলে হতো — interpreter আর native build
দুটোতেই। এতে assign করা যায় না।

type লিখে দিতে হয়, আর সেটা number, `bool` বা `string`। composite constant নেই:
storage না থাকলে list বা object-এর থাকার জায়গাই নেই।

### initializer-এ কী আসতে পারে

একটা constant expression: literal; অন্য constant — file-এর নিচে declare করা বা
অন্য package-এর হলেও চলবে; unary `-`, `!`, `~`; আর binary operator
`+ - * / % & | ^ << >> && || == != < <= > >=`।

এর বাইরে কিছু হলে refuse হয়, আর message-এ বলা থাকে কোনটা constant ছিল না — একটা
call, একটা local, একটা field read, একটা `as` cast, string-এর ভেতরের `{}` piece।
`size_of`, `align_of` আর `offset_of`-ও constant expression **না**: এগুলোর উত্তর
layout-এর পরে আসে, যা fold-এর চেয়ে পরে চলে। যে constant নিজের নাম নেয় — সরাসরি
বা অন্য constant হয়ে — সেটাও refuse হয়।

integer fold ঠিক সেটাই উত্তর দেয় যা run time-এ ওই expression দিত। প্রতিটা result
নিজের type-এ narrow হয়, তাই `const X: i32 = 1 << 31` error না — ওটা `i32`-এর
সবচেয়ে ছোট value। শূন্য দিয়ে division বা modulo, `0..bits-1`-এর বাইরের shift
count, আর signed minimum-কে `-1` দিয়ে ভাগ — সবই refuse হয়।

`u64` একমাত্র type যেটা fold পুরোটা বইতে পারে না। `2^63` বা তার বেশি একটা `u64`
value declare করা আর অন্য constant-এর মতো ব্যবহার করা যায়, কিন্তু কোনো operator
সেটা নিয়ে fold করতে পারে না — arithmetic, shift, comparison সবই refuse হয়, কারণ
fold signed 64 bit-এ হিসাব করে আর নাহলে এমন একটা সংখ্যার জন্য signed order-এ
উত্তর দিত যেটা program কখনো ধরেই না।

float আর decimal শুধু literal আর unary minus fold করে, কোনো arithmetic না।
source যে value লেখেনি, compiler সেটা নতুন করে round করবে না।

### constant কোথায় দাঁড়াতে পারে

যেখানে literal দাঁড়াতে পারে সেখানেই — match arm আর annotation argument সহ:

```beans
const LIMIT: int = 128

match n {
    LIMIT => { io.println("at the limit") }
    _ => { io.println("under it") }
}
```

এটা একটা **fixed array-এর মাপও** দিতে পারে, type লেখা হয় এমন প্রতিটা জায়গায় —
local, field, parameter, result, আর অন্য fixed array-এর ভেতরে nested:

```beans
const SLOTS: int = 4

struct Row { cells: [int; SLOTS] }

fn widen(row: [int; SLOTS]) -> [[int; SLOTS]; 2] { return [row, row] }
```

`const` কোনো **parameter default হতে পারে না** — `fn f(n: int = 128)` লিখুন,
`= LIMIT` না। default পড়া হয় যখন তাকে ধরে রাখা signature lower হচ্ছে, আর fold
চলে ওই stage-এর শেষে, তাই জায়গা দুটো আলাদা। যেখানে লেখা হয়েছে সেখানেই refusal-টা
এটা বলে দেয়।

### অন্য package থেকে একটা constant নেওয়া

`pub` করুন, তারপর অন্য যেকোনো নামের মতোই নিন: package দিয়ে qualified, কিংবা
import-এ select করে।

```beans
import std.io
import limits
import {SLOTS} from limits

let a: [int; limits.SLOTS] = [0, 0, 0, 0]
let b: [int; SLOTS] = [0, 0, 0, 0]
```

`const` contextual। module-level declaration-এর শুরুতে `const <NAME>`-এ এটা
declaration keyword, আর বাকি সব জায়গায় সাধারণ identifier।

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
