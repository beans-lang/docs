---
title: std.term
description: Terminals — is this a tty, how big is it, raw mode that restores itself, a frame of ANSI output written whole, and a CSI key decoder.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 9 package functions · 5 types · 3 constructors · 1 static method · 25 instance methods · 2 public fields · 19 enum variants.
<!-- coverage:summary:end -->

`std.term` is what a full-screen terminal program needs and would otherwise
hand-roll: the tty questions, raw mode, an ANSI frame builder, and a key
decoder that understands the escape sequences a terminal actually sends. Read
the source at
[`stdlib/std/term/`](https://github.com/beans-lang/beans/tree/main/stdlib/std/term).

```beans
import std.term
```

## Rules that shape the package

The parts whose shape is the platform's — `struct termios` (72 bytes on macOS,
60 on Linux), `struct winsize`, the Windows console API — live in the runtime's
C behind four calls. Everything with a portable shape is Beans.

**Raw mode restores itself.** `RawMode.enter` returns a guard that puts the
terminal back on `restore()`, on going out of scope, and — because the runtime
registers the restore with `atexit` — on a normal exit and on a panic, both of
which reach `exit()` on either backend. What that does *not* cover is a crash
by `SIGSEGV`/`SIGBUS`: only the runtime's fault reporter runs then, and it is
fenced to flushing output. A full-screen program should watch `terminate` and
`hangup` through [`std.signal`](/reference/stdlib/signal/) and restore from its
own loop, which needs no handler. In raw mode `Ctrl-C` arrives as the byte
`0x03` rather than a signal, so the common interrupt is already yours.

**Frames are written whole and unbuffered.** `io.print` goes through stdio,
where a frame with no trailing newline sits in the buffer. `Frame.flush` writes
the whole escape-and-text buffer with one `write(2)`, so what you drew is on
screen when the call returns.

**It needs the full runtime.** The checker refuses `std.term` on any runtime
below full, with a message about the program rather than a link error.

## Asking about the terminal

```beans
pub fn is_tty(fd: int) -> bool
pub fn size(fd: int) -> Result<Size>
pub fn write_all(fd: int, data: Bytes) -> Result<int>

pub class Size {
    pub rows: int = 0
    pub cols: int = 0
}

new Size(rows: int, cols: int)
```

- `is_tty` is false for a pipe or a file, which is how a program decides whether
  to draw at all.
- `size` answers the window in character cells. A terminal that reports `0x0`
  is an error rather than a screen with no rows.
- `write_all` keeps writing until every byte is out or it fails, which a bare
  `write` does not promise.

## RawMode

```beans
pub static fn enter(fd: int) -> Result<RawMode>
pub fn descriptor() -> int
pub fn restore() -> Result<bool>
```

- `enter` puts `fd` into raw mode: no echo, no line buffering, no signal
  generation, no input or output translation. It answers `err` with kind
  `invalid` when `fd` is not a terminal, and kind `unsupported` on a platform
  with no raw mode (Windows, today).
- `restore` returns cooked mode now and reports any failure. `deinit` does the
  same when the guard dies but cannot report. Restoring twice is a no-op, not a
  failure.
- A second `enter` on the same descriptor keeps the first saved state, so
  restore always returns the terminal to how the program found it.

## Frame

A frame accumulates escape sequences and text into one buffer, then writes it
in a single call.

```beans
new Frame()

pub fn clear()
pub fn clear_line()
pub fn move_to(row: int, col: int)
pub fn home()
pub fn hide_cursor()
pub fn show_cursor()
pub fn enter_alt_screen()
pub fn leave_alt_screen()
pub fn reset_style()
pub fn bold()
pub fn fg(color: int)
pub fn bg(color: int)
pub fn fg_rgb(r: int, g: int, b: int)
pub fn bg_rgb(r: int, g: int, b: int)
pub fn text(s: string)
pub fn byte(b: int)
pub fn len() -> int
pub fn flush(fd: int) -> Result<int>
pub fn reset()
```

- `move_to` is 1-based, the way the escape sequence is. `home` is `move_to(1, 1)`.
- `fg`/`bg` take a 256-colour index; `fg_rgb`/`bg_rgb` take 24-bit truecolour.
  `reset_style` returns to the terminal's default.
- `enter_alt_screen` switches to the alternate buffer, so leaving it restores
  whatever the user had on screen before your program ran.
- `text` appends a string, `byte` one raw byte. `len` is the bytes buffered so
  far.
- `flush` writes the buffer to `fd` and empties it. `reset` empties it without
  writing, for a frame you decided not to draw.

## Keys

`KeyDecoder` turns the bytes a terminal sends into keys. It is a state machine
because an escape sequence arrives in pieces: feed it whatever you read, then
drain.

```beans
new KeyDecoder()

pub fn feed(data: Bytes)
pub fn pending() -> int
pub fn next() -> Option<Key>
pub fn flush() -> Option<Key>
```

- `feed` adds bytes. `next` answers the next complete key, or `none` when what
  is buffered is still an incomplete prefix — so a partial `ESC [` waits for
  the rest instead of being reported as an Escape keypress.
- `pending` is how many bytes are held mid-sequence.
- `flush` resolves a stranded prefix: call it after a read timeout to decide
  that a lone `ESC` really was the Escape key.

```beans
pub enum Key {
    char(codepoint: int)
    alt(codepoint: int)
    ctrl(letter: int)
    enter
    tab
    backspace
    escape
    up(mods: int)
    down(mods: int)
    left(mods: int)
    right(mods: int)
    home(mods: int)
    end(mods: int)
    page_up(mods: int)
    page_down(mods: int)
    insert(mods: int)
    delete(mods: int)
    function(number: int, mods: int)
    unknown(final: int)
}
```

`unknown` carries the final byte of a recognised escape shape that has no name
here, so a caller can log it and the decoder never stalls.

Modifiers come as a bitmask:

```beans
pub fn mod_shift() -> int
pub fn mod_alt() -> int
pub fn mod_ctrl() -> int
pub fn has_shift(mods: int) -> bool
pub fn has_alt(mods: int) -> bool
pub fn has_ctrl(mods: int) -> bool
```

## A frame and a keypress

```beans
import std.io
import std.os
import std.term

fn main() {
    if !term.is_tty(1) {
        io.println("not a terminal")
        return
    }
    match term.size(1) {
        ok(box) => { io.println("{box.rows}x{box.cols}") }
        err(problem) => { io.println("no size") }
    }

    match term.RawMode.enter(0) {
        ok(raw) => {
            var frame: term.Frame = new term.Frame()
            frame.enter_alt_screen()
            frame.clear()
            frame.move_to(1, 1)
            frame.bold()
            frame.fg_rgb(180, 220, 120)
            frame.text("press a key")
            frame.reset_style()
            match frame.flush(1) {
                ok(written) => {}
                err(problem) => {}
            }

            var keys: term.KeyDecoder = new term.KeyDecoder()
            // read one chunk from stdin and decode whatever it holds
            // ... keys.feed(chunk) ... keys.next() ...

            frame.leave_alt_screen()
            frame.show_cursor()
            match frame.flush(1) {
                ok(written) => {}
                err(problem) => {}
            }
            match raw.restore() {
                ok(done) => {}
                err(problem) => {}
            }
        }
        err(problem) => { io.println("no raw mode here") }
    }
}
```

## See also

- [std.signal](/reference/stdlib/signal/), for the `terminate` and `hangup`
  notifications a full-screen program should watch.
- [std.poll](/reference/stdlib/poll/), to wait on the terminal alongside
  sockets without blocking.
