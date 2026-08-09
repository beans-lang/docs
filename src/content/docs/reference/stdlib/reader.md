---
title: std.reader
description: Buffered line reading over a File, one line at a time, without moving the file cursor.
---

`std.reader` gives you a `Reader` that reads a [`File`](/reference/builtins/files/)
one line at a time. It buffers behind the scenes so you are not making a syscall
per line. Read the source at
[`stdlib/std/reader/reader.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/reader/reader.b).

```beans
import std.reader
```

## class Reader

You build one with `new`, handing it an open file:

```beans
new reader.Reader(file: File)
```

| Method | Returns | What it does |
| --- | --- | --- |
| `read_line() -> Result<Option<string>>` | line or end | read the next line without its `\n` |

`read_line` returns `ok(some(line))` for each line, with the trailing newline
removed. At end of file it returns `ok(none)`. If the read fails, you get an
error.

The reader keeps its own offset and reads with `pread`, so it never moves the
underlying file's cursor. You can read the same file another way at the same time
without the two interfering.

```beans
import std.io
import std.reader

fn main() {
    let file: File = File.open("log.txt", "r").expect("open")
    let r: reader.Reader = new reader.Reader(file)
    for true {
        let line: Option<string> = r.read_line().expect("read")
        match line {
            some(text) => io.println(text),
            none => { break },
        }
    }
    file.close()
}
```

## See also

- [Files and mapping](/reference/builtins/files/) — the `File` type you open and
  pass in.
- [std.fs](/reference/stdlib/fs/) — read a whole file at once when you do not need
  it line by line.
