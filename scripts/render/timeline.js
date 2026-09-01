// Year timeline page (index.html): horizontal, scrollable list of years.

const { renderPage, escapeHtml } = require("./common");

function renderTimeline(allStats, currentYear) {
  const items = allStats.byYear
    .map((s) => {
      const state = s.year < currentYear ? "past" : s.year === currentYear ? "current" : "future";
      const pct = s.dated > 0 ? Math.round((s.released / s.dated) * 100) : 0;
      return `<a class="tl-item ${state}" href="${s.year}.html">
        <div class="year">${s.year}</div>
        <div class="counts"><b>${s.released}</b> released &middot; <b>${s.upcoming}</b> upcoming</div>
        <div class="bar"><i style="width:${pct}%"></i></div>
      </a>`;
    })
    .join("");

  const body = `
<h1>Game Calendar</h1>
<p class="sub">Annual release schedule by year, scraped from Game Informer. Pick a year to open its monthly calendar.</p>

<div class="cards">
  <div class="card total"><div class="num">${allStats.totals.total}</div><div class="lbl">Games tracked</div></div>
  <div class="card released"><div class="num">${allStats.totals.released}</div><div class="lbl">Released</div></div>
  <div class="card upcoming"><div class="num">${allStats.totals.upcoming}</div><div class="lbl">Upcoming</div></div>
  <div class="card tba"><div class="num">${allStats.totals.tba}</div><div class="lbl">TBA</div></div>
  <div class="card total"><div class="num">${allStats.totals.years}</div><div class="lbl">Years covered</div></div>
</div>

<div class="tl-wrap">
  <div class="tl-track" id="tl-track">${items}</div>
  <div class="tl-scroll">
    <button type="button" id="tl-prev" aria-label="Scroll to earlier years">&larr; Past</button>
    <button type="button" id="tl-next" aria-label="Scroll to later years">Future &rarr;</button>
  </div>
  <p class="tl-legend">
    <span class="dot" style="background:var(--accent)"></span>current year
    <span class="dot" style="background:var(--released)"></span>released share of dated releases
    (green bar), upcoming counts shown separately.
  </p>
</div>

<p class="sub" style="margin-top:26px">Interactive charts: <a href="stats.html">Statistics &rarr;</a></p>

<script>
(function () {
  var track = document.getElementById('tl-track');
  var prev = document.getElementById('tl-prev');
  var next = document.getElementById('tl-next');
  var step = function (dir) { track.scrollBy({ left: dir * track.clientWidth * 0.7, behavior: 'smooth' }); };
  prev.addEventListener('click', function () { step(-1); });
  next.addEventListener('click', function () { step(1); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  // always center the current year on load
  var cur = track.querySelector('.tl-item.current');
  if (cur) track.scrollLeft = cur.offsetLeft - (track.clientWidth - cur.clientWidth) / 2;
})();
</script>
`;

  return renderPage({
    title: "Game Calendar — Years",
    description: `Game release calendar by year (${allStats.totals.years} years, ${allStats.totals.total} games) scraped from Game Informer.`,
    body,
    currentYear,
    activeNav: "index.html",
  });
}

module.exports = { renderTimeline };