# AGENTS.md — Game Calendar (gcoty)

Static release-schedule website: scrapes titles/platforms/release dates from
Game Informer each week and regenerates fully static HTML pages (timeline,
per-year month calendars, statistics), deployed to GitHub Pages.

## Project

- Stack: plain Node.js (CommonJS, no bundler), deps: `node-fetch`,
  `node-html-parser`, `moment`, `ical-generator`. Front-end is pre-rendered
  self-contained HTML + vanilla CSS/JS (ECharts via CDN, Google Fonts, Bootstrap
  Icons). Fonts/icons/libraries are CDN <link src>s, not vendored.
- Data files: `public/<year>.json` (2016–2025 committed); current & next year
  (`index.json`, `2026.*`, `2027.*`, `index.html`) are `.gitignore`d (deployment
  only, by design).
- Entry points:
  - `index.js` — scrape current year (`index.json`) + next year.
  - `legacy.js` — regenerate historical `2016–2018` json/ics from `data/*-plain.json`.
  - `rebuild.js` — offline render every HTML page from the `.json` files.

## Commands

- Test: `npm test`  (`node --test` against `test/*.test.js`)
- Rebuild pages from existing data: `npm run rebuild` (`node scripts/rebuild.js`)
- Scrape (network): `node index.js`  (current/near-future years), `node legacy.js` (history)

## Architecture

- Scraping must **not** be touched casually — GameInformer markup drifts and the
  selection logic is deliberately frozen. Keep parsing isolated from rendering.
- `scripts/dates.js` — tolerant `releaseDate` parser (handles "June27",
  parenthetical suffixes, `unconfirmed`/blank → tba, invalid → kind).
- `scripts/platforms.js` — normalize platform names + **family grouping** for
  icons; the alias/*family* tables are the single place to extend when new
  platforms appear.
- `scripts/aggregate.js` — count released/upcoming by year/month/platform (a
  date ≤ now = released; missing/unparseable = tba, never in monthly sums).
- `scripts/rebuild.js` — orchestration: reads all `public/*.json`, produces
  `index.html` (timeline), `<year>.html` (12 month calendars), `stats.html`.
- `scripts/render/*` — pure HTML page renderers. **All** styling lives in
  `scripts/render/common.js` (`STYLES` + shared `renderPage` shell).
- `test/*.test.js` — node:test for dates.js / platforms.js / aggregate.js.

## Conventions

- Data is normalized at read-time only; never rewrite committed `.json`.
- Renderers receive a plain, already-normalized model; keep logic out of markup
  strings (but small per-page <script> enhancers are inlined in each renderer).
- `releaseDate` has **no year** — year is contextual to the page; dates parser
  is injected with the year.
- Theme caveat: check platform family tables before adding hardcoded platform
  names/colors.
- Per the project owner: historical data is kept; only the current+future years
  are refreshed on each run.

## Notes
- Design/theming decisions (fonts, palettes, light/dark + Auto mapping) are
  captured in `docs/design.md` — reference it before styling changes.
