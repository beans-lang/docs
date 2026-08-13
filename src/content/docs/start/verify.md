---
title: Verify the install
description: Confirm your Beans install works with beansc --version, beansc doctor, and a hello program.
---

After installing, three quick checks confirm everything is in place. Open a
**new** terminal first, so the updated PATH is active.

## 1. Check the version

```bash
beansc --version
```

```text
beansc 0.1.15 (language 1.0, runtime ABI 5)
```

This tells you three things: the compiler version (`0.1.15`), the language
contract it implements (`1.0`), and the runtime ABI (`5`).

## 2. Run the doctor

```bash
beansc doctor
```

`doctor` reports what your install can build and how to fix any gaps. For
example, if a native `build` needs a C compiler that is not on your PATH,
`doctor` says so and tells you what to install.

`doctor` always exits with code 0. It is a report, not a pass/fail gate, so read
what it prints.

## 3. Run a program

Save this as `hello.b`:

```beans
import std.io

fn main() {
    let name: string = "beans"
    io.println("hello from {name}")
}
```

Run it on the reference interpreter:

```bash
beansc run hello.b
```

```text
hello from beans
```

If all three checks worked, your install is good. Next, [write and run your
first program](/start/hello-world/) or [set up a project](/start/projects/). For
more on `beansc doctor`, see [doctor and upgrade](/tools/doctor-upgrade/).
