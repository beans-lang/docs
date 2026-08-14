---
title: Language server (LSP)
description: beansc lsp, editor কীভাবে এটা চালু করে, এর ক্ষমতা, আর lsp-probe helper।
---

`beansc lsp` স্ট্যান্ডার্ড `Content-Length` framing ব্যবহার করে stdio-র উপর Beans-এর
language server চালায়। Editor-ই এটা চালু করে দেয়; সাধারণত নিজে হাতে
চালানোর দরকার হয় না।

```bash
beansc lsp
```

`--stdio` flag-টা মেনে নেওয়া হয় কিন্তু কিছু করা হয় না (কিছু editor সবসময় এটা পাঠায়)।

## Editor কীভাবে এটা চালু করে

VS Code আর Zed `beansc lsp` চালু করে আর stdio-র উপর তার সাথে কথা বলে। কোন editor
কীভাবে সেট করতে হয় সেটা দেখুন [Editor setup](/bn/start/editors/) পেজে।

## ক্ষমতা

Server-টা পুরো project-এর একটা check-করা view সবসময় ধরে রাখে। এটা যা যা করতে পারে:

- incremental document sync
- hover
- signature help (`(` আর `,`-এ চালু হয়)
- completion (trigger `.`, এতে receiver-এর আসল type-এর member আর built-in
  receiver-ও আসে)
- go to definition, declaration, type definition, আর implementation
- references
- document highlight
- document আর workspace symbol
- call hierarchy
- type hierarchy
- semantic token (type: type, function, variable, property, enumMember,
  keyword)
- rename, prepare সহ

Server-টা যেহেতু package-সচেতন একটা view রাখে, তাই দুটো আলাদা package-এ একই নামের
দুটো type-এর ওপর একই নামের দুটো method আলাদা **symbol**-ই থেকে যায়। ফলে rename
করলে ঠিক যে symbol বোঝানো হয়েছে শুধু সেটাই বদলায়। কোনো rename নিরাপদ না হলে সেটা
কারণ জানিয়ে আটকে দেওয়া হয়।

`$/cancelRequest` মেনে নেওয়া হয় কিন্তু কিছু করা হয় না; request-গুলোর জবাব কড়াভাবে
ক্রম মেনে দেওয়া হয়।

## `lsp-probe`

`beansc lsp-probe` হলো hover-এর একবার-চালানোর terminal সংস্করণ। একটা জায়গা দেখিয়ে
দিলে, ওখানে user যে hover markdown দেখত সেটা এটা ছাপিয়ে দেয়।

```bash
beansc lsp-probe app.b:12:5
```

জায়গাটা হলো `file.b:line:col`।
