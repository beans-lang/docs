---
title: Files and mapping
description: The built-in File, Dir, and MMap types for reading, writing, listing, and memory-mapping files.
---

Beans has three builtin types for working with the file system: `File` for a single
file, `Dir` for directories, and `MMap` for memory-mapped files and shared memory.
These are native builtins, reached through the runtime ABI table at
[`compiler/beans/expression.b`](https://github.com/beans-lang/beans/blob/main/compiler/beans/expression.b).

Most calls return a [`Result`](/reference/builtins/option-result/) because file work
can fail. Reads and writes use [`Bytes`](/reference/builtins/bytes/).

## File

### Statics

You call these on the `File` type itself.

| Static | Returns | Notes |
| --- | --- | --- |
| `File.exists(path)` | `bool` | is there a file at `path` |
| `File.size(path)` | `Result<int>` | size in bytes |
| `File.remove(path)` | `Result<bool>` | delete the file |
| `File.rename(a, b)` | `Result<bool>` | move `a` to `b` |
| `File.open(path, mode)` | `Result<File>` | open a file |

The `mode` for `File.open` is one of:

- `"r"` — read only
- `"rw"` — read and write
- `"create"` — create (or truncate) for read and write
- `"append"` — open for adding at the end

```beans
let f: File = File.open("data.bin", "rw")?
```

### Methods

| Method | Returns | Notes |
| --- | --- | --- |
| `read_at(pos, n)` | `Result<Bytes>` | read `n` bytes at `pos`; a short read at EOF returns what is there |
| `write_at(pos, b)` | `Result<int>` | write bytes at `pos`; returns bytes written |
| `read(n)` | `Result<Bytes>` | read `n` bytes from the current position |
| `write(b)` | `Result<int>` | write from the current position; returns bytes written |
| `seek(pos)` | `int` | move to `pos`; panics if the file is closed |
| `seek_from_end(off)` | `int` | move to `off` bytes before the end |
| `tell()` | `int` | current position |
| `size()` | `Result<int>` | size in bytes |
| `truncate(n)` | `Result<bool>` | cut or extend the file to `n` bytes |
| `sync()` | `Result<bool>` | flush to disk (fsync) |
| `close()` | `Result<bool>` | close the file; closing twice is an error |
| `lock()` | `Result<bool>` | take an advisory lock (flock) |
| `try_lock()` | `Result<bool>` | try to lock; `ok(false)` means someone else holds it |
| `unlock()` | `Result<bool>` | release the lock |

Every file descriptor Beans owns is close-on-exec.

## Dir

All directory work is on statics of the `Dir` type.

| Static | Returns | Notes |
| --- | --- | --- |
| `Dir.create(path)` | `Result<bool>` | make one directory |
| `Dir.create_all(path)` | `Result<bool>` | make a directory and any missing parents |
| `Dir.list(path)` | `Result<List<string>>` | names in the directory, sorted |
| `Dir.remove(path)` | `Result<bool>` | remove an empty directory |
| `Dir.remove_all(path)` | `Result<bool>` | remove a directory and all its contents |
| `Dir.exists(path)` | `bool` | is there a directory at `path` |
| `Dir.temp_path()` | `string` | the system temporary directory |
| `Dir.sync(path)` | `Result<bool>` | flush the directory entry |
| `Dir.walk(path)` | `Result<List<string>>` | every file and symlink underneath, recursive, sorted, relative to `path` |

```beans
let names: List<string> = Dir.list(".")?
```

## MMap

`MMap` maps a file (or shared memory) into memory so you can read and write it like
a buffer.

### Statics

| Static | Returns | Notes |
| --- | --- | --- |
| `MMap.open(path, writable)` | `Result<MMap>` | map the whole file (MAP_SHARED) |
| `MMap.open_shared_memory(name, size, create)` | `Result<MMap>` | POSIX shared memory; you give `size` on every open |
| `MMap.unlink_shared_memory(name)` | `Result<bool>` | remove a shared memory object |

### Methods

| Method | Returns | Notes |
| --- | --- | --- |
| `len()` | `int` | mapped size in bytes |
| `get_u8(pos)` `get_u16(pos)` `get_u32(pos)` `get_u64(pos)` `get_i64(pos)` | `int` | read an integer (little-endian); bounds-checked, panics if out of range |
| `put_u8(pos, v)` `put_u16(pos, v)` `put_u32(pos, v)` `put_u64(pos, v)` `put_i64(pos, v)` | self | write an integer (little-endian); bounds-checked, panics if out of range |
| `read(pos, n)` | `Bytes` | read `n` bytes at `pos` |
| `write(pos, b)` | | write bytes at `pos` |
| `flush()` | `Result<bool>` | flush all changes (msync) |
| `flush_range(pos, n)` | `Result<bool>` | flush only `[pos, pos + n)` |
| `resize(n)` | `Result<bool>` | resize the mapping; not available on shared memory |
| `close()` | `Result<bool>` | unmap |

## Error kinds

When a file call fails, the `Error.kind` slug is one of:

`not_found`, `permission`, `exists`, `is_dir`, `not_dir`, `not_empty`, `closed`,
`io`.

You can match on the kind to decide what to do. See
[Option, Result, and Error](/reference/builtins/option-result/).

## See also

- [Bytes](/reference/builtins/bytes/) — the buffer reads and writes use.
- [Option, Result, and Error](/reference/builtins/option-result/) — handling failures.
- [The standard library](/reference/stdlib/) — higher-level I/O modules.
