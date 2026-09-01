const { test } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeEntries, aggregateYear, aggregateAll } = require("../scripts/aggregate");

// Deterministic anchor: 2026-06-15 (local time).
const TODAY = new Date(2026, 5, 15);

const ENTRIES = [
  { title: "Past", releaseDate: "January 10", platforms: ["PC", "PS4"] },
  { title: "Today", releaseDate: "June 15", platforms: ["Switch"] },
  { title: "Future", releaseDate: "June 20", platforms: ["Switch"] },
  { title: "TBA", releaseDate: "unconfirmed", platforms: ["PC"] },
  { title: "Bad", releaseDate: "PC", platforms: ["Switch"] },
  { title: "Multi", releaseDate: "December 1", platforms: ["PC", "360", " (Switch 2)"] },
];

test("aggregateYear: dated / tba / released / upcoming classification", () => {
  const s = aggregateYear(ENTRIES, 2026, TODAY);
  assert.equal(s.total, 6);
  assert.equal(s.dated, 4); // Past, Today, Future, Multi
  assert.equal(s.tba, 2); // TBA + invalid (Bad)
  assert.equal(s.released, 2); // Past, Today (<= anchor)
  assert.equal(s.upcoming, 2); // Future, Multi
});

test("aggregateYear: month buckets reflect released flags", () => {
  const s = aggregateYear(ENTRIES, 2026, TODAY);
  assert.deepEqual(s.byMonth[0], { month: 1, total: 1, released: 1, upcoming: 0 });
  assert.deepEqual(s.byMonth[5], { month: 6, total: 2, released: 1, upcoming: 1 });
  assert.deepEqual(s.byMonth[11], { month: 12, total: 1, released: 0, upcoming: 1 });
  const empty = s.byMonth[2];
  assert.equal(empty.total, 0);
});

test("aggregateYear: platform counts only dated entries, counted once per platform", () => {
  const s = aggregateYear(ENTRIES, 2026, TODAY);
  const pc = s.byPlatform["PC"];
  assert.equal(pc.count, 2); // Past (released) + Multi (upcoming); TBA excluded
  assert.equal(pc.released, 1);
  assert.equal(s.byPlatform["Switch"].count, 2); // Today + Future
  assert.equal(s.byPlatform["Xbox 360"].count, 1); // alias 360 -> Xbox 360
  assert.equal(s.byPlatform["Switch 2"].count, 1); // "(Switch 2)" leak cleaned
});

test("aggregateYear: empty input yields zero stats", () => {
  const s = aggregateYear([], 2026, TODAY);
  assert.equal(s.total, 0);
  assert.equal(s.dated, 0);
  assert.equal(s.released, 0);
  assert.equal(s.upcoming, 0);
  assert.equal(Object.keys(s.byPlatform).length, 0);
});

test("aggregateAll: merges years, months and platforms", () => {
  const y2026 = aggregateYear(ENTRIES, 2026, TODAY);
  const y2025 = aggregateYear([{ title: "Old", releaseDate: "March 3", platforms: ["PC"] }], 2025, TODAY);
  const all = aggregateAll([y2026, y2025]);

  assert.equal(all.totals.total, 7);
  assert.equal(all.totals.released, 3); // 2 + 1
  assert.equal(all.totals.upcoming, 2);
  assert.equal(all.totals.tba, 2);
  assert.equal(all.totals.years, 2);

  assert.deepEqual(all.byYear.map((y) => y.year), [2026, 2025]); // input order preserved
  assert.equal(all.byMonth.length, 4); // Jan,Jun,Dec 2026 + Mar 2025
  const mar25 = all.byMonth.find((m) => m.year === 2025 && m.month === 3);
  assert.equal(mar25.released, 1);

  assert.equal(all.byPlatform["PC"].count, 3); // Past+Multi+Old
  assert.equal(all.byPlatform["PC"].released, 2);
});

test("normalizeEntries: url passthrough and missing fields", () => {
  const norm = normalizeEntries([{ title: "X", url: "/product/x", releaseDate: "May 1", platforms: ["PC"] }], 2026);
  assert.equal(norm[0].url, "/product/x");
  assert.equal(norm[0].parsed.ok, true);
  const gappy = normalizeEntries([{ title: "NoFields" }], 2026);
  assert.equal(gappy[0].parsed.kind, "tba");
  assert.deepEqual(gappy[0].platforms, []);
  assert.equal(gappy[0].url, null);
});