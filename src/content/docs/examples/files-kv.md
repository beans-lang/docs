---
title: Files and a KV store
description: A walk through examples/files.b, the append-only key-value store in examples/kv.b, and advisory file locks in examples/locks.b.
---

These three examples cover the file story: the file API
([`files.b`](https://github.com/beans-lang/beans/blob/main/examples/files.b)), a
real durable key-value store built on it
([`kv.b`](https://github.com/beans-lang/beans/blob/main/examples/kv.b)), and
advisory locks for a single-writer database
([`locks.b`](https://github.com/beans-lang/beans/blob/main/examples/locks.b)).

## files.b

`files.b` does everything inside a scratch directory under `Dir.temp_path()`, so
its output is the same every run. The types are `File` and `Dir` from `std.fs`,
with `std.path` for path math.

### Directories, whole-file read and write

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

`Dir.create_all` makes a directory and its parents. `fs.write`, `fs.read`, and
`fs.append` are whole-file operations. Each returns a `Result`, and `.expect(...)`
unwraps it or panics with the message. `File.size` and `File.exists` are
statics you call on the `File` type without opening the file.

### Binary round-trip with Bytes

```beans
let page: Bytes = new Bytes(32)
page.put_u32(0, 7).put_u64(4, 123456789).append_string("tail")
fs.write_bytes("{base}/page.bin", page).expect("write_bytes")
let back: Bytes = fs.read_bytes("{base}/page.bin").expect("read_bytes")
io.println("{back.len()} {back.get_u32(0)} {back.get_u64(4)}")
```

`Bytes` is a growable byte buffer. `put_u32`/`put_u64` write integers at a byte
offset; `get_u32`/`get_u64` read them back. This is the foundation the KV store
below is built on.

### Listing and walking

```beans
io.println(Dir.list("{base}/sub").expect("list").join(","))
io.println(Dir.walk(base).expect("walk"))
```

`Dir.list` gives one directory's entries; `Dir.walk` recurses. Both come back
**sorted**, so output diffs cleanly.

### An open file handle

```beans
let f: File = File.open(db, "create").expect("open")
f.write_at(0, new Bytes(16).fill(170)).expect("prefill")
f.write_at(4, new Bytes(4).put_u32(0, 999)).expect("patch")
let got: Bytes = f.read_at(4, 4).expect("read_at")
// ... seek, tell, truncate ...
f.sync().expect("sync")
f.close().expect("close")
```

`File.open` returns an open handle for positional I/O: `write_at`/`read_at` work
at an offset, `seek`/`tell` move a cursor, `truncate` cuts the file, and `sync`
flushes to disk. Errors carry a `kind`:

```beans
match f.close() {
    ok(x) => io.println("double close ok?"),
    err(e) => io.println("double close: {e.kind}: {e.msg}"),
}
```

Closing twice is an error, not a silent no-op. The second call is a bug in the
caller, and `Error.kind` names it.

Run it:

```bash
beansc run examples/files.b
```

## kv.b: an append-only key-value store

`kv.b` is a small key-value store where every write is appended to one file,
and a `compact()` step rewrites the file durably.

The record format, from the file's own comment: `[u32 klen][u32 vlen][key][value]`,
and **last write wins**.

### Writing is an append

```beans
pub fn set(key: string, value: string) -> Result<int> {
    var rec: Bytes = new Bytes(8)
    rec.put_u32(0, key.len()).put_u32(4, value.len())
    rec.append_string(key).append_string(value)
    return fs.append_bytes(self.path, rec)
}
```

Each `set` builds one record, an 8-byte header (two lengths) followed by the
key and value bytes, and appends it. No seeking, no rewriting; appends are
cheap and crash-safe.

### Reading scans the log

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

`get` walks the whole log and keeps the last value it sees for the key. The
important line is the `break`: if a record's claimed length runs past the end of
the file, that is a **torn trailing record** from a crash mid-append. The scan
stops there instead of slicing past the end and panicking. This is standard
append-only-log recovery.

### compact() with a durable commit

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

`compact()` rewrites the file keeping only the last value per key, then commits
it durably. The four-step durable-commit pattern is the point:

1. write the new data to a **temp file**,
2. `sync()` it so the bytes are really on disk,
3. `rename` the temp file over the real one (an atomic replace), and
4. `Dir.sync` the **parent directory** so the rename itself is durable.

After that sequence, a crash at any moment leaves either the old file or the new
one, never a half-written file.

### The crash test

`main` deliberately appends a torn record, a full 8-byte header claiming a
100-byte key and 100-byte value that were never written, then confirms `get`
and `compact` treat it as EOF and recover:

```beans
var torn: Bytes = new Bytes(8)
torn.put_u32(0, 100).put_u32(4, 100)
fs.append_bytes(kv.path, torn).expect("torn append")
io.println(kv.get("name").expect("survives torn tail"))
let recovered: int = kv.compact().expect("compact past torn tail")
```

Run it:

```bash
beansc run examples/kv.b
```

## locks.b: advisory file locks

`locks.b` shows the single-writer database pattern with advisory locks
(`flock`). The key fact, from the file: locks belong to the **open file
description**, so two separate handles on the same file contend.

```beans
let writer: File = File.open(p, "rw").expect("open writer")
let rival: File = File.open(p, "rw").expect("open rival")

io.println("{writer.lock().expect("lock")}")
io.println("{rival.try_lock().expect("try while held")}")
io.println("{writer.unlock().expect("unlock")}")
io.println("{rival.try_lock().expect("try after release")}")
```

- `lock()` blocks until it gets the lock; it retries through `EINTR`.
- `try_lock()` returns right away. `ok(false)` means "someone else holds it",
  which is why this example uses it, so the output stays deterministic.

A warning from the file's comment: a single thread that calls the blocking
`lock()` on a description it already holds through another handle would wait
forever. Use `try_lock` when the same thread might already hold the lock.

Locking a closed file is an error, not a crash:

```beans
writer.close().expect("close writer")
match writer.lock() {
    ok(x) => io.println("locked a closed file?"),
    err(e) => io.println("{e.kind}: {e.msg}"),
}
```

Run it:

```bash
beansc run examples/locks.b
```

[Files and mappings](/reference/builtins/files/) is the `File`, `Dir`, and
`MMap` reference. [std.fs](/reference/stdlib/fs/) documents the filesystem
package, and [Bytes](/reference/builtins/bytes/) documents the byte buffer used
throughout.
