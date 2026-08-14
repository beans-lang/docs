---
title: Annotations
description: Beans-এর declaration, parameter আর local variable-এ typed metadata ঘোষণা করা আর ব্যবহার করা।
---

Annotation source কোডে typed metadata যোগ করে। এগুলো কোনো type, function,
field, parameter বা local variable বর্ণনা করতে পারে — Beans-এর স্বাভাবিক
semantics কিছুমাত্র না বদলেই। visibility, ownership, layout, ABI আর safety
এখনও built-in [modifier](/bn/guide/attributes/) দিয়েই হয়, যেমন `pub`, `unique`
আর `extern "C"`।

annotation-এর নাম value আর function-এর মতোই সাধারণ `snake_case` convention
মেনে চলে।

## একটা annotation ঘোষণা আর ব্যবহার

একটা `annotation` declaration একটা schema বানায়। প্রতিটা field-এর একটা স্পষ্ট
type থাকে; default নেই এমন field অবশ্যই দিতে হবে।

<!-- beans:compile -->
```beans
@target(value: ["function", "parameter", "local"])
@retention(value: "tool")
annotation audit {
    event: string
    level: string = "info"
    tags: List<string> = []
}

@audit(event: "start", tags: ["example"])
fn run(@audit(event: "input") value: int) -> int {
    @audit(event: "result")
    let result: int = value + 1
    return result
}

fn main() {
    run(1)
}
```

schema-তে কোনো required field না থাকলে `@name` ব্যবহার করা যায়, আর value পাস
করার সময় `@name(field: value, ...)`। argument সবসময় নাম ধরে দেওয়া হয়। বাদ
পড়া optional field-গুলো default দিয়ে ভরে যায়।

## Schema field-এর type

একটা annotation field যা যা ব্যবহার করতে পারে:

- `bool`, integer type, float type, বা `decimal`
- `string`
- একটা enum type
- `List<T>`, যেখানে `T` আরেকটা সমর্থিত annotation field type

argument আর default value অবশ্যই compile-time constant হতে হবে। এখানে
constant boolean, number, string, enum variant আর সমর্থিত value-এর list চলে। call, closure,
interpolation, object construction আর runtime value-এর read — এগুলো annotation
constant না।

## Annotation কোথায় যেতে পারে

Annotation আসে doc comment-এর পরে আর `pub`-এর মতো modifier-এর আগে।

| Target-এর নাম | কোথায় বসে |
|---|---|
| `annotation` | আরেকটা annotation declaration |
| `type` | কোনো class, interface, struct, union বা enum |
| `function` | module-level একটা function |
| `method` | কোনো class বা interface method |
| `field` | কোনো type-এর field |
| `variant` | কোনো enum variant |
| `parameter` | কোনো function, method বা enum payload parameter |
| `local` | কোনো local `let` বা `var` declaration |
| `c_global` | কোনো `extern "C"` global |

Annotation call argument, সাধারণ expression, statement, type ব্যবহার বা
generic parameter-এ যায় না।

## Meta-annotation

Beans তিনটা annotation দেয় যেগুলো annotation declaration-কে সাজায়।

### `@target`

`@target(value: [...])` কোনো annotation কোথায় ব্যবহার করা যাবে সেটা সীমিত
করে দেয়। `@target` না দিলে উপরের টেবিলের প্রতিটা target-ই চলে।

```beans
@target(value: ["function", "method"])
annotation traced {
    operation: string
}
```

### `@retention`

`@retention(value: "tool")` check করা metadata-কে HIR আর semantic editor
data-তে রেখে দেয়। `@retention(value: "source")` annotation-টা যাচাই করে,
তারপর check করা HIR থেকে সেটা ফেলে দেয়। default হলো `tool`।

`@retention(value: "runtime")` annotation-টাকে executable-এও ঢুকিয়ে দেয়।
কোড এটা [`std.reflect`](/bn/guide/reflection/) দিয়ে পড়তে পারে। runtime
retention সমর্থিত annotation declaration, type, function, method, field,
enum variant আর parameter-এ। local আর C global-এ এটা নাকচ, কারণ runtime
API-তে এই দুই target-এর কোনো descriptor নেই।

### `@repeatable`

একটা annotation সাধারণত এক target-এ বড়জোর একবার আসে। একাধিকবার ব্যবহারের
দরকার থাকলে তার declaration-এ `@repeatable` যোগ করা হয়।

```beans
@target(value: ["function"])
@repeatable
annotation route {
    path: string
}

@route(path: "/items")
@route(path: "/v2/items")
fn list_items() {}
```

## Package আর visibility

Annotation declaration-এর নিজের একটা namespace আছে। `pub` না দিলে এগুলো
নিজের package-এর ভেতরেই private, আর import করা annotation স্বাভাবিক package
binding মেনে চলে:

```beans
@telemetry.audit(event: "checkout")
pub fn checkout() {}
```

compiler নাকচ করে অজানা বা private annotation, ভুল target, duplicate
non-repeatable ব্যবহার, বাদ পড়া বা পুনরাবৃত্ত argument, অজানা field, ভুল
value type, আর যেসব value compile-time constant না — সবকিছু।

## Metadata আর active annotation

সাধারণ annotation শুধু metadata। `@debug` বা `@log` ঘোষণা করলেই কিছু print হয়
না। কোনো compiler tool বা library annotation grammar না বদলে `tool` metadata
পড়তে পারে।

কোনো annotation schema `@runtime_hook` দিয়ে checked runtime behavior চালু করতে
পারে। তখন compiler তার handler-এ সরাসরি call বসায়। এটা text macro না, আর
annotated function-এর code বদলে দিতে পারে না। সব নিয়মের জন্য দেখুন
[Runtime hook](/bn/guide/runtime-hooks/)।

Runtime reflection শুধু check করা value পড়ে। এটা কখনও annotation-এর source
expression evaluate করে না।

Testing-এও একই নিয়ম খাটে: এই release-এ `@test` কোনো built-in test runner
feature না। এটাকে metadata হিসেবে ঘোষণা করা যায়, কিন্তু এখনও কোনো test
command এটা কাজে লাগায় না।
