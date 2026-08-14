---
title: Classes
description: Beans-এ class — private method আর field, static state, singleton class, construction, আর init/deinit lifecycle।
---

class হলো একটা reference type, যার field আর method থাকে।

```beans
class User {
    static created: int = 0
    name: string
    age: int = 0              // visible inside this package
    pub email: string = ""    // visible in every package
    priv token: string        // visible only inside User

    fn init(name: string, token: string) {
        self.name = name
        self.token = token
        User.created += 1
    }

    fn greet() -> string {
        return self.private_greeting()
    }

    priv fn private_greeting() -> string {
        return "hi {self.name}"
    }

    static fn guest() -> User {
        return new User("guest", "")
    }
}

let u: User = new User("jul", "secret")
```

- method default-এ instance method। তাদের `self` implicit আর body-তে হাতের কাছেই
  থাকে; parameter list-এ কখনও লেখা হয় না।
- `static fn` একটা class method declare করে। এর কোনো `self` নেই, আর এটা inherit
  হয় না।
- একটা সাধারণ class বানানো হয় `new Class(...)` দিয়ে। এটা সবসময় `init` চালায়।
  class field literal আর সাদামাটা `Class(...)` কল — দুটোই error।
- marker ছাড়া field তার package-এ দেখা যায়। `pub` সেটা সব package-এর জন্য খুলে দেয়।
  `priv` সেটাকে শুধু declare করা class-এর ভেতর সীমিত রাখে।

যা কিছু একটা object বানায়, সেটা ওই object-এর class-এ থাকে — `new` হিসেবে বা একটা
named static হিসেবে (fallible construction-এর জন্য, যেমন `File.open`)। module-level
function শুধু সেই কাজের জন্য যেটা কোনো object বানায় না।

## Field visibility

Beans-এ field visibility-র তিনটা level:

| রূপ | field-এ কে হাত দিতে পারে |
| --- | --- |
| `value: int` | একই package-এর code |
| `pub value: int` | যেকোনো package-এর code |
| `priv value: int` | শুধু যে class বা struct সেটা declare করে |

`priv` একই package-এও কড়া থাকে। একটা peer class, subclass, বা free function
field-টা পড়তে বা লিখতে পারে না। কোনো `protected` level নেই।

## Method visibility

method-ও একই তিন level ব্যবহার করে:

| রূপ | method-টা কে কল করতে পারে |
| --- | --- |
| `fn read()` | একই package-এর code |
| `pub fn read()` | যেকোনো package-এর code |
| `priv fn read()` | শুধু যে class বা struct সেটা declare করে |

`priv` instance, static, আর `inout` struct method-এ কাজ করে। একটা private method
inherit হয় না, আর `abstract` বা `override` হতে পারে না। একটা subclass একই নামে নতুন
method declare করতে পারে, কিন্তু সেটা parent-এর private method-কে replace করে না।

## Static field

একটা static field class-এর, প্রতিটা object-এর না। এটা class name দিয়ে পড়া আর লেখা হয়:

```beans
class Request {
    static next_id: int = 1
    priv static secret: int = 40

    priv static fn secret_value() -> int {
        return Request.secret
    }

    static fn take_id() -> int {
        let id: int = Request.next_id
        Request.next_id += 1
        return id
    }

    static fn reveal() -> int {
        return Request.secret_value()
    }
}
```

static field একবারই initialize হয়, declaration order-এ, `main` চলার আগে। এদের একটা
initializer লাগে, আর এরা inherit হয় না। একটা generic class কোনো static field
declare করতে পারে না; করলে প্রতিটা type argument ownership-টা ঘোলা করে ফেলত।

## Singleton class

`singleton class` একটাই eager instance বানায়। এটায় পৌঁছাও `Type.instance` দিয়ে:

```beans
singleton class Registry {
    priv count: int = 0

    fn next() -> int {
        self.count += 1
        return self.count
    }
}

let first: int = Registry.instance.next()
let second: int = Registry.instance.next()
```

instance-টা `main`-এর আগে একবারই তৈরি হয়, static field-গুলো initialize হওয়ার পরে।
প্রতিটা `.instance` access সেই একই object ফেরত দেয়। `new Registry()` একটা error।
একটা singleton-এর zero-argument initializer থাকতে হবে, আর সেটা `deinit` declare
করতে পারে না। এটা generic, `abstract`, `unique`, বা extend-ও করা যায় না।

## init: constructor

`init` হলো constructor-এর body। `new Class(...)` object-টা allocate করে আর এটা
চালায়। `init`-এর একটা implicit `self` আছে, তবে এটা সাধারণ callable method না — একটা
lifecycle method।

```beans
class Conn {
    host: string
    hits: int = 0

    fn init(host: string) {
        self.host = host
    }
}

let c: Conn = new Conn("db1")
```

caller `c.init(...)` লিখতে পারে না। object তৈরি করা হয় `new` দিয়ে; compiler `init` ঠিক
একবারই চালায়। সরাসরি initializer কল করার একমাত্র জায়গা হলো subclass-এর
initializer-এর ভেতর `super.init(...)`।

- যে class-এর সব field-এর default আছে, সেটা একটা implicit zero-argument
  initializer পায়। যে class-এ কোনো required field আছে, তাকে `init` declare করতে
  হবে।
- প্রতিটা field assign না হওয়া পর্যন্ত `init`-এর body একটা straight-line prefix:
  প্রতিটা statement হয় একটা field assign করে, নয়তো আগে assign হয়ে যাওয়া একটা field
  পড়ে। কোনো method call না, `self` কোথাও পাঠানো না, কোনো `return` না, আর কোনো string
  interpolation না। checker এটা প্রমাণ করে দেয়, তাই আধা-বানানো একটা object কখনও
  বেরিয়ে যেতে পারে না। শেষ field-টা assign হয়ে গেলে, এরপর যা খুশি করা যায়।
- একটা সাধারণ `fn init` package-private। একই package-এর যেকোনো ফাইল `new Conn(...)`
  লিখতে পারে।
- `pub fn init` শুধু তখনই ব্যবহার করা হয় যখন অন্য package-কে class-টা construct করতে
  হবে। তখন class-টা নিজেও `pub` হতে হবে।
- `priv fn init` ব্যবহার করা হয় যখন caller-দের একটা static factory-র ভেতর দিয়ে যেতেই
  হবে। এমনকি একই package-এর peer class বা subclass-ও সেই constructor কল করতে
  পারে না।
- যে construction fail করতে পারে সেটা একটা named static হিসেবে থাকে, যেটা `Result`
  ফেরত দেয়, যেমন `static fn open(...) -> Result<Conn>` — এটা validation-এর পরে
  `new Conn(...)` কল করতে পারে।

## deinit: destructor

`deinit` ঠিক একবারই চলে, শেষ reference-টা যে thread-এ drop হয় সেটায়, count শূন্যে
নামার সাথে সাথেই, আর field-গুলো release হওয়ার আগে — তাই body তখনও এগুলো পড়তে পারে।
Destruction deterministic: এটা ঠিক ওই মুহূর্তেই ঘটে, পরে কোনো garbage-collector
pause-এ না।

```beans
class Conn {
    host: string
    pub fn init(host: string) { self.host = host }
    fn deinit() {
        io.println("closing {self.host}")
    }
}
```

- কোনো parameter নেই, কোনো return value নেই, আর caller `c.deinit()` লিখতে পারে না।
  compiler নিজেই এটা চালায়।
- একটা subclass-এর `deinit` আগে চলে, তারপর তার parent-এরটা, নিজে থেকেই, কোনো
  `override` ছাড়া।
- `self` কোনো `deinit` থেকে বেরিয়ে যেতে পারবে না।
- একটা reference cycle-এর ভেতর যে object মরে, তার `deinit` চলে না। cycle-টা নিজে
  হাতে ভাঙতে হয় (দেখুন [Memory and ownership](/bn/guide/memory/))।

## Inheritance আর interface

class একটা base class নেয় `extends` দিয়ে, আর interface implement করে `implements`
দিয়ে। construction chain হয় `super.init(...)`-এর মধ্য দিয়ে। এটা নিয়ে আছে
[Interfaces and inheritance](/bn/guide/interfaces/)-এ।

## একটা পুরো উদাহরণ

```beans
import std.io

class Account {
    owner: string
    balance: decimal = 0.0

    fn init(owner: string) {
        self.owner = owner
    }

    fn deposit(amount: decimal) {
        self.balance = self.balance + amount
    }

    fn summary() -> string {
        return "{self.owner}: {self.balance}"
    }

    static fn empty(owner: string) -> Account {
        return new Account(owner)
    }
}

fn main() {
    let a: Account = Account.empty("jul")
    a.deposit(19.99)
    io.println(a.summary())
}
```
