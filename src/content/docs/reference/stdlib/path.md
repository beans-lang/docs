---
title: std.path
description: Pure path string math — join, parent, name, extension, and stem. No filesystem access.
---

`std.path` works on path strings only. It never touches the filesystem, and it
always uses `/` as the separator on every supported target. Think of it as string
math for paths. Read the source at
[`stdlib/std/path/path.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/path/path.b).

```beans
import std.path
```

| Function | What it does |
| --- | --- |
| `join(first: string, second: string) -> string` | join two path parts with a single `/` |
| `parent(value: string) -> string` | everything before the last segment |
| `name(value: string) -> string` | the final segment |
| `extension(value: string) -> string` | the file extension, including the leading dot |
| `stem(value: string) -> string` | the final segment without its extension |

Details:

- `join` uses exactly one `/` between the parts and skips empty segments. If
  `second` is an absolute path, it wins and is returned as-is.
- `parent` returns `/` for the root and `""` when there is no parent.
- `name` ignores trailing slashes, so `name("a/b/")` is `"b"`.
- `extension` includes the leading dot, like `".txt"`. A dotfile such as `.env`
  is treated as a name, not an extension, so its extension is empty.
- `stem` is the final segment with the extension removed.

```beans
import std.io
import std.path

fn main() {
    io.println(path.join("a/b", "c.txt"))      // a/b/c.txt
    io.println(path.join("a", "/etc"))          // /etc
    io.println(path.parent("a/b/c.txt"))       // a/b
    io.println(path.name("a/b/c.txt"))         // c.txt
    io.println(path.extension("a/b/c.txt"))    // .txt
    io.println(path.extension(".env"))          // (empty)
    io.println(path.stem("a/b/c.txt"))         // c
}
```

The real function names are `name`, `extension`, and `stem`. An older draft spec
used `base`, `ext`, and similar names; those are not the real names.

## See also

- [std.fs](/reference/stdlib/fs/) — read and write the files these paths point
  at.
