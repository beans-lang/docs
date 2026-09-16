---
title: std.fs
description: Read and write whole files in one call, as bytes or as text.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 12 package functions.
<!-- coverage:summary:end -->

`std.fs` gives you one-call helpers to read or write a whole file. Under the hood
it opens a [`File`](/reference/builtins/files/), does the work, and closes it.
Read the source at
[`stdlib/std/fs/fs.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/fs/fs.b).

Every function returns a [`Result`](/reference/builtins/option-result/), because
filesystem work can fail. Use `?` to pass the error up.

```beans
import std.fs
```

## Reading

```beans
pub fn read_bytes(path: string) -> Result<Bytes>
pub fn read(path: string) -> Result<string>
```

- `read_bytes` opens the file, reads it whole from offset 0, and returns the bytes.
- `read` does the same and fills its returned string directly. It does not build
  an intermediate `Bytes` value.

## Writing

```beans
pub fn write_bytes(path: string, data: Bytes) -> Result<int>
pub fn write(path: string, data: string) -> Result<int>
pub fn append_bytes(path: string, data: Bytes) -> Result<int>
pub fn append(path: string, data: string) -> Result<int>
pub fn copy(from: string, to: string) -> Result<int>
```

All five return the number of bytes written.

- `write_bytes` and `write` open the file in "create" mode, truncate it to empty,
  and write starting at position 0. `write` takes a string; `write_bytes` takes
  `Bytes`. Text writes use the string storage directly.
- `append_bytes` and `append` open the file in "append" mode and add `data` to the
  end instead of truncating.
- `copy` uses the platform file-copy path when available and a fixed-size
  fallback. It does not hold the whole source file in a Beans buffer. A same-file
  or hard-link copy fails before the destination can be truncated.

```beans
import std.io
import std.fs

fn main() {
    fs.write("greeting.txt", "hello\n").expect("write")
    fs.append("greeting.txt", "again\n").expect("append")
    let text: string = fs.read("greeting.txt").expect("read")
    io.print(text)                          // hello / again
}
```

## Asking about a path

```beans
pub fn exists(path: string) -> bool
pub fn size(path: string) -> Result<int>
```

- `exists` answers yes or no and never fails: a path you cannot reach is a path
  that is not there, as far as this call is concerned.
- `size` is the file's length in bytes without reading it.

## Moving and removing

```beans
pub fn rename(from: string, to: string) -> Result<bool>
pub fn remove(path: string) -> Result<bool>
pub fn temp_dir() -> string
```

- `rename` moves a file, replacing `to` if it is there. Across filesystems the
  platform may refuse it rather than copying, which is the honest answer: a
  rename is atomic and a copy is not.
- `remove` answers `ok(true)` when it deleted the file and **`ok(false)` when
  there was nothing to delete**. Only a real failure — a permission, a directory
  in the way — comes back as `err`, so "make sure this is gone" needs no
  `exists` check first.
- `temp_dir` is the directory the platform hands out for scratch files. It is a
  path, not a file: create your own name under it, and clean up after yourself.

```beans
import std.io
import std.fs
import std.path

fn main() {
    let scratch: string = path.join(fs.temp_dir(), "notes.txt")
    fs.write(scratch, "draft\n").expect("write")
    io.println(fs.size(scratch).expect("size"))   // 6
    fs.remove(scratch).expect("remove")
    io.println(fs.exists(scratch))                // false
}
```

## See also

- [Files and mapping](/reference/builtins/files/), the `File` type for
  positional and cursor I/O when you need finer control.
- [std.path](/reference/stdlib/path/), build the path strings you pass here.
- [std.reader](/reference/stdlib/reader/), read a file line by line instead of
  all at once.
