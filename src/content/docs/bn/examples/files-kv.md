---
title: Files and a KV store
description: examples/files.b, examples/kv.b-এর append-only key-value store, আর examples/locks.b-এর advisory file lock — সব ঘুরে দেখা।
---

এই তিনটা উদাহরণ মিলে পুরো file-এর গল্পটা বলে: file API
([`files.b`](https://github.com/beans-lang/beans/blob/main/examples/files.b)),
তার উপরে বানানো একটা আসল durable key-value store
([`kv.b`](https://github.com/beans-lang/beans/blob/main/examples/kv.b)), আর
single-writer database-এর জন্য advisory lock
([`locks.b`](https://github.com/beans-lang/beans/blob/main/examples/locks.b))।

## files.b

`files.b` তার সব কাজ করে `Dir.temp_path()`-এর নিচে একটা scratch directory-তে, তাই
প্রতিবার চালালে ওর output একই থাকে। type-গুলো হলো `std.fs`-এর `File` আর `Dir`,
সাথে path নিয়ে হিসাব করতে `std.path`।

### Directory, পুরো ফাইল read আর write

```beans
let base: string = "{Dir.temp_path()}/beans_files_example"
Dir.remove_all(base)
Dir.create_all("{base}/sub").expect("create_all")
io.println("{Dir.exists(base)} {Dir.exists("{base}/nope")}")

let f1: string = "{base}/hello.txt"
io.println("{fs.write(f1, "hello\nworld\n").expect("write")}")
io.print(fs.read(f1).expect("read"))
io.println("{fs.append(f1, "again\n").expect("append")}")
io.println("{File.size(f1).expect("size")}")
```

`Dir.create_all` একটা directory আর তার parent-গুলো বানায়। `fs.write`, `fs.read`,
আর `fs.append` পুরো ফাইলের উপর কাজ করে। প্রতিটা একটা `Result` দেয়, আর
`.expect(...)` সেটা খুলে দেয় — না পারলে ওই message দিয়ে panic করে। `File.size` আর
`File.exists` হলো static — ফাইল না খুলেই `File` type-এর উপর এগুলো call করা যায়।

### Bytes দিয়ে binary round-trip

```beans
let page: Bytes = new Bytes(32)
page.put_u32(0, 7).put_u64(4, 123456789).append_string("tail")
fs.write_bytes("{base}/page.bin", page).expect("write_bytes")
let back: Bytes = fs.read_bytes("{base}/page.bin").expect("read_bytes")
io.println("{back.len()} {back.get_u32(0)} {back.get_u64(4)}")
```

`Bytes` হলো একটা বাড়তে পারা byte buffer। `put_u32`/`put_u64` একটা byte offset-এ
integer লেখে; `get_u32`/`get_u64` সেগুলো আবার পড়ে। নিচের KV store-টা এরই উপর বানানো।

### List করা আর হেঁটে যাওয়া

```beans
io.println(Dir.list("{base}/sub").expect("list").join(","))
io.println(Dir.walk(base).expect("walk"))
```

`Dir.list` একটা directory-র entry-গুলো দেয়; `Dir.walk` ভেতরে ঢুকে ঢুকে ঘুরে আসে।
দুইটাই **sorted** হয়ে ফিরে আসে, তাই output-এর diff পরিষ্কার থাকে।

### একটা খোলা file handle

```beans
let f: File = File.open(db, "create").expect("open")
f.write_at(0, new Bytes(16).fill(170)).expect("prefill")
f.write_at(4, new Bytes(4).put_u32(0, 999)).expect("patch")
let got: Bytes = f.read_at(4, 4).expect("read_at")
// ... seek, tell, truncate ...
f.sync().expect("sync")
f.close().expect("close")
```

`File.open` positional I/O-র জন্য একটা খোলা handle দেয়: `write_at`/`read_at` একটা
offset-এ কাজ করে, `seek`/`tell` একটা cursor সরায়, `truncate` ফাইলটা কেটে দেয়, আর
`sync` disk-এ flush করে। error-গুলো একটা `kind` বহন করে:

```beans
match f.close() {
    ok(x) => io.println("double close ok?"),
    err(e) => io.println("double close: {e.kind}: {e.msg}"),
}
```

দুইবার close করা একটা error, চুপচাপ কিছু-না-করা না। দ্বিতীয় call-টা
caller-এর একটা bug, আর `Error.kind` সেটার নাম বলে দেয়।

চালান:

```bash
beansc run examples/files.b
```

## kv.b: একটা append-only key-value store

`kv.b` হলো একটা ছোট key-value store, যেখানে প্রতিটা write একটা ফাইলে append হয়, আর
একটা `compact()` step ফাইলটাকে durable-ভাবে আবার লিখে দেয়।

record-এর format-টা, ফাইলের নিজের comment থেকে: `[u32 klen][u32 vlen][key][value]`,
আর **শেষ write-ই জেতে**।

### লেখা হলো একটা append

```beans
pub fn set(key: string, value: string) -> Result<int> {
    var rec: Bytes = new Bytes(8)
    rec.put_u32(0, key.len()).put_u32(4, value.len())
    rec.append_string(key).append_string(value)
    return fs.append_bytes(self.path, rec)
}
```

প্রতিটা `set` একটা করে record বানায় — একটা ৮-byte header (দুইটা length), তারপর
key আর value-র byte — আর সেটা append করে দেয়। কোনো seek নেই, নতুন করে কিছু লেখা
নেই; append সস্তা আর crash হলেও নিরাপদ।

### পড়া হলো log-টা scan করা

```beans
pub fn get(key: string) -> Result<string> {
    let data: Bytes = fs.read_bytes(self.path)?
    // ...
    for pos + 8 <= data.len() {
        let kl: int = data.get_u32(pos)
        let vl: int = data.get_u32(pos + 4)
        // a crash mid-append can leave a torn trailing record; stop at it
        if pos + 8 + kl + vl > data.len() {
            break
        }
        let k: string = data.slice(pos + 8, pos + 8 + kl).to_string_until_nul()
        if k == key {
            found = data.slice(pos + 8 + kl, pos + 8 + kl + vl).to_string_until_nul()
            have = true
        }
        pos = pos + 8 + kl + vl
    }
```

`get` পুরো log-টা হেঁটে যায়, আর key-এর জন্য শেষ যেই value দেখল সেটা রাখে। গুরুত্বপূর্ণ
লাইনটা হলো ওই `break`: একটা record যদি বলে যে তার length ফাইলের শেষ ছাড়িয়ে যায়,
তাহলে সেটা append-এর মাঝপথে crash হওয়া একটা **ছেঁড়া লেজের record**। scan-টা ওখানেই
থেমে যায় — শেষ ছাড়িয়ে slice করে panic করার বদলে। এটাই append-only-log-এর চেনা
recovery।

### durable commit সহ compact()

```beans
let tmp: string = "{self.path}.tmp"
fs.write_bytes(tmp, out)?
let f: File = File.open(tmp, "rw")?
f.sync()?
f.close()?
File.rename(tmp, self.path)?
Dir.sync(self.dir)?
return ok(out.len())
```

`compact()` প্রতিটা key-এর শুধু শেষ value-টা রেখে ফাইলটা আবার লেখে, তারপর সেটাকে
durable-ভাবে commit করে। আসল ব্যাপারটা হলো এই চার-ধাপের durable-commit প্যাটার্ন:

1. নতুন data একটা **temp file**-এ লেখা হয়,
2. সেটাকে `sync()` করা হয় যাতে byte-গুলো সত্যিই disk-এ পৌঁছায়,
3. temp file-টাকে আসল ফাইলের উপর `rename` করা হয় (একটা atomic replace), আর
4. `Dir.sync` দিয়ে **parent directory**-টা sync করা হয়, যাতে rename-টা নিজেই durable হয়।

এই ধারাটা শেষ হওয়ার পরে যেকোনো মুহূর্তে crash হলে হয় পুরনো ফাইল থাকবে নয়তো নতুনটা
— কখনো অর্ধেক-লেখা কোনো ফাইল না।

### crash test

`main` ইচ্ছা করেই একটা ছেঁড়া record append করে — একটা পুরো ৮-byte header, যেটা দাবি
করে একটা ১০০-byte key আর ১০০-byte value, অথচ সেগুলো কখনো লেখাই হয়নি — তারপর দেখিয়ে
দেয় যে `get` আর `compact` এটাকে EOF ধরে নিয়ে সামলে নেয়:

```beans
var torn: Bytes = new Bytes(8)
torn.put_u32(0, 100).put_u32(4, 100)
fs.append_bytes(kv.path, torn).expect("torn append")
io.println(kv.get("name").expect("survives torn tail"))
let recovered: int = kv.compact().expect("compact past torn tail")
```

চালান:

```bash
beansc run examples/kv.b
```

## locks.b: advisory file lock

`locks.b` advisory lock (`flock`) দিয়ে single-writer database প্যাটার্নটা দেখায়।
মূল কথাটা, ফাইল থেকে: lock-গুলো থাকে **খোলা file description**-এর সাথে, তাই একই
ফাইলের উপর দুইটা আলাদা handle একে অন্যের সাথে টক্কর দেয়।

```beans
let writer: File = File.open(p, "rw").expect("open writer")
let rival: File = File.open(p, "rw").expect("open rival")

io.println("{writer.lock().expect("lock")}")
io.println("{rival.try_lock().expect("try while held")}")
io.println("{writer.unlock().expect("unlock")}")
io.println("{rival.try_lock().expect("try after release")}")
```

- `lock()` lock না পাওয়া পর্যন্ত block করে থাকে; `EINTR` হলে আবার চেষ্টা করে।
- `try_lock()` সাথে সাথে ফিরে আসে। `ok(false)` বোঝায় "আর কেউ এটা ধরে রেখেছে" —
  এজন্যই এই উদাহরণটা এটা ব্যবহার করে, যাতে output প্রতিবার একই থাকে।

ফাইলের comment থেকে একটা সাবধানবাণী: একটা single thread যদি একটা description-এর
উপর blocking `lock()` call করে, অথচ সে আগেই আরেকটা handle দিয়ে ওই description ধরে
রেখেছে, তাহলে সে চিরকাল অপেক্ষা করতে থাকবে। একই thread হয়তো আগেই lock ধরে থাকতে পারে
— এমন হলে `try_lock` ব্যবহার করুন।

একটা বন্ধ ফাইল lock করা একটা error, crash না:

```beans
writer.close().expect("close writer")
match writer.lock() {
    ok(x) => io.println("locked a closed file?"),
    err(e) => io.println("{e.kind}: {e.msg}"),
}
```

চালান:

```bash
beansc run examples/locks.b
```

[File আর mapping](/bn/reference/builtins/files/) হলো `File`, `Dir`, আর `MMap`-এর
reference। [std.fs](/bn/reference/stdlib/fs/)-এ filesystem package নিয়ে লেখা আছে, আর
[Bytes](/bn/reference/builtins/bytes/)-এ এখানে সব জায়গায় ব্যবহার হওয়া byte buffer-টা
নিয়ে লেখা আছে।
