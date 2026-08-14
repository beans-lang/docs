---
title: Release process
description: Beans-এর release কীভাবে বানানো, যাচাই করা, আর প্রকাশ করা হয় তার একটা নিরাপদ overview।
---

এটা একটা overview — একটা Beans release কীভাবে তৈরি হয় সেটার। এটা process-টার গড়ন
বর্ণনা করে; এতে কোনো secret নেই।

## একটা release কী কী build করে

release workflow **২৬টা দরকারি host package**-এর সবগুলো build করে আর
install-test করে। প্রতিটা package build হয়, তারপর সত্যিই install করে চালিয়ে
smoke-test করা হয় — যাতে একটা প্রকাশ করা archive প্রমাণ করে যে ওই target-এর জন্য
compiler-টা build হয়েছিল আর কাজ করেছিল।

## একটা release কী কী প্রকাশ করে

package গুলোর পাশাপাশি, একটা release প্রকাশ করে:

- প্রতিটা artifact-এর জন্য **SHA-256 checksum**।
- একটা **SPDX SBOM** (software bill of materials)।
- **GitHub attestation**।
- one-line installer গুলো, `beans-install.sh` আর `beans-install.ps1`।

## full আর slim package

- একটা **full package** সাথে Clang, LLD, আর llvm-ar বেঁধে দেয়, তাই একটা native
  build-এ আর কিছু install করা লাগে না।
- একটা **slim package** সেটা দেয় না; তখন একটা native build-এর জন্য `PATH`-এ
  Clang লাগে।

কোন target কোনটা পায় সেটা বলা আছে [Cross-compiling আর
target](/bn/tools/targets/)-এ।

## archive থাকলেই production-tier হয় না

একটা প্রকাশ করা archive প্রমাণ করে যে ওই target-এর জন্য compiler build হয়েছিল আর
smoke-test হয়েছিল। কিন্তু এটা নিজে থেকে target-টাকে production-tier বানায় **না**।
Support tier গুলো আলাদাভাবে track করা হয় `targets/support.tsv`-এ।
production-tier মানে কী সেটা দেখুন [Maturity আর platform](/bn/intro/maturity/)-এ, আর
1.0-এর release gate গুলো দেখুন [Versioning](/bn/project/versioning/)-এ।

সম্পর্কিত আরো কিছু দেখতে যান [Compatibility](/bn/project/compatibility/) আর
[Install Beans](/bn/start/install/)-এ।
