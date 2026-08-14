---
title: Reflection
description: type আর annotation দেখা, নাম ধরে field-এ ঢোকা, আর run time-এ check করা call করা।
---

Beans-এর reflection হলো typed runtime metadata। এটা field, method, enum
variant, function, initializer আর runtime annotation-এর তালিকা দিতে পারে।
এটা কোনো public field পড়তে বা লিখতেও পারে, আর নাম ধরে একটা check করা call
করতে পারে।

Reflection Beans-এর স্বাভাবিক নিয়মই মেনে চলে। এটা `pub`, ownership, move বা
target ABI — কিছুই টপকে যায় না। কোনো `setAccessible`, raw memory access,
class loader, proxy generator বা stack inspection নেই।

## একটা type নেওয়া

`std.reflect` import করা হয় আর কোনো static type-এর জন্য `type_of(T)` ব্যবহার করা হয়।

<!-- beans:compile -->
```beans
import std.io
import std.reflect

struct User {
    pub name: string
    pub age: int
}

fn main() {
    let user_type: reflect.Type = type_of(User)
    io.println(user_type.qualified_name())
    io.println(user_type.kind())

    for field: reflect.Field in user_type.fields() {
        io.println("{field.name()}: {field.type().qualified_name()}")
    }
}
```

`Type.declared_fields()` আর `Type.declared_methods()` শুধু সেই type-এ ঘোষণা
করা member ফেরত দেয়। `fields()` আর `methods()` উত্তরাধিকারে পাওয়া member-ও
ধরে। একটা করে খুঁজতে `field(name)`, `method(name)` বা `variant(name)` ব্যবহার
করা হয় — এরা `Option` ফেরত দেয়।

`Type` generic argument, সরাসরি base class, implement করা interface, enum
variant, একটা initializer আর runtime annotation-ও দেখায়। linked registry
ঘুরে দেখতে `reflect.types()`, `reflect.functions()` আর
`reflect.annotation_types()` ব্যবহার করা হয়।

## Dynamic value

`reflect.Value` হলো একটা dynamic সীমানায় বসা একটা owned box। `reflect.value(item)`
একটা static type-করা value-কে একটা box-এ ভরে। `Value.type()` তার ভেতরে জমা
type জানায়, আর check করা `as?` সেটা আবার বের করে আনে।

```beans
let boxed: reflect.Value = reflect.value(42)
let number: int = (boxed as? int).expect("int")
```

copy করা যায় এমন payload box-টা খরচ না করেই পড়া যায়। move-only payload-কে
box-টা cast-এর ভেতর move করে দিতে হয়:

```beans
let values: List<int> = [1, 2]
let boxed: reflect.Value = reflect.value(move values)
let restored: List<int> =
    (move boxed as? List<int>).expect("List<int>")
```

`Value.copy()` আরেকটা owned box বানায়। এটা reference-আকৃতির data retain করে,
আর struct, array, `Option` ও inline `Result` value-এর ভেতরে থাকা owned
reference-গুলো ঘুরে ঘুরে দেখে।

## নাম ধরে field পড়া আর লেখা

Field access receiver-এর type, field-এর type আর visibility — সবের জন্যই
check হয়।

<!-- beans:compile -->
```beans
import std.io
import std.reflect

class Account {
    pub name: string

    fn init(name: string) { self.name = name }
}

fn main() {
    let account: Account = new Account("old")
    let receiver: reflect.Value = reflect.value(move account)
    let name: reflect.Field =
        type_of(Account).field("name").expect("name")

    name.set(receiver, reflect.value("new")).expect("set name")
    let current: string =
        (name.get(receiver).expect("get name") as? string).expect("string")
    io.println(current)
}
```

`pub` না এমন member metadata-তে এখনও থাকে — এমনকি কড়া `priv` field বা
method-ও — কিন্তু reflection দিয়ে সেটায় ঢুকতে গেলে `inaccessible` kind-এর
একটা `ReflectError` ফেরত আসে।

## Construct আর call

`Initializer.call`, `Variant.make`, `Function.call`, `Method.call` আর
`Method.call_static` — এরা `List<reflect.Value>` নেয় আর
`Result<reflect.Value, reflect.ReflectError>` ফেরত দেয়।

Class construction ঘোষিত বা উত্তরাধিকারে পাওয়া `init` ব্যবহার করে। কোনো
struct-এর একটা synthetic initializer থাকে যার parameter হলো ঘোষণার ক্রমে সব
field। প্রতিটা struct field দিতে হবে, source-এ default থাকা field-গুলোসহ।
struct আর তার সব field-কে public হতে হবে।

Reflect করা call সমর্থন করে public synchronous Beans function, instance
method, static method, virtual override আর initializer। এরা নাকচ করে:

- `pub` না এমন member, `priv` field আর method-সহ
- `deinit`
- open generic, async, `extern`, variadic বা `inout` call-এর গড়ন
- ভুল receiver, ভুল argument সংখ্যা, বা ভুল argument type

স্থির error kind-গুলো হলো `missing`, `inaccessible`, `receiver_type`,
`value_type`, `unsupported`, `argument_count` আর `failed`।

## Runtime annotation

শুধু `@retention(value: "runtime")` দিয়ে ঘোষণা করা annotation-ই runtime
registry-তে ঢোকে। Reflection পুনরাবৃত্ত ব্যবহারগুলো source-এর ক্রমেই রাখে,
আর check করা scalar, enum ও list value ধরে রাখে।

`AnnotationType` annotation declaration-টাকে বর্ণনা করে: তার retention,
repeatability, অনুমোদিত target, schema field, default, আর annotation
declaration-এর নিজের উপরে থাকা annotation। `Annotation` একটা ব্যবহার আর তার
ভরা argument বর্ণনা করে।

Declaration আর target-এর নিয়মের জন্য দেখুন [Annotation](/bn/guide/annotations/)।

## JSON আর XML

কোনো serializer-এর যা যা টুকরো লাগে reflection সেগুলো জোগায়: ক্রমসাজানো
field, নাম, annotation, construction আর check করা value। কোন wire format-এর
নীতি হবে সেটা এটা বেছে দেয় না।

JSON আর XML package-কেই naming, unknown-field, default, versioning আর
numeric conversion-এর নিয়ম ঠিক করতে হয়। reflection চুপচাপ প্রতিটা object-কে
JSON বা XML-এ বদলে দেয় না।

## Metadata-এর পরিধি

Metadata একটা executable-এরই। program চলার সময় descriptor-এর পরিচয় স্থির
থাকে, কিন্তু descriptor ID কোনো file format না, আর build বা shared-library-এর
সীমানা টপকে স্থির থাকে না।

open generic declaration দেখা যায়, কিন্তু construct বা call করা যায় না।
Union দেখা যায়, কিন্তু reflection সেগুলো construct করে না, তাদের ওভারল্যাপ
করা storage-এও ঢোকে না।

## আরও দেখুন

- [`std.reflect` API reference](/bn/reference/stdlib/reflect/)
- [Annotation](/bn/guide/annotations/)
- [`std.encoding.json`](/bn/reference/stdlib/json/)
- [`std.encoding.xml`](/bn/reference/stdlib/xml/)
