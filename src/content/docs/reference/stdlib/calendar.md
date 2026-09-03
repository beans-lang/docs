---
title: std.calendar
description: The civil calendar — a UTC date and time of day, its conversions to and from the epoch, and the RFC 3339 and HTTP date formats.
---

<!-- coverage:summary -->
**API summary** (generated from the Beans source by `npm run coverage`): 3 package functions · 2 types · 9 static methods · 23 instance methods · 7 public fields · 7 enum variants.
<!-- coverage:summary:end -->

`std.time` names moments in nanoseconds and knows nothing about years.
`std.calendar` is the other half: a year-month-day and a time of day, the
conversions between that and the epoch, and the two wire formats a program
actually meets. Read the source at
[`stdlib/std/calendar/calendar.b`](https://github.com/beans-lang/beans/blob/main/stdlib/std/calendar/calendar.b).

```beans
import std.calendar
```

## Rules that shape the package

**UTC only.** There is no local time, no zone database and no daylight-saving
rule here, on purpose: a wrong timezone answer is worse than no timezone
answer, and the rules change by political decision several times a year. A
parsed offset is arithmetic, not a zone — `2024-03-05T09:30:00+05:30` is read
as the instant it names and stored as UTC.

**Leap seconds are not modelled.** Every minute has exactly 60 seconds and
every day exactly 86400, which is what the epoch counters in `std.time` already
assume. `second` is therefore `0..=59`, and a timestamp written with `:60` is
refused rather than quietly moved.

**The calendar is proleptic Gregorian** — the Gregorian leap rule extended
backwards through the years it was not yet in use, so year 1500 here is
Gregorian, not Julian. The two conversion kernels are Howard Hinnant's, from
"chrono-Compatible Low-Level Date Algorithms".

## Package functions

```beans
pub fn is_leap_year(year: int) -> bool
pub fn days_in_month(year: int, month: int) -> int
pub fn days_from_civil(year: int, month: int, day: int) -> int
```

- `is_leap_year` is the Gregorian rule: divisible by 4, except centuries, except
  those divisible by 400.
- `days_in_month` gives the length of a month, February included.
- `days_from_civil` is the day number for a date, counted from 1970-01-01 —
  negative before it. It is the kernel everything else is built on, exposed
  because date arithmetic that never builds a `DateTime` is cheaper without one.

## Weekday

```beans
pub enum Weekday {
    sunday
    monday
    tuesday
    wednesday
    thursday
    friday
    saturday
}

pub fn name() -> string
pub fn short_name() -> string
pub fn number() -> int
```

- `name` is the full English name (`"Monday"`), `short_name` the three-letter
  form (`"Mon"`) that HTTP dates use.
- `number` is `0` for Sunday through `6` for Saturday.

## DateTime

A plain struct, so it copies rather than being shared, and its fields are
readable directly.

```beans
pub struct DateTime {
    pub year: int
    pub month: int
    pub day: int
    pub hour: int
    pub minute: int
    pub second: int
    pub nanosecond: int
}
```

`month` is `1..=12` and `day` is `1..=31` — the numbers people write, not
zero-based ones. `second` is `0..=59`.

### Making one

```beans
pub static fn now() -> DateTime
pub static fn epoch() -> DateTime
pub static fn of(year: int, month: int, day: int, hour: int, minute: int, second: int, nanosecond: int) -> Result<DateTime>
pub static fn of_date(year: int, month: int, day: int) -> Result<DateTime>
pub static fn from_epoch_nanos(nanos: int) -> DateTime
pub static fn from_epoch_millis(millis: int) -> Result<DateTime>
pub static fn from_epoch_seconds(seconds: int) -> Result<DateTime>
pub static fn parse_rfc3339(text: string) -> Result<DateTime>
pub static fn parse_http_date(text: string) -> Result<DateTime>
```

- `now` reads the wall clock. `epoch` is 1970-01-01T00:00:00Z.
- `of` and `of_date` build one from parts and answer `err` when the parts do not
  name a real instant — month 13, the 31st of a 30-day month, February 29th of a
  common year, a second of 60. `of_date` is `of` with the time of day zeroed.
- The `from_epoch_*` family converts a counter back to a date.
  `from_epoch_nanos` cannot fail; the other two can, because a large enough
  seconds or millis value would overflow the nanosecond range.
- `parse_rfc3339` reads `2024-03-05T09:30:00Z` and offset forms like
  `+05:30`, converting to UTC. `parse_http_date` reads the RFC 9110 format
  (`Tue, 05 Mar 2024 09:30:00 GMT`) that `Date`, `Last-Modified` and
  `If-Modified-Since` carry.

### Reading it back

```beans
pub fn epoch_day() -> int
pub fn epoch_seconds() -> int
pub fn epoch_millis() -> int
pub fn epoch_nanos() -> Result<int>
pub fn weekday() -> Weekday
pub fn day_of_year() -> int
```

- The `epoch_*` family is the inverse of `from_epoch_*`. Only `epoch_nanos`
  returns a `Result`, because a far enough date does not fit a 64-bit
  nanosecond count.
- `day_of_year` is `1..=366`.

### Moving it

```beans
pub fn plus_nanos(nanos: int) -> Result<DateTime>
pub fn plus_seconds(seconds: int) -> Result<DateTime>
pub fn plus_minutes(minutes: int) -> Result<DateTime>
pub fn plus_hours(hours: int) -> Result<DateTime>
pub fn plus_days(days: int) -> Result<DateTime>
```

Each answers a new `DateTime` and leaves the receiver alone. A negative
argument goes backwards. They return a `Result` because the arithmetic can run
off the end of the representable range.

### Comparing

```beans
pub fn compare(other: DateTime) -> int
pub fn is_before(other: DateTime) -> bool
pub fn is_after(other: DateTime) -> bool
pub fn seconds_until(other: DateTime) -> int
pub fn millis_until(other: DateTime) -> int
```

- `compare` is negative, zero or positive as the receiver sorts before, equal to
  or after `other`.
- The two `*_until` methods are signed differences — negative when `other` is in
  the past.

### Formatting

```beans
pub fn to_date_string() -> string
pub fn to_time_string() -> string
pub fn to_rfc3339() -> string
pub fn to_http_date() -> string
```

`to_date_string` is `2024-03-05`, `to_time_string` is `09:30:00`, `to_rfc3339`
is the full `2024-03-05T09:30:00Z`, and `to_http_date` is
`Tue, 05 Mar 2024 09:30:00 GMT`. Each `to_*` round-trips through its matching
`parse_*`.

## Worked example

<!-- beans:compile -->
```beans
import std.io
import std.calendar

fn main() {
    match calendar.DateTime.of(2024, 3, 5, 9, 30, 0, 0) {
        ok(when) => {
            io.println(when.to_rfc3339())        // 2024-03-05T09:30:00Z
            io.println(when.to_http_date())      // Tue, 05 Mar 2024 09:30:00 GMT
            io.println(when.weekday().name())    // Tuesday
            io.println(when.day_of_year())       // 65
            match when.plus_days(30) {
                ok(later) => { io.println(later.to_date_string()) }   // 2024-04-04
                err(problem) => { io.println("overflow") }
            }
        }
        err(problem) => { io.println("not a real instant") }
    }

    io.println(calendar.is_leap_year(2024))      // true
    io.println(calendar.days_in_month(2024, 2))  // 29
}
```

## See also

- [std.time and std.random](/reference/stdlib/time-random/), the clocks this
  package converts to and from.
- [std.http](/reference/stdlib/http/), which carries the HTTP date format
  `parse_http_date` and `to_http_date` read and write.
