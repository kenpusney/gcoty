// Year page ({year}.html): 12 inline month calendars, one shown at a time.
//
// The month-nav toolbar acts as a filter: exactly one month is visible at a
// time (the current month when the page year is the current year, January
// otherwise). Prev/next year links sit on the left and right of the month
// links, which double as filters. Anchors (#january..#december) select a month.
// Without JS the page still shows its default month.

const { renderPage, escapeHtml } = require("./common");
const { MONTH_NAMES, monthLabel, daysInMonth } = require("../dates");
const { groupByFamily } = require("../platforms");
const { makeShareClient } = require("./share-client");

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
    ? `<a href="https://www.gameinformer.com${escapeHtml(g.url)}" target="_blank" rel="noopener">${escapeHtml(g.title)}</a>`
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
    cells += `<div class="day-cell${has ? " has-games" : ""}" data-date="${year}-${month}-${d}" data-label="${monthLabel(month)} ${d}" data-month="${month}">
      <span class="day-head">
        <span class="day-num">${d}${countDot(list.length)}</span>
        ${has
          ? `<button type="button" class="share-day bi bi-share" data-share-date="${year}-${month}-${d}" aria-label="Share releases for ${monthLabel(month)} ${d}"></button>`
          : ""}
      </span>
      ${has
        ? `<ul class="games">${list.map(gameListItem).join("")}</ul>
      <span class="day-more" aria-hidden="true">${list.length} title${list.length > 1 ? "s" : ""} &nearr;</span>`
        : ""}
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
function renderYearPage({ year, entries, stats, currentYear, prevYear, nextYear, base = "https://kimleo.net/gcoty" }) {
  const dayGroups = groupByDay(entries);
  const defaultMonth = year === currentYear ? new Date().getMonth() + 1 : 1;
  const shareScript = makeShareClient({ base, pageYear: year });

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
</nav>
<noscript><p class="note">JavaScript is needed to switch months; the default month (${monthLabel(defaultMonth)}) is shown below.</p></noscript>

${monthsHtml}

${shareScript}

<div class="day-modal" id="day-modal" hidden>
  <div class="day-modal-backdrop" data-day-close></div>
  <div class="day-modal-panel" role="dialog" aria-modal="true" aria-labelledby="day-modal-title">
    <div class="day-modal-head">
      <h4 id="day-modal-title"></h4>
      <span class="day-modal-actions">
        <button type="button" class="share-day bi bi-share" id="modal-share" aria-label="Share these releases"></button>
        <button type="button" class="day-modal-close" data-day-close aria-label="Close">&times;</button>
      </span>
    </div>
    <ul class="day-modal-list" id="day-modal-list"></ul>
  </div>
</div>

<script>
(function () {
  var months = ${JSON.stringify(MONTH_IDS)};
  var pageYear = ${year};
  function activate(name) {
    months.forEach(function (m) {
      var s = document.getElementById(m);
      if (s) s.classList.toggle('active', m === name);
    });
    var navs = document.querySelectorAll('.month-nav a.month-link');
    navs.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + name); });
    var active = document.querySelector('.month-nav a.month-link.active');
    if (active) active.scrollIntoView({ block: 'nearest', inline: 'center' });
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

  window.addEventListener('hashchange', function () {
    var h = fromHash();
    if (h) activate(h);
  });

  // Mobile: tapping a day with games opens its release list in a modal.
  var modal = document.getElementById('day-modal');
  var modalTitle = document.getElementById('day-modal-title');
  var modalList = document.getElementById('day-modal-list');
  var mqMobile = window.matchMedia('(max-width: 720px)');
  function openDay(dCell) {
    if (!dCell) return;
    modalTitle.textContent = dCell.getAttribute('data-label');
    modalList.innerHTML = dCell.querySelector('.games').innerHTML;
    var sh = document.getElementById('modal-share');
    if (sh) sh.setAttribute('data-share-date', dCell.getAttribute('data-date'));
    modal.hidden = false;
    document.body.classList.add('modal-open');
  }
  function closeDay() {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
  }
  if (modal) {
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-day-close]')) { closeDay(); return; }
      if (!mqMobile.matches) return;
      var dCell = e.target.closest ? e.target.closest('.day-cell.has-games') : null;
      if (dCell && !e.target.closest('a')) openDay(dCell);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDay();
    });
  }
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