---
title: Building the compiler
description: release compiler দিয়ে source থেকে beansc build করা, fixed point check, আর make install।
---

Beans self-hosted: compiler-টা Beans দিয়েই লেখা। এটা source থেকে build করতে হলে
আগে থেকেই একটা `beansc` লাগবে, যেটা দিয়ে এটাকে compile করা হবে। build-টা চালায়
project-এর Makefile, আর [`VERSION`](https://github.com/beans-lang/beans/blob/main/VERSION)
হলো version-এর একমাত্র উৎস।

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

## একটা checkout-এ build করা

`make` একটা **আগে থেকেই install করা** `beansc` দিয়ে `build/beansc` বানায়: হয়
`PATH`-এ থাকাটা, নয়তো
`$BEANS_HOME/bin/beansc`-এরটা। ভেতরে ভেতরে এটা চালায়:

```bash
beansc build --release src/main.b -o build/beansc.new
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

## Self-hosting-এর প্রমাণ

পুরোনো C++ stage-0 bootstrap আর নেই। এখন release হওয়া Beans compiler source
compiler-কে bootstrap করে। `make test-fixpoint` একই release flag দিয়ে compiler
দুইবার build করে এবং binary দুইটা **byte-identical** হতে হবে। এই fixed point-ই
প্রমাণ করে self-hosted compiler নিজেকে হুবহু আবার বানাতে পারে।

`make test` behavioural suite আর fixed-point gate চালায়। দেখুন
[test চালানো](/bn/project/testing/)।

## Install করা

```bash
sudo make install PREFIX=/usr/local
```

এটা install করে `beansc`, runtime-এর source, আর standard library।

change-এর workflow-এর জন্য দেখুন [test চালানো](/bn/project/testing/) আর
[Contributing](/bn/project/contributing/)।
