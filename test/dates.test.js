const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseDate, monthIndex, monthLabel, daysInMonth } = require("../scripts/dates");

test("parseDate: standard month + day", () => {
  const p = parseDate("January 5", 2026);
  assert.equal(p.ok, true);
  assert.equal(p.month, 1);
  assert.equal(p.day, 5);
  assert.equal(p.label, "January 5");
  assert.equal(p.year, 2026);
});

test("parseDate: missing space (June27)", () => {
  const p = parseDate("June27", 2026);
  assert.equal(p.ok, true);
  assert.equal(p.month, 6);
  assert.equal(p.day, 27);
});

test("parseDate: parenthesised suffix is dropped", () => {
  const a = parseDate("May 5 (May 3 for pre-orders)", 2016);
  assert.equal(a.ok, true);
  assert.equal(a.label, "May 5");
  const b = parseDate("July 12 (PS Plus Members)", 2016);
  assert.equal(b.label, "July 12");
});

test("parseDate: 3-letter abbreviations and case-insensitive", () => {
  const p = parseDate("Sept 9", 2026);
  assert.equal(p.ok, true);
  assert.equal(p.label, "September 9");
  const q = parseDate("jan 3", 2026);
  assert.equal(q.label, "January 3");
});

test("parseDate: tba for unconfirmed / empty / null / undefined", () => {
  for (const raw of ["unconfirmed", "UNCONFIRMED", "", "   ", null, undefined]) {
    const p = parseDate(raw, 2026);
    assert.equal(p.ok, false, `raw=${JSON.stringify(raw)}`);
    assert.equal(p.kind, "tba", `raw=${JSON.stringify(raw)}`);
  }
});

test("parseDate: invalid for platform leak and implausible dates", () => {
  assert.equal(parseDate("PC", 2018).kind, "invalid");
  assert.equal(parseDate("April 31", 2026).kind, "invalid");
  assert.equal(parseDate("March 32", 2026).kind, "invalid");
  assert.equal(parseDate("Feb 29", 2026).kind, "invalid"); // 2026 not a leap year
  assert.equal(parseDate("21 July", 2026).kind, "invalid"); // day-first order not supported
});

test("parseDate: leap year respects calendar", () => {
  assert.equal(parseDate("Feb 29", 2024).ok, true);
  assert.equal(parseDate("Feb 29", 2025).kind, "invalid");
});

test("month helpers", () => {
  assert.equal(monthIndex("March"), 3);
  assert.equal(monthIndex("foo"), -1);
  assert.equal(monthLabel(12), "December");
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(daysInMonth(2024, 2), 29);
});

test("parseDate: constructed Date is local-midnight and comparable", () => {
  const p = parseDate("March 3", 2025);
  assert.equal(p.date.getFullYear(), 2025);
  assert.equal(p.date.getMonth(), 2);
  assert.equal(p.date.getDate(), 3);
});