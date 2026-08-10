---
title: std.path
description: Pure path string math, join, parent, name, extension, and stem. No filesystem access.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 5 package functions.
<!-- coverage:summary:end -->

`std.path` works on path strings only. It never touches the filesystem, and it
always uses `/` as the separator on every supported target. Think of it as string
math for paths. Read the source at
[`stdlib/std/path/path.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/path/path.b).

```beans
import std.path
```

```beans
pub fn join(first: string, second: string) -> string
pub fn parent(value: string) -> string
pub fn name(value: string) -> string
pub fn extension(value: string) -> string
pub fn stem(value: string) -> string
```

- `join` puts exactly one `/` between the two parts and skips empty segments. If
  `second` is an absolute path (starts with `/`), it wins and is returned as-is.
- `parent` returns everything before the last segment. Trailing slashes are
  ignored. It returns `/` for a root-level path and `""` when there is no parent.
- `name` returns the final segment. Trailing slashes are ignored, so `name("a/b/")`
  is `"b"`.
- `extension` returns the file extension including the leading dot, like `".txt"`,
  or `""` if there is none. A dotfile such as `.env` is treated as a name, not an
  extension, so its extension is empty.
- `stem` returns the final segment with its extension removed. `stem` and
  `extension` together reconstruct `name`.

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

## See also

- [std.fs](/reference/stdlib/fs/), read and write the files these paths point
  at.
