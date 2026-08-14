---
title: Building the compiler
description: source থেকে beansc build করা, self-hosting, C++ bootstrap, আর make install।
---

Beans self-hosted: compiler-টা Beans দিয়েই লেখা। এটা source থেকে build করতে হলে
আগে থেকেই একটা `beansc` লাগবে, যেটা দিয়ে এটাকে compile করা হবে। build-টা চালায়
project-এর Makefile, আর `compiler/version.h` হলো version-এর একমাত্র উৎস।

## কী কী লাগবে

- clang
- lld
- make
- git

Debian বা Ubuntu-তে:

```bash
sudo apt-get install clang lld make git
```

macOS-এ native build-এর জন্য command-line tools-ও লাগে:

```bash
xcode-select --install
```

## একটা public checkout-এ build করা

public checkout-এ কোনো private bootstrap থাকে না, তাই `make` একটা **আগে থেকেই
install করা** `beansc` দিয়ে `build/beansc` বানায়: হয় `PATH`-এ থাকাটা, নয়তো
`$BEANS_HOME/bin/beansc`-এরটা। ভেতরে ভেতরে এটা চালায়:

```bash
beansc build compiler/beans/main.b -o build/beansc.new
```

পুরো লুপটা:

```bash
# 1. install a release compiler first (the one-line installer)
# 2. get the source
git clone https://github.com/beans-lang/beans.git
cd beans
# 3. build
make
# 4. check it
./build/beansc --version
./build/beansc run examples/hello.b
```

কোন compiler দিয়ে build-টা bootstrap হবে সেটা `BEANSC_BOOT` দিয়ে বেছে নিন:

```bash
make BEANSC_BOOT=/path/to/beansc
```

one-line installer-এর জন্য দেখুন [Install Beans](/bn/start/install/)।

## C++ bootstrap

private C++ bootstrap submodule হাতে থাকলে, `make` পুরো
stage0 -> stage1 -> stage2 -> stage3 chain-টা চালায়:

- `beansc0` হলো C++ stage-0 compiler।
- Stage 2 আর 3 কে **byte-identical** হতে হবে। ওই fixed point প্রমাণ করে যে
  self-hosted compiler নিজেকে হুবহু আবার বানাতে পারে।

`make test` এর উপর differential gate গুলো যোগ করে (দেখুন [test চালানো](/bn/project/testing/))।

`beansc0` কখনো install হয় না, কখনো package হয় না, আর কখনো `PATH`-এও থাকে
না। এটার একমাত্র কাজ build-টা bootstrap করা।

## Install করা

```bash
sudo make install PREFIX=/usr/local
```

এটা install করে `beansc` (কখনো `beansc0` নয়), runtime-এর source, আর standard
library।

change-এর workflow-এর জন্য দেখুন [test চালানো](/bn/project/testing/) আর
[Contributing](/bn/project/contributing/)।
