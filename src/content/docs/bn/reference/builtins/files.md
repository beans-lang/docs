---
title: Files and mapping
description: file পড়া, লেখা, তালিকা করা, আর memory-map করার builtin File, Dir, আর MMap type গুলো।
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 3 types · 18 static methods · 35 instance methods.
<!-- coverage:summary:end -->

file system নিয়ে কাজ করার জন্য Beans-এ তিনটা builtin type আছে: একটা file-এর জন্য
`File`, directory-র জন্য `Dir`, আর memory-mapped file ও shared memory-র জন্য
`MMap`। এগুলো native builtin, এদের কোনো `.b` source নেই, আর runtime ABI table দিয়ে
এদের কাছে পৌঁছানো হয় —
[`compiler/beans/expression.b`](https://github.com/beans-lang/beans/blob/main/compiler/beans/expression.b)-তে।

এগুলো builtin বলে এদের signature গুলো positional: parameter-এর type গুলো fixed, নাম
গুলো signature-এর অংশ না। বেশিরভাগ call একটা [`Result`](/bn/reference/builtins/option-result/)
দেয়, কারণ file নিয়ে কাজ ব্যর্থ হতে পারে। read আর write [`Bytes`](/bn/reference/builtins/bytes/)
সরায়।

## File

একটা খোলা file, সাথে একটা read/write cursor।

### Static গুলো

এগুলো `File` type-এর ওপরই call করা হয়। খোলাটা হলো সেই constructor যেটা ব্যর্থ হতে
পারে: এটা `Result<File>` দেয়।

```beans
File.exists(string) -> bool
File.size(string) -> Result<int>
File.open(string, string) -> Result<File>
File.copy(string, string) -> Result<int>
File.remove(string) -> Result<bool>
File.rename(string, string) -> Result<bool>
```

`File.open`-এর দ্বিতীয় argument হলো mode, এর একটা:

- `"r"`: শুধু পড়া
- `"rw"`: পড়া আর লেখা, file আগে থেকেই থাকতে হবে
- `"create"`: নতুন বানায়, বা থাকা file-টা খালি করে, পড়া আর লেখার জন্য
- `"append"`: শেষে যোগ করার জন্য খোলে

`File.exists` file না খুলেই বলে দেয় সেটা আছে কিনা। `File.size` একটা static
হিসেবেও কাজ করে যেটা একটা path নেয়, তাই কোনো খোলা handle ছাড়াই file-এর length পড়া
যায়; একই call একটা খোলা file-এর ওপর method হিসেবেও আছে (নিচে)। `File.copy` যেখানে
পাওয়া যায় সেখানে platform-এর নিজের file-copy পথ ব্যবহার করে, আর byte-এর সংখ্যাটা
ফেরত দেয়।

### Method গুলো

```beans
File.read(int) -> Result<Bytes>
File.read_at(int, int) -> Result<Bytes>
File.read_text(int) -> Result<string>
File.read_text_at(int, int) -> Result<string>
File.write(Bytes) -> Result<int>
File.write_at(int, Bytes) -> Result<int>
File.write_text(string) -> Result<int>
File.write_text_at(int, string) -> Result<int>
File.seek(int) -> int
File.seek_from_end(int) -> int
File.tell() -> int
File.size() -> Result<int>
File.truncate(int) -> Result<bool>
File.sync() -> Result<bool>
File.close() -> Result<bool>
File.lock() -> Result<bool>
File.try_lock() -> Result<bool>
File.unlock() -> Result<bool>
```

- `read(n)` বর্তমান cursor থেকে `n` byte পর্যন্ত পড়ে আর cursor-টা সামনে সরিয়ে
  দেয়; file-এর শেষে গিয়ে কম পড়া হলে যেটুকু byte আছে সেটুকুই দেয়। `write(b)` cursor
  থেকে লেখে, কত byte গেল সেটা ফেরত দেয়, আর cursor-টা সামনে সরিয়ে দেয়।
- `read_at(pos, n)` আর `write_at(pos, b)` একটা পূর্ণ অবস্থান নেয় আর cursor ব্যবহার
  বা সরায় না, তাই file-এর একাধিক জায়গা থেকে এগুলো call করা নিরাপদ।
- `read_text` আর `read_text_at` হলো text-এর রূপ। এগুলো `Bytes` পড়ে convert না করে
  সরাসরি ফেরত দেওয়া string-টা ভরে দেয়। `write_text` আর `write_text_at` সরাসরি string
  storage লেখে। data যখন text, তখন এগুলো ব্যবহার করা হয়; byte method গুলো তাদের নিজের
  owned `Bytes` আচরণ রাখে।
- `seek(pos)` cursor-টা `pos`-এ সরায়; `seek_from_end(off)` সেটাকে file-এর শেষ থেকে
  `off` byte আগে সরায়। দুইটাই নতুন অবস্থানটা ফেরত দেয় আর file বন্ধ থাকলে panic
  করে। `tell()` বর্তমান অবস্থানটা ফেরত দেয়।
- `truncate(n)` file-টাকে ঠিক `n` byte-এ কাটে বা বাড়ায়। `sync()` file-এর data
  disk-এ flush করে (fsync)। `close()` descriptor-টা ছেড়ে দেয়; আগেই বন্ধ হয়ে যাওয়া
  একটা file আবার বন্ধ করা একটা error।
- `lock`, `try_lock`, আর `unlock` একটা advisory whole-file lock (flock) নেয় ও ছাড়ে।
  `lock` lock না পাওয়া পর্যন্ত block করে থাকে; `try_lock` অন্য কেউ lock ধরে রাখলে
  অপেক্ষা না করে `ok(false)` দেয়।

Beans যে file descriptor-এর মালিক, সেগুলো সবই close-on-exec।

একটা file লেখা, তারপর cursor দিয়ে তার একটা অংশ আবার পড়া:

<!-- beans:compile -->
```beans
import std.io

fn main() {
    let f: File = File.open("greeting.txt", "create").expect("open")
    f.write(Bytes.from("hello world")).expect("write")

    f.seek(0)
    let head: Bytes = f.read(5).expect("read")
    io.println(head.to_string())
    io.println("cursor now at {f.tell()}")

    f.close().expect("close")
}
```

## Dir

সব directory-র কাজ `Dir` type-এর static-এর ওপর।

```beans
Dir.create(string) -> Result<bool>
Dir.create_all(string) -> Result<bool>
Dir.current() -> string
Dir.exists(string) -> bool
Dir.list(string) -> Result<List<string>>
Dir.walk(string) -> Result<List<string>>
Dir.remove(string) -> Result<bool>
Dir.remove_all(string) -> Result<bool>
Dir.sync(string) -> Result<bool>
Dir.temp_path() -> string
```

- `create` একটা directory বানায় আর কোনো parent না থাকলে ব্যর্থ হয়; `create_all`
  directory-টা আর যেসব parent নেই সেগুলোও বানায়।
- `current()` process-এর বর্তমান working directory একটা absolute path হিসেবে ফেরত
  দেয়।
- `list` একটা directory-র ঠিক ভেতরের নাম গুলো sorted অবস্থায় ফেরত দেয়। `walk`
  তার নিচের প্রতিটা file আর symlink ফেরত দেয়, recursive, sorted, আর প্রতিটা path
  যে directory দেওয়া হয়েছে তার relative।
- `remove` একটা খালি directory সরায়; `remove_all` একটা directory আর তার ভেতরের
  সবকিছু সরায়।
- `sync` directory entry-টা নিজেই flush করে। `temp_path` system-এর temporary
  directory-টা একটা সাধারণ string হিসেবে ফেরত দেয়; এটা disk-এ হাত দেয় না।

<!-- beans:compile -->
```beans
import std.io

fn main() {
    let base: string = "{Dir.temp_path()}/beans_docs_demo"
    Dir.create_all(base).expect("create")

    let names: List<string> = Dir.list(Dir.temp_path()).expect("list")
    io.println("{names.len()} entries in the temp directory")

    Dir.remove_all(base).expect("clean up")
}
```

## MMap

`MMap` একটা file, বা একটা POSIX shared memory object, memory-তে map করে, যাতে
সেটা একটা buffer-এর মতো পড়া আর লেখা যায়।

### Static গুলো

```beans
MMap.open(string, bool) -> Result<MMap>
MMap.open_shared_memory(string, int, bool) -> Result<MMap>
MMap.unlink_shared_memory(string) -> Result<bool>
```

- `MMap.open(path, writable)` পুরো file-টা `MAP_SHARED` দিয়ে map করে। writable
  mapping-এর জন্য `true` দিতে হয়, শুধু পড়ার জন্য `false`।
- `MMap.open_shared_memory(name, size, create)` একটা নাম-ধরা shared memory object
  খোলে। প্রতিবার খোলার সময় `size` দিতে হয়, আর object না থাকলে বানানো হবে কিনা সেটা
  `create` ঠিক করে।
- `MMap.unlink_shared_memory(name)` নাম দিয়ে একটা shared memory object সরিয়ে দেয়।

### Method গুলো

```beans
MMap.len() -> int
MMap.get_u8(int) -> int
MMap.get_u16(int) -> int
MMap.get_u32(int) -> int
MMap.get_u64(int) -> int
MMap.get_i64(int) -> int
MMap.put_u8(int, int) -> MMap
MMap.put_u16(int, int) -> MMap
MMap.put_u32(int, int) -> MMap
MMap.put_u64(int, int) -> MMap
MMap.put_i64(int, int) -> MMap
MMap.read(int, int) -> Bytes
MMap.write(int, Bytes) -> MMap
MMap.flush() -> Result<bool>
MMap.flush_range(int, int) -> Result<bool>
MMap.resize(int) -> Result<bool>
MMap.close() -> Result<bool>
```

- `len()` হলো map-করা আকার, byte-এ।
- `get_*` reader গুলো একটা byte-অবস্থানে একটা integer পড়ে, little-endian আর
  bounds-checked; সীমার বাইরের অবস্থান হলে panic হয়। `put_*` writer গুলো একটা
  অবস্থানে একটা integer লেখে, little-endian আর bounds-checked, আর একই mapping ফেরত
  দেয় যাতে চেইন করা যায়।
- `read(pos, n)` `pos`-এ থাকা `n` byte একটা নতুন `Bytes`-এ copy করে। `write(pos, b)`
  `b`-কে mapping-এর `pos`-এ copy করে আর mapping-টা ফেরত দেয়।
- `flush()` সব বদল আবার লিখে দেয় (msync); `flush_range(pos, n)` শুধু
  `[pos, pos + n)` flush করে। `resize(n)` mapping-টা resize করে আর এটা shared
  memory-তে পাওয়া যায় না। `close()` সেটা unmap করে।

<!-- beans:compile -->
```beans
import std.io

fn main() {
    let name: string = "beans_docs_shm"
    let m: MMap = MMap.open_shared_memory(name, 64, true).expect("open")

    m.put_u32(0, 123456789).put_u64(8, 42)
    io.println("{m.get_u32(0)} {m.get_u64(8)} over {m.len()} bytes")

    m.flush().expect("flush")
    m.close().expect("close")
    MMap.unlink_shared_memory(name).expect("unlink")
}
```

## Error-এর ধরন

কোনো file call ব্যর্থ হলে, `Error.kind` slug-টা এগুলোর একটা হয়:

`not_found`, `permission`, `exists`, `is_dir`, `not_dir`, `not_empty`, `closed`,
`io`।

কী করা হবে সেটা ঠিক করতে kind-এর ওপর match করা যায়। দেখুন
[Option, Result, আর Error](/bn/reference/builtins/option-result/)।

## আরও দেখুন

- [Bytes](/bn/reference/builtins/bytes/), read আর write যে buffer ব্যবহার করে।
- [Option, Result, আর Error](/bn/reference/builtins/option-result/), ব্যর্থতা সামলানো।
- [standard library](/bn/reference/stdlib/), উঁচু-স্তরের I/O module গুলো।
