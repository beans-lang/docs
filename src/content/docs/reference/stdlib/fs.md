---
title: std.fs
description: Read and write whole files in one call, as bytes or as text.
---

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

| Function | Returns | What it does |
| --- | --- | --- |
| `read_bytes(path) -> Result<Bytes>` | `Bytes` | read the whole file as bytes |
| `read(path) -> Result<string>` | `string` | read the whole file as text |

## Writing

| Function | Returns | What it does |
| --- | --- | --- |
| `write_bytes(path, data: Bytes) -> Result<int>` | bytes written | create/truncate the file, write `data` at offset 0 |
| `write(path, data: string) -> Result<int>` | bytes written | same, but from a string |
| `append_bytes(path, data: Bytes) -> Result<int>` | bytes written | add `data` to the end of the file |
| `append(path, data: string) -> Result<int>` | bytes written | same, but from a string |
| `copy(from, to) -> Result<int>` | bytes written | copy a file from one path to another |

`write_bytes` and `write` open the file in "create" mode, truncate it to empty,
and write starting at position 0. The append helpers add to the end instead.

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

- [Files and mapping](/reference/builtins/files/) — the `File` type for
  positional and cursor I/O when you need finer control.
- [std.path](/reference/stdlib/path/) — build the path strings you pass here.
- [std.reader](/reference/stdlib/reader/) — read a file line by line instead of
  all at once.
