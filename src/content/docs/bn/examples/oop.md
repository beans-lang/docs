---
title: OOP classes and value types
description: strict private field আর method, static state, abstract method, singleton, generic struct, আর struct-এর mutating method — সব ঘুরে দেখা।
---

দুইটা ছোট প্রোগ্রাম মিলে পুরো OOP আপডেটটা দেখিয়ে দেয়:

- [`oop_classes.b`](https://github.com/beans-lang/beans/blob/main/examples/oop_classes.b)
  দেখায় class-এর চুক্তি আর shared state।
- [`generic_structs.b`](https://github.com/beans-lang/beans/blob/main/examples/generic_structs.b)
  দেখায় inline generic value আর method।

Beans repo থেকে এগুলো চালান:

```bash
beansc run examples/oop_classes.b
beansc run examples/generic_structs.b
```

## কড়া private method আর field

class-এর উদাহরণটা প্রতিটা job ID ওর নিজের class-এর ভেতরেই আটকে রাখে, আর কতগুলো
তৈরি হলো সেই গোনাটা থাকে class-এর নিজের কাছে:

```beans
class BuildJob extends Job implements Named {
    static created: int = 0
    priv id: int

    priv static fn record_created() {
        BuildJob.created += 1
    }

    priv fn job_id() -> int {
        return self.id
    }

    fn init(id: int) {
        self.id = id
        BuildJob.record_created()
    }
}
```

private field আর দুইটা private method-এর কোনোটাই কোনো peer class, subclass, বা
free function ছুঁতে পারবে না — এমনকি একই package-এর ভেতরে থেকেও না।
`BuildJob.created` একবারই initialize হয়, আর সব `BuildJob` object মিলে সেটাই share করে।

## Abstract আর interface method

abstract base ক্লাসটা একটা method-এর জায়গা রাখে, কিন্তু কোনো body দেয় না:

```beans
interface Named {
    fn name() -> string
}

abstract class Job {
    abstract fn run() -> int
}

class BuildJob extends Job implements Named {
    override fn run() -> int { return 1 }
    fn name() -> string { return "build" }
}
```

`run`-এর জন্য `override` লাগে, কারণ এটা abstract base-class-এর একটা method-কে
বদলে দিচ্ছে। `name`-এর জন্য লাগে না, কারণ এটা একটা bodyless interface
requirement-এর প্রথম body। ওখানে `override` লিখলেও কিন্তু ভুল হতো না।

## একটা eager singleton

registry-টার পুরো প্রোগ্রামের জন্য মাত্র একটাই instance থাকে:

```beans
singleton class Registry {
    priv completed: int = 0

    fn record() -> int {
        self.completed += 1
        return self.completed
    }
}

let first: int = Registry.instance.record()
let second: int = Registry.instance.record()
```

দুইটা call-ই একই object ব্যবহার করে, তাই তারা `1` আর `2` ফেরত দেয়। singleton
`main`-এর আগেই তৈরি হয়ে যায়; `new Registry()` লেখা যাবে না।

## Method সহ generic struct

struct-এর উদাহরণটা `Tagged<int>` আর `Tagged<string>`-এর জন্য আলাদা আলাদা inline
value layout বানায়:

```beans
struct Tagged<T> {
    value: T
    tag: int
    previous: Option<T> = none

    priv fn label_text() -> string {
        return "tag-{self.tag}"
    }

    fn label() -> string {
        return self.label_text()
    }

    priv inout fn set_tag(tag: int) {
        self.tag = tag
    }

    inout fn retag(tag: int) {
        self.set_tag(tag)
    }
}

var number: Tagged<int> = Tagged { value: 7, tag: 1 }
let word: Tagged<string> = Tagged { value: "beans", tag: 2 }
number.retag(9)
```

সাধারণ struct method পায় read-only `self`। `inout fn` পায় mutable `self`, তাই
`retag`-কে একটা `var` local-এর উপর call করতে হবে। `priv` দুই রকমেই কাজ করে;
`label_text` আর `set_tag`-কে শুধু `Tagged`-এর ভেতর থেকেই call করা যায়।
`previous`-এর default-টা প্রতিটা `T`-এর জন্য আলাদা করে check আর compile হয়।

সব নিয়ম দেখতে চাইলে দেখুন [Class](/bn/guide/classes/),
[Interface আর inheritance](/bn/guide/interfaces/), আর
[Struct আর union](/bn/guide/structs/)।
