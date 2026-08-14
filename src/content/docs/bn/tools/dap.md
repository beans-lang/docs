---
title: Debugger (DAP)
description: beansc debug-adapter, Beans debugger কী কী সাপোর্ট করে, আর native source-level debugging এখনো কেন নেই।
---

`beansc debug-adapter` stdio-র উপর Debug Adapter Protocol (DAP) বলে। একটা editor
এভাবেই Beans program debug করে।

```bash
beansc debug-adapter
```

এটা program-কে **reference interpreter**-এ compile করে চালায়, কোনো build
step ছাড়াই। VS Code-এ একটা `.b` file-এ F5 চাপলেই একটা session শুরু হয়।

## কী কী সাপোর্ট করে

- breakpoint, Beans file আর line ধরে সেট করা
- entry-তে থামা
- একটা Beans call stack
- `self`, parameter, আর local (একটা shadow-করা local দুটো আলাদা variable-ই থাকে)
- বড় list, map আর object-এর ভেতর দিয়ে page করে দেখা
- variable path ধরে watch expression
- step over, step into, step out
- continue
- runtime panic হলে থামা, তখনো stack অক্ষত থাকে

## যা এটা করে না

`attach` করা যায় না, আর কারণটা এই:

```text
the Beans debugger runs programs itself; there is nothing to attach to
```

Debugger নিজেই program-টা launch করে চালায়, তাই attach করার মতো আলাদা কোনো process
থাকে না।

## Native source-level debugging এখনো নেই

একটা native binary-তে lldb বা gdb দিয়ে Beans source ধরে ধরে এখনো step করা যায়
না।

[`beansc build --debug`](/bn/tools/build/) একটা optimize-ছাড়া binary দেয় যেটা
**C runtime**-এর জন্য platform debug info (DWARF বা CodeView) বয়ে নেয়। সেটা native
backtrace আর profiler-এর কাজে লাগে। কিন্তু emitter Beans statement-এর জন্য **কোনো
line table লেখে না**, তাই lldb আর gdb কোনো Beans line-এ থামতে পারে না। আজকের দিনে
Beans-এর source-level debugging-এর জন্য উপরের DAP debugger-টাই ব্যবহার করুন।
