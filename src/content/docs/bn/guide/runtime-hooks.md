---
title: Runtime hook
description: Checked annotation handler আর root application lifecycle callback চালান।
---

Runtime hook দিয়ে কোনো annotation function বা method-এর আগে আর normal return-এর
পরে ছোট code চালাতে পারে। Compiler পুরো link check করে সরাসরি call বসায়। এটা
source text expand করে না, প্রতি call-এ reflection scan করে না, আর নতুন thread
বানায় না।

## Active annotation ঘোষণা

Annotation schema-তে `@runtime_hook` দিন। `before`, `after_return`, বা দুটো
handler-ই দেওয়া যায়।

```beans
@runtime_hook(before: "log_before", after_return: "log_after")
@target(value: ["function", "method"])
annotation log {
    level: string = "info"
}

fn log_before(target: string, level: string) {}
fn log_after(target: string, level: string) {}

@log(level: "debug")
fn save() {}

fn main() {
    save()
}
```

Handler annotation-এর package-এর top-level function হতে হবে। প্রথম parameter
হলো qualified target name। বাকি parameter schema field-এর order মেনে চলে। সব
parameter borrowed। Handler concrete, synchronous, non-generic, non-extern হতে
হবে, আর কিছু return করবে না।

Version one-এ active annotation শুধু concrete synchronous function আর method-এ
চলে। abstract, extern, generic, `init`, আর `deinit` target নাকচ হয়।

## Order আর normal return

`before` handler source order-এ চলে। `after_return` handler উল্টো order-এ চলে।
Early return আর `?` propagation-সহ প্রতিটি normal return-এ after handler চলে।
Panic বা `os.exit`-এর পরে এটা চলবে, এমন promise নেই।

Hook শুধু call দেখে। Receiver, argument, বা result বদলাতে পারে না।

## Application lifecycle

Root application package-এর top-level, no-argument function-এ `@runtime_start`
আর `@runtime_stop` ব্যবহার করুন:

```beans
@runtime_start
fn open_services() {}

@runtime_stop
fn close_services() {}
```

Beans runtime ready হওয়ার পরে আর `main` body শুরু হওয়ার আগে start callback
declaration order-এ চলে। `main` normal return করার পরে stop callback উল্টো
order-এ চলে। Imported library application lifecycle work register করতে পারে না।

Panic, `os.exit`, force করে process বন্ধ করা, বা power loss-এর পরে callback
চলবে, এমন promise নেই। Object lifecycle এখনো `init` আর `deinit`-এর কাজ।

## Thread, nested call, আর error

Hook caller-এর current thread-এ synchronously চলে। Worker লাগলে handler owned
`Send` value enqueue করতে পারে; lifecycle callback worker start আর stop করবে।

Handler চলার সময় nested annotated function-এর body চলে, কিন্তু সেই thread-এ
তার hook handler skip হয়। এতে ভুল করে hook recursion হয় না। Handler panic
করলে Beans-এর সাধারণ panic rule চলে।

এই release-এ `around` বা `proceed`, argument বা result বদলানো, local-variable
hook, আর `@test` runner নেই।

Schema, target, retention, আর repeatable use-এর জন্য দেখুন
[Annotation](/bn/guide/annotations/)।
