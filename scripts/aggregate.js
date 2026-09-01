// Aggregation of game entries into statistics (by year / by month / by platform).
//
// Entry model (as produced by the scrapers):
//   { title: string, url?: string, releaseDate?: string, platforms?: string[] }
//
// Counting semantics:
//   - "dated"    = entry whose releaseDate parses to a concrete month/day
//   - "tba"      = missing / "unconfirmed" / unparseable release date
//   - "released" = dated and date <= today
//   - "upcoming" = dated and date > today
//   - platform counts count a game once per platform it releases on

const { parseDate } = require("./dates");
const { normalizePlatformList } = require("./platforms");

/** Normalize raw entries: parse dates, normalize platform names. */
function normalizeEntries(entries, year) {
  return (entries || []).map((raw) => {
    const parsed = parseDate(raw.releaseDate, year);
    return {
      title: raw.title,
      url: raw.url || null,
      platforms: normalizePlatformList(raw.platforms),
      dateRaw: raw.releaseDate ?? null,
      parsed: parsed.ok
        ? { ok: true, year, month: parsed.month, day: parsed.day, date: parsed.date, label: parsed.label }
        : { ok: false, kind: parsed.kind },
    };
  });
}

const EMPTY_MONTH = () => ({ total: 0, released: 0, upcoming: 0 });

/**
 * Aggregate all entries belonging to one calendar year.
 * @param {Array} entries raw entries from one year's data file
 * @param {number} year
 * @param {Date} [today] comparison anchor (inject for deterministic tests)
 */
function aggregateYear(entries, year, today = new Date()) {
  const norm = normalizeEntries(entries, year);
  const stats = {
    year,
    total: norm.length,
    dated: 0,
    tba: 0,
    released: 0,
    upcoming: 0,
    byMonth: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, ...EMPTY_MONTH() })),
    byPlatform: {}, // name -> { count, released }
  };

  for (const g of norm) {
    if (!g.parsed.ok) {
      stats.tba++;
      continue;
    }
    stats.dated++;
    const isReleased = g.parsed.date <= today;
    if (isReleased) stats.released++;
    else stats.upcoming++;

    const m = stats.byMonth[g.parsed.month - 1];
    m.total++;
    if (isReleased) m.released++;
    else m.upcoming++;

    for (const p of g.platforms) {
      const s = (stats.byPlatform[p] = stats.byPlatform[p] || { count: 0, released: 0 });
      s.count++;
      if (isReleased) s.released++;
    }
  }
  return stats;
}

/**
 * Combine per-year stats into the global shape used by the timeline and stats page.
 */
function aggregateAll(yearStatsList) {
  const byYear = yearStatsList.map((s) => ({
    year: s.year,
    total: s.total,
    dated: s.dated,
    tba: s.tba,
    released: s.released,
    upcoming: s.upcoming,
  }));

  const byMonth = [];
  for (const s of yearStatsList) {
    for (const m of s.byMonth) {
      if (m.total > 0) {
        byMonth.push({ year: s.year, month: m.month, total: m.total, released: m.released, upcoming: m.upcoming });
      }
    }
  }

  const byPlatform = {};
  for (const s of yearStatsList) {
    for (const [name, p] of Object.entries(s.byPlatform)) {
      const t = (byPlatform[name] = byPlatform[name] || { count: 0, released: 0 });
      t.count += p.count;
      t.released += p.released;
    }
  }

  const totals = byYear.reduce(
    (acc, y) => {
      acc.total += y.total;
      acc.released += y.released;
      acc.upcoming += y.upcoming;
      acc.tba += y.tba;
      return acc;
    },
    { total: 0, released: 0, upcoming: 0, tba: 0, years: byYear.length }
  );

  return { byYear, byMonth, byPlatform, totals };
}

module.exports = { normalizeEntries, aggregateYear, aggregateAll };