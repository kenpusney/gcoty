// Year page ({year}.html): 12 inline month calendars, one shown at a time.
//
// The month-nav toolbar acts as a filter: exactly one month is visible by
// default (the current month when the page year is the current year, January
// otherwise), with prev/next year links on the left and right. Anchors
// (#january..#december) select a month; "Show all months" reveals the full
// year. Without JS the page still shows its default month.

const { renderPage, escapeHtml } = require("./common");
const { MONTH_NAMES, monthLabel, daysInMonth } = require("../dates");
const { groupByFamily } = require("../platforms");

const MONTH_IDS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** Group normalized entries of one year by (month, day). */
function groupByDay(entries) {
  const groups = {};
  for (const g of entries) {
    if (!g.parsed.ok) continue;
    const key = `${g.parsed.month}-${g.parsed.day}`;
    (groups[key] = groups[key] || []).push(g);
  }
  return groups;
}

/** Six-level green gradient dot; class derived from the number of games. */
function countDot(n) {
  if (n < 1) return "";
  const cls = n >= 6 ? "d6" : "d" + n;
  return `<span class="count-dot ${cls}" title="${n} game${n > 1 ? "s" : ""}"></span>`;
}

function gameListItem(g) {
  const name = g.url
    ? `<a href="https://www.gameinformer.com${escapeHtml(g.url)}">${escapeHtml(g.title)}</a>`
    : escapeHtml(g.title);
  const icons = groupByFamily(g.platforms)
    .map((fam) =>
      fam.icon
        ? `<i class="bi ${fam.icon}" title="${escapeHtml(fam.names.join(", "))}"></i>`
        : `<span class="plat-txt">${escapeHtml(fam.names.join(", "))}</span>`
    )
    .join("");
  const platMarkup = icons ? `<span class="platform-icons">${icons}</span>` : "";
  return `<li>${name}${platMarkup}</li>`;
}

function renderMonthCalendar(year, month, dayGroups, monthStats, active) {
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  const numDays = daysInMonth(year, month);
  const headers = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    .map((d) => `<div class="cal-header">${d}</div>`)
    .join("");

  let cells = "";
  for (let i = 0; i < firstWeekday; i++) cells += '<div class="day-cell empty"></div>';
  for (let d = 1; d <= numDays; d++) {
    const list = dayGroups[`${month}-${d}`] || [];
    const has = list.length > 0;
    cells += `<div class="day-cell${has ? " has-games" : ""}" data-date="${year}-${month}-${d}">
      <span class="day-num">${d}${countDot(list.length)}</span>
      ${has ? `<ul class="games">${list.map(gameListItem).join("")}</ul>` : ""}
    </div>`;
  }

  const rel = monthStats ? `<span class="rel">${monthStats.released} released</span>` : "";
  const upc = monthStats ? ` <span class="upc">${monthStats.upcoming} upcoming</span>` : "";
  return `<section class="month${active ? " active" : ""}" id="${MONTH_IDS[month - 1]}" data-month="${month}">
    <h3>${monthLabel(month)}</h3>
    <p class="mstats">${rel}${upc}</p>
    <div class="calendar">${headers}${cells}</div>
  </section>`;
}

/**
 * @param {object} opts
 * @param {number} opts.year
 * @param {Array}  opts.entries normalized entries for the year
 * @param {object} opts.stats  aggregateYear result
 * @param {number} opts.currentYear build-time current year
 * @param {number} [opts.prevYear] previous year (undefined at the earliest year)
 * @param {number} [opts.nextYear] next year (undefined at the latest year)
 */
function renderYearPage({ year, entries, stats, currentYear, prevYear, nextYear }) {
  const dayGroups = groupByDay(entries);
  const defaultMonth = year === currentYear ? new Date().getMonth() + 1 : 1;

  const monthLinks = MONTH_IDS.map((id, i) => `<a class="month-link" href="#${id}">${MONTH_NAMES[i]}</a>`).join("");
  const prevLink = prevYear
    ? `<a class="year-link prev" href="${prevYear}.html">&#8249; ${prevYear}</a>`
    : `<span class="year-link disabled prev">&#8249;</span>`;
  const nextLink = nextYear
    ? `<a class="year-link next" href="${nextYear}.html">${nextYear} &#8250;</a>`
    : `<span class="year-link disabled next">&#8250;</span>`;

  const monthsHtml = MONTH_NAMES.map((_, i) =>
    renderMonthCalendar(year, i + 1, dayGroups, stats.byMonth[i], i + 1 === defaultMonth)
  ).join("");

  const body = `
<h1>Game Calendar ${year}</h1>
<p class="sub">${stats.total} games &middot; ${stats.released} released &middot; ${stats.upcoming} upcoming &middot; ${stats.tba} TBA</p>

<nav class="month-nav">
  <span class="years">${prevLink}</span>
  <span class="months">${monthLinks}</span>
  <span class="years">${nextLink}</span>
  <button type="button" class="show-all-btn" id="show-all">Show all months</button>
</nav>
<noscript><p class="note">JavaScript is needed to switch months; the default month (${monthLabel(defaultMonth)}) is shown below.</p></noscript>

${monthsHtml}

<script>
(function () {
  var months = ${JSON.stringify(MONTH_IDS)};
  var pageYear = ${year};
  function activate(name) {
    document.body.classList.remove('show-all');
    months.forEach(function (m) {
      var s = document.getElementById(m);
      if (s) s.classList.toggle('active', m === name);
    });
    var navs = document.querySelectorAll('.month-nav a.month-link');
    navs.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + name); });
  }
  function fromHash() {
    var h = (location.hash || '').replace('#', '').toLowerCase();
    return months.indexOf(h) >= 0 ? h : null;
  }
  var now = new Date();
  var target = fromHash();
  if (!target && pageYear === now.getFullYear()) target = months[now.getMonth()];
  if (target) activate(target);

  var todayKey = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
  var cell = document.querySelector('.day-cell[data-date="' + todayKey + '"]');
  if (cell) cell.classList.add('today');

  var showAllBtn = document.getElementById('show-all');
  if (showAllBtn) showAllBtn.addEventListener('click', function () {
    document.body.classList.toggle('show-all');
  });
  window.addEventListener('hashchange', function () {
    var h = fromHash();
    if (h) activate(h);
  });
})();
</script>
`;

  return renderPage({
    title: `Game Calendar ${year}`,
    description: `Game release calendar for ${year} (${stats.total} games tracked) from Game Informer.`,
    body,
    currentYear,
    activeNav: year === currentYear ? "index.html" : null,
  });
}

module.exports = { renderYearPage };