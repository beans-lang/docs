---
title: Language server (LSP)
description: beansc lsp, how editors start it, its capabilities, and the lsp-probe helper.
---

`beansc lsp` runs the Beans language server over stdio, using standard
`Content-Length` framing. Editors start it for you; you do not usually run it by
hand.

```bash
beansc lsp
```

The `--stdio` flag is accepted and ignored (some editors always pass it).

## How editors start it

VS Code and Zed launch `beansc lsp` and talk to it over stdio. See [Editor
setup](/start/editors/) for how to configure each editor.

## Capabilities

The server keeps one checked view of the whole project. It supports:

- incremental document sync
- hover
- signature help (triggers on `(` and `,`)
- completion (trigger `.`, including members of the receiver's real type and
  built-in receivers)
- go to definition, declaration, type definition, and implementation
- references
- document highlight
- document and workspace symbols
- call hierarchy
- type hierarchy
- semantic tokens (types: type, function, variable, property, enumMember,
  keyword)
- rename, with prepare

Because the server tracks a package-aware view, two same-named methods on two
same-named types in two different packages stay **distinct** symbols, so a
rename touches only the symbol you mean. An unsafe rename is refused with a
reason.

`$/cancelRequest` is accepted and ignored; requests are answered strictly in
order.

## `lsp-probe`

`beansc lsp-probe` is a single-shot terminal version of hover. Point it at a
position and it prints the hover markdown a user would see there.

```bash
beansc lsp-probe app.b:12:5
```

The position is `file.b:line:col`.
