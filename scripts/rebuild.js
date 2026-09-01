// rebuild.js — offline rebuild of every static page from the data files in public/.
//
// Reads public/<year>.json for historical years and public/index.json for the
// current year (index.json is what the scraper writes for the current year),
// then regenerates:
//   public/index.html      year timeline
//   public/<year>.html     per-year calendar pages
//   public/stats.html      global statistics (ECharts)
//
// Does not touch the scrapers and never fetches the network.

const fs = require("fs");
const path = require("path");
const { aggregateYear, aggregateAll, normalizeEntries } = require("./aggregate");
const { renderTimeline } = require("./render/timeline");
const { renderYearPage } = require("./render/year");
const { renderStatsPage } = require("./render/stats");

const PUBLIC_DIR = path.join(__dirname, "..", "public");

/** "2016.json" -> 2016 ; "index.json" -> the current year. */
function yearOfFile(filename) {
  if (filename === "index.json") return new Date().getFullYear();
  const m = /^(\d{4})\.json$/.exec(filename);
  return m ? Number(m[1]) : null;
}

function main() {
  const today = new Date();
  const currentYear = today.getFullYear();

  const byYear = new Map();
  for (const file of fs.readdirSync(PUBLIC_DIR)) {
    if (!file.endsWith(".json")) continue;
    const year = yearOfFile(file);
    if (!year) continue;
    const raw = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, file), "utf8"));
    if (!Array.isArray(raw)) {
      throw new Error(`Data file ${file} is not a JSON array — aborting rebuild`);
    }
    byYear.set(year, { file, raw });
  }

  if (byYear.size === 0) {
    throw new Error("No year data files found in public/ — aborting rebuild");
  }

  const years = [...byYear.keys()].sort((a, b) => a - b);
  const yearStats = years.map((y) => aggregateYear(byYear.get(y).raw, y, today));
  const all = aggregateAll(yearStats);

  fs.writeFileSync(path.join(PUBLIC_DIR, "index.html"), renderTimeline(all, currentYear));

  for (const [i, y] of years.entries()) {
    const { raw } = byYear.get(y);
    const entries = normalizeEntries(raw, y);
    fs.writeFileSync(
      path.join(PUBLIC_DIR, `${y}.html`),
      renderYearPage({
        year: y,
        entries,
        stats: yearStats[i],
        currentYear,
        prevYear: years[i - 1],
        nextYear: years[i + 1],
      })
    );
  }

  fs.writeFileSync(path.join(PUBLIC_DIR, "stats.html"), renderStatsPage(all, currentYear));

  console.log(`Rebuilt ${years.length} year pages + index.html + stats.html (current year ${currentYear})`);
  for (const y of years) {
    const s = yearStats[years.indexOf(y)];
    console.log(
      `  ${y}: ${s.total} total, ${s.released} released, ${s.upcoming} upcoming, ${s.tba} TBA`
    );
  }
}

main();