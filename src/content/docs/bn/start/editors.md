---
title: Editor setup
description: VS Code আর Zed-এ Beans সাপোর্ট চালু করার নিয়ম — দুটোই compiler-এর language server দিয়ে চলে।
---

Beans-এর **VS Code** আর **Zed**-এর জন্য editor integration আছে। দুটোই
`beansc lsp`-এর উপর পাতলা একটা client, অর্থাৎ compiler-এর নিজের language server।
এর ফলে প্রতিটা উত্তর (error, completion, go-to-definition) আসে ঠিক সেই compiler থেকেই
যেটা কোড build করে। তাই editor আর build-এর মধ্যে কখনো মতের অমিল হয় না।

Integration-গুলো আলাদা একটা repository-তে থাকে:
[`github.com/beans-lang/editors`](https://github.com/beans-lang/editors)।

## VS Code

Extension-টার নাম **Beans** (id `beans-vscode`, publisher `beans-lang`,
Apache-2.0)। কোনো `**/*.b` file বা `**/beans.pot` খুললেই এটা চালু হয়।

### Install

[editors repo-এর release](https://github.com/beans-lang/editors) থেকে
`beans-vscode-<version>.vsix` নামিয়ে install করুন:

```bash
code --install-extension beans-vscode-<version>.vsix
```

### Settings

| Setting | কী করে |
| --- | --- |
| `beans.compiler.path` | কোন `beansc` ব্যবহার হবে তার path। |
| `beans.compiler.searchDevelopmentPaths` | একটা source build-ও খুঁজে দেখে। |
| `beans.trace.server` | LSP traffic log করে, extension debug করার জন্য। |

### কী কী পাওয়া যায়

Diagnostic, completion, hover, signature help, go-to-definition (package পার হয়েও),
find reference, document symbol, rename আর syntax highlighting — সাথে compiler LSP দিয়ে
আর যা যা দেখায় সব। কোনো `.b` file debug করতে **F5** চাপুন।

## Zed

Extension-টার নাম **Beans** (id `beans`)। Highlighting-এর জন্য এটা repo-এর ভিতরের একটা
Tree-sitter grammar ব্যবহার করে, আর বাকি সব semantic কাজের জন্য `beansc` language server।
এর জন্য লাগবে **Zed 0.205 বা তার নতুন**।

### dev extension হিসেবে install

```bash
rustup target add wasm32-wasip2
```

তারপর Zed-এ: command palette খুলুন, **"zed: extensions"** চালান,
**"Install Dev Extension"** বেছে নিন, আর editors repo থেকে `zed` directory-টা দিন।

### Semantic token

Semantic highlighting নিজে থেকে চালু থাকে না, চালু করে নিতে হয়। Zed settings-এ এটা যোগ করুন:

```text
"semantic_tokens": "combined"
```

অথবা `"full"`।

## দুটো editor compiler-টা কীভাবে খুঁজে পায়

দুই editor-ই `beansc` খোঁজে, আর যেটা প্রথমে পায় সেটাই ব্যবহার করে, এই ক্রমে:

1. editor-এর setting (VS Code-এ `beans.compiler.path`),
2. `BEANSC` environment variable,
3. **official Beans installation** — one-line installer যে toolchain সেটআপ করে
   `$BEANS_HOME`-এর নিচে (macOS আর Linux-এ default `~/.beans`, Windows-এ
   `%LOCALAPPDATA%\Beans`)। এই খোঁজাটার জন্যই একটা release করা `beansc` কোনো setting
   ছাড়াই কাজ করে,
4. workspace root-এ থাকা `beansc`, তারপর `PATH`-এ,
5. workspace-এর পাশে থাকা একটা source build (`build/beansc`, `beans/build/beansc`,
   `../beans/build/beansc`) — compiler নিয়ে নিজে কাজ করার জন্য।

কিছুই না পেলে extension Beans-এর ফিচারগুলো বন্ধ করে দেয় আর বলে দেয় সে কোথায় কোথায়
খুঁজেছে। ঠিক এখনকার খোঁজার নিয়মটা লেখা আছে
[editors repository](https://github.com/beans-lang/editors)-তে। ওখান থেকে সর্বশেষ release
install করুন, যাতে step 3 বা 4-এ compiler খুঁজে পায়।

## এখনো যা যা নেই

এগুলোর জন্য আগে compiler-কে ক্ষমতাটা যোগ করতে হবে, তাই editor এখনো এগুলো করতে পারে না:

- formatting,
- code action,
- inlay hint।

Server কী কী দেয় জানতে দেখুন [Language server (LSP)](/bn/tools/lsp/) আর
[Debugger (DAP)](/bn/tools/dap/)। দুটোরই `beansc` `PATH`-এ থাকা লাগে, তাই আগে
[install-টা verify করুন](/bn/start/verify/)।
