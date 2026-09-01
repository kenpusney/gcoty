// Shared page shell, styles and tiny HTML helpers for all rendered pages.
// Every page is fully static and self-contained (no external CSS/JS),
// progressive enhancement only: without JS the calendar shows all months.

const STYLES = `
:root {
  --fg: #1f2430; --muted: #6b7280; --line: #e5e7eb; --bg: #fafafa;
  --accent: #2563eb; --accent-soft: #dbeafe;
  --released: #16a34a; --upcoming: #f59e0b; --tba: #9ca3af;
  --card: #ffffff;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: "Newsreader", Georgia, "Times New Roman", serif; color: var(--fg); background: var(--bg); line-height: 1.45; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

.site-header { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 10px 20px; background: var(--card); border-bottom: 1px solid var(--line); }
.site-header .brand { font-weight: 700; font-size: 1.1rem; color: var(--fg); }
.site-header nav { display: flex; gap: 14px; }
.site-header nav a { color: var(--muted); }
.site-header nav a.active { color: var(--accent); font-weight: 600; }

main { max-width: 1080px; margin: 0 auto; padding: 24px 20px 48px; }
footer { max-width: 1080px; margin: 0 auto; padding: 12px 20px 32px; color: var(--muted); font-size: 0.85rem; border-top: 1px solid var(--line); }
h1 { margin: 8px 0 4px; }
h2 { margin: 28px 0 10px; }
.sub { color: var(--muted); margin: 0 0 18px; }

/* --- overview cards --- */
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 18px 0 26px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 12px 16px; }
.card .num { font-size: 1.7rem; font-weight: 700; line-height: 1.1; }
.card .lbl { color: var(--muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: .04em; }
.card.released .num { color: var(--released); }
.card.upcoming .num { color: var(--upcoming); }
.card.tba .num { color: var(--tba); }
.card.total .num { color: var(--fg); }

/* --- year timeline (index.html) --- */
.tl-wrap { position: relative; margin: 26px 0; }
.tl-track { display: flex; gap: 14px; overflow-x: auto; padding: 10px 2px 16px; scroll-snap-type: x proximity; scrollbar-width: thin; }
.tl-item { flex: 0 0 auto; scroll-snap-align: start; width: 118px; background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 14px 12px; color: var(--fg); text-align: center; transition: transform .12s, box-shadow .12s; }
.tl-item:hover { transform: translateY(-3px); box-shadow: 0 6px 16px rgba(0,0,0,.08); text-decoration: none; }
.tl-item .year { font-size: 1.5rem; font-weight: 700; }
.tl-item .counts { margin: 6px 0; font-size: .78rem; color: var(--muted); }
.tl-item .counts b { color: var(--fg); }
.tl-item.current { outline: 2px solid var(--accent); background: var(--accent-soft); }
.tl-item .bar { height: 6px; border-radius: 3px; background: #eef0f3; overflow: hidden; margin-top: 8px; }
.tl-item .bar > i { display: block; height: 100%; background: var(--released); }
.tl-scroll { display: flex; justify-content: space-between; margin-top: 8px; gap: 10px; }
.tl-scroll button { flex: 1; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--card); color: var(--fg); font-size: .9rem; cursor: pointer; }
.tl-scroll button:hover { border-color: var(--accent); color: var(--accent); }
.tl-legend { margin: 6px 0 0; font-size: .82rem; color: var(--muted); }
.tl-legend .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin: 0 4px 0 12px; vertical-align: -1px; }

/* --- month calendar (year pages) --- */
.month-nav { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 16px 0 20px; }
.month-nav .years { display: flex; gap: 8px; }
.month-nav .months { display: flex; flex-wrap: wrap; gap: 6px; }
.month-nav a.year-link { padding: 6px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--card); color: var(--fg); font-weight: 600; white-space: nowrap; }
.month-nav a.year-link:hover { border-color: var(--accent); color: var(--accent); text-decoration: none; }
.month-nav .year-link.disabled { opacity: .4; pointer-events: none; }
.month-nav a.month-link { padding: 6px 12px; border: 1px solid var(--line); border-radius: 999px; background: var(--card); color: var(--fg); font-size: .85rem; }
.month-nav a.month-link:hover { border-color: var(--accent); color: var(--accent); text-decoration: none; }
.month-nav a.month-link.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.show-all-btn { padding: 6px 12px; border: 1px dashed var(--line); border-radius: 999px; background: transparent; color: var(--muted); font-size: .85rem; cursor: pointer; font-family: inherit; }
.show-all-btn:hover { border-color: var(--accent); color: var(--accent); }
body.show-all .show-all-btn { border-style: solid; color: var(--accent); border-color: var(--accent); }

/* exactly one month is shown; the month links above act as filters.
   body.show-all (toggle button) reveals every month. */
.month { display: none; }
.month.active { display: block; }
body.show-all .month { display: block; }

.month h3 { margin: 0 0 2px; }
.month .mstats { color: var(--muted); font-size: .85rem; margin: 0 0 10px; }
.month .mstats .rel { color: var(--released); }
.month .mstats .upc { color: var(--upcoming); }
.month .mstats .tba { color: var(--tba); }

.calendar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-bottom: 26px; }
.cal-header { font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); text-align: center; padding: 4px 0; }
.day-cell { position: relative; min-height: 96px; background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 6px; overflow: hidden; }
.day-cell.empty { background: transparent; border-color: transparent; }
.day-cell.today { outline: 2px solid var(--accent); }
.day-num { display: inline-block; font-size: .78rem; font-weight: 600; color: var(--muted); padding: 1px 6px; border-radius: 999px; }
.day-cell.has-games .day-num { background: var(--accent-soft); color: var(--accent); }
.day-cell.today .day-num { background: var(--accent); color: #fff; }
.day-cell .games { list-style: none; margin: 4px 0 0; padding: 0; font-size: .7rem; max-height: 72px; overflow-y: auto; }
.day-cell .games li { padding: 2px 0; border-top: 1px dashed var(--line); }
.day-cell .games li:first-child { border-top: none; }
.day-cell .games .plats { display: block; color: var(--muted); }

/* calendars: exactly one .month.active is displayed; see .month rules above */

/* --- release-count dots on day cells (gradient by count) --- */
.count-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-left: 6px; vertical-align: middle; }
.count-dot.d1 { background: #e3f5e9; }
.count-dot.d2 { background: #b8e7cb; }
.count-dot.d3 { background: #7ed3a0; }
.count-dot.d4 { background: #46b574; }
.count-dot.d5 { background: #209254; }
.count-dot.d6 { background: #0f6638; }

/* --- platform brand icons (Bootstrap Icons), merged per family --- */
.platform-icons { margin-left: 6px; white-space: nowrap; }
.platform-icons i.bi { font-size: .78rem; color: #4b5563; margin-left: 3px; cursor: help; }
.platform-icons .plat-txt { font-size: .7rem; color: var(--tba); }

/* --- stats page --- */
.filter-row { display: flex; align-items: center; gap: 8px; margin: 12px 0 4px; }
.filter-row select { padding: 6px 10px; font-family: inherit; font-size: .9rem; border: 1px solid var(--line); border-radius: 8px; background: var(--card); color: var(--fg); }
.chart { height: 420px; margin: 18px 0 30px; }
.chart-sm { height: 520px; }
.note { color: var(--muted); font-size: .82rem; }
@media (max-width: 720px) {
  .calendar { gap: 4px; }
  .day-cell { min-height: 74px; padding: 4px; }
  .day-cell .games { max-height: 56px; }
  .site-header { flex-direction: column; align-items: flex-start; }
}
`;

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Default deployed site URL (GitHub Pages for kenpusney/gcoty). Change here if
// the site is hosted elsewhere; og:url is built from this + the page path.
const SITE_URL = "https://kenpusney.github.io/gcoty";

function renderPage({ title, description, body, currentYear, activeNav, path = "", siteUrl = SITE_URL }) {
  const ogUrl = `${siteUrl}/${path}`;
  const nav = (page, label) =>
    `<a href="${page}"${activeNav === page ? ' class="active"' : ""}>${label}</a>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Game Calendar">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(ogUrl)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
<style>${STYLES}</style>
<script>document.documentElement.className += ' js';</script>
</head>
<body>
<header class="site-header">
  <a class="brand" href="index.html">Game Calendar</a>
  <nav>${nav("index.html", "Years")}${nav("stats.html", "Stats")}</nav>
</header>
<main>
${body}
</main>
<footer>
  <p>Game release schedule scraped from <a href="https://www.gameinformer.com">Game Informer</a>${currentYear ? `, current year ${currentYear}` : ""}. Generated pages are static &mdash; share any URL directly.</p>
</footer>
</body>
</html>
`;
}

module.exports = { renderPage, escapeHtml };