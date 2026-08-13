---
title: std.fs
description: Read and write whole files in one call, as bytes or as text.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 7 package functions.
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

## See also

- [Files and mapping](/reference/builtins/files/), the `File` type for
  positional and cursor I/O when you need finer control.
- [std.path](/reference/stdlib/path/), build the path strings you pass here.
- [std.reader](/reference/stdlib/reader/), read a file line by line instead of
  all at once.
