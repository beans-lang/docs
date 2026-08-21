---
title: Files and mapping
description: The built-in File, Dir, and MMap types for reading, writing, listing, and memory-mapping files.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 3 types · 18 static methods · 35 instance methods.
<!-- coverage:summary:end -->

Beans has three builtin types for working with the file system: `File` for a single
file, `Dir` for directories, and `MMap` for memory-mapped files and shared memory.
They are native builtins with no `.b` source, reached through the runtime ABI table
in [`src/expression.b`](https://github.com/beans-lang/beans/blob/main/src/expression.b).

Because these are builtins, their signatures are positional: the parameter types
are fixed, the names are not part of the signature. Most calls return a
[`Result`](/reference/builtins/option-result/) because file work can fail. Reads and
writes use [`Bytes`](/reference/builtins/bytes/).

`File` and `MMap` are move-only `Send` owners, but not `Sync`. You can move one
handle to a worker thread; you cannot copy or share a mutable alias.

## File

An open file with a read/write cursor.

### Statics

Call these on the `File` type itself. Opening is the fallible constructor: it
returns `Result<File>`.

```beans
File.exists(string) -> bool
File.size(string) -> Result<int>
File.open(string, string) -> Result<File>
File.copy(string, string) -> Result<int>
File.remove(string) -> Result<bool>
File.rename(string, string) -> Result<bool>
```

The second argument to `File.open` is the mode, one of:

- `"r"`: read only
- `"rw"`: read and write, must already exist
- `"create"`: create, or truncate an existing file, for read and write
- `"append"`: open for adding at the end

`File.exists` answers whether a file is there without opening it. `File.size` also
works as a static that takes a path, so you can read a file's length without an
open handle; the same call exists as a method on an open file (below). `File.copy`
uses the platform file-copy path when available and returns the byte count.

### Methods

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

- `read(n)` reads up to `n` bytes from the current cursor and moves the cursor
  forward; a short read at end of file returns the bytes that are there.
  `write(b)` writes from the cursor, returns how many bytes went out, and moves the
  cursor forward.
- `read_at(pos, n)` and `write_at(pos, b)` take an absolute position and do not use
  or move the cursor, so they are safe to call from more than one place in the file.
- `read_text` and `read_text_at` are the text forms. They fill the returned string
  directly instead of reading `Bytes` and converting it. `write_text` and
  `write_text_at` write string storage directly. Use them when the data is text;
  the byte methods keep their owned `Bytes` behavior.
- `seek(pos)` moves the cursor to `pos`; `seek_from_end(off)` moves it to `off`
  bytes before the end. Both return the new position and panic if the file is
  closed. `tell()` returns the current position.
- `truncate(n)` cuts or extends the file to exactly `n` bytes. `sync()` flushes the
  file's data to disk (fsync). `close()` releases the descriptor; closing a file
  that is already closed is an error.
- `lock`, `try_lock`, and `unlock` take and release an advisory whole-file lock
  (flock). `lock` blocks until it gets the lock; `try_lock` returns `ok(false)`
  when another holder has it, rather than waiting.

Every file descriptor Beans owns is close-on-exec.

Write a file, then read part of it back through the cursor:

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

All directory work is on statics of the `Dir` type.

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

- `create` makes one directory and fails if a parent is missing; `create_all`
  makes the directory and any missing parents.
- `current()` returns the process's current working directory as an absolute
  path.
- `list` returns the names directly inside a directory, sorted. `walk` returns every
  file and symlink underneath it, recursive, sorted, each path relative to the
  directory you passed.
- `remove` removes an empty directory; `remove_all` removes a directory and
  everything in it.
- `sync` flushes the directory entry itself. `temp_path` returns the system
  temporary directory as a plain string; it does not touch the disk.

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

`MMap` maps a file, or a POSIX shared memory object, into memory so you read and
write it like a buffer.

### Statics

```beans
MMap.open(string, bool) -> Result<MMap>
MMap.open_shared_memory(string, int, bool) -> Result<MMap>
MMap.unlink_shared_memory(string) -> Result<bool>
```

- `MMap.open(path, writable)` maps the whole file with `MAP_SHARED`. Pass `true` for
  a writable mapping, `false` for read only.
- `MMap.open_shared_memory(name, size, create)` opens a named shared memory object.
  You give the `size` on every open, and `create` chooses whether to create it if it
  does not exist.
- `MMap.unlink_shared_memory(name)` removes a shared memory object by name.

### Methods

```beans
MMap.len() -> int
MMap.get_u8(int) -> int
MMap.get_u16(int) -> int
MMap.get_u32(int) -> int
MMap.get_u64(int) -> int
MMap.get_i64(int) -> int
MMap.put_u8(int, int)
MMap.put_u16(int, int)
MMap.put_u32(int, int)
MMap.put_u64(int, int)
MMap.put_i64(int, int)
MMap.read(int, int) -> Bytes
MMap.write(int, Bytes)
MMap.flush() -> Result<bool>
MMap.flush_range(int, int) -> Result<bool>
MMap.resize(int) -> Result<bool>
MMap.close() -> Result<bool>
```

- `len()` is the mapped size in bytes.
- The `get_*` readers return an integer read at a byte position, little-endian and
  bounds-checked; an out-of-range position panics. The `put_*` writers write an
  integer at a position, little-endian and bounds-checked.
- `read(pos, n)` copies `n` bytes at `pos` into a new `Bytes`. `write(pos, b)`
  copies `b` into the mapping at `pos`.
- `flush()` writes all changes back (msync); `flush_range(pos, n)` flushes only
  `[pos, pos + n)`. `resize(n)` resizes the mapping and is not available on shared
  memory. `close()` unmaps it.

<!-- beans:compile -->
```beans
import std.io

fn main() {
    let name: string = "beans_docs_shm"
    let m: MMap = MMap.open_shared_memory(name, 64, true).expect("open")

    m.put_u32(0, 123456789)
    m.put_u64(8, 42)
    io.println("{m.get_u32(0)} {m.get_u64(8)} over {m.len()} bytes")

    m.flush().expect("flush")
    m.close().expect("close")
    MMap.unlink_shared_memory(name).expect("unlink")
}
```

## Error kinds

When a file call fails, the `Error.kind` slug is one of:

`not_found`, `permission`, `exists`, `is_dir`, `not_dir`, `not_empty`, `closed`,
`io`.

You can match on the kind to decide what to do. See
[Option, Result, and Error](/reference/builtins/option-result/).

## See also

- [Bytes](/reference/builtins/bytes/), the buffer reads and writes use.
- [Option, Result, and Error](/reference/builtins/option-result/), handling failures.
- [The standard library](/reference/stdlib/), higher-level I/O modules.
