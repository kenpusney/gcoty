// Global statistics page (stats.html): interactive ECharts visualizations.
// ECharts is loaded from a CDN; the page still renders its text content and
// overview cards without JavaScript.

const { renderPage, escapeHtml } = require("./common");

const ECHARTS_CDN = "https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js";

function renderStatsPage(allStats, currentYear) {
  const { byYear, byMonth, byPlatform, totals } = allStats;

  const topPlatforms = Object.entries(byPlatform)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([name, s]) => ({ name, count: s.count, released: s.released }));

  // per-year monthly released counts (12 entries per year) + all-years sums
  const byMonthReleased = {};
  for (const y of byYear) byMonthReleased[y.year] = Array.from({ length: 12 }, () => 0);
  for (const m of byMonth) byMonthReleased[m.year][m.month - 1] = m.released;
  const sumByMonth = Array.from({ length: 12 }, (_, i) =>
    byYear.reduce((acc, y) => acc + byMonthReleased[y.year][i], 0)
  );

  const data = {
    currentYear,
    years: byYear,
    byMonthReleased,
    sumByMonth,
    platforms: topPlatforms,
  };

  const yearOptionsHtml =
    `<option value="all">All years combined</option>` +
    byYear.map((y) => `<option value="${y.year}">${y.year}</option>`).join("");

  const body = `
<h1>Statistics</h1>
<p class="sub">Counted up to today (${escapeHtml(new Date().toISOString().slice(0, 10))}): "released" means the entry's release date has already passed. Entries without a concrete date ("TBA") never count toward monthly or yearly series. A game releasing on several platforms counts once per platform in the platform chart.</p>

<div class="cards">
  <div class="card total"><div class="num">${totals.total}</div><div class="lbl">Games tracked</div></div>
  <div class="card released"><div class="num">${totals.released}</div><div class="lbl">Released</div></div>
  <div class="card upcoming"><div class="num">${totals.upcoming}</div><div class="lbl">Upcoming</div></div>
  <div class="card tba"><div class="num">${totals.tba}</div><div class="lbl">TBA</div></div>
</div>

<h2>Games per year</h2>
<div id="chart-trend" class="chart"></div>

<h2>Released games per month</h2>
<div class="filter-row">
  <label for="hm-year">Year:</label>
  <select id="hm-year">${yearOptionsHtml}</select>
</div>
<div id="chart-monthly" class="chart"></div>

<h2>Top platforms by games released</h2>
<div id="chart-platforms" class="chart"></div>

<script src="${ECHARTS_CDN}"></script>
<script>window.__GC = ${JSON.stringify(data).replace(/</g, "\\u003c")};</script>
<script>
(function () {
  var D = window.__GC;
  if (!window.echarts) return;
  var MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var hmYear = document.getElementById('hm-year');
  var state = { monthKey: hmYear ? hmYear.value : 'all' };
  var charts = {};

  function cssInt(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function axisColors() {
    return {
      label: cssInt('--muted'),
      line: cssInt('--line'),
      split: 'transparent',
      autoBg: 'transparent'
    };
  }
  function buildTrend(releasedColor, upcomingColor, axis) {
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['Released', 'Upcoming'], textStyle: { color: cssInt('--muted') } },
      grid: { left: 40, right: 20, top: 40, bottom: 40 },
      xAxis: { type: 'category', data: D.years.map(function (y) { return y.year; }), axisLabel: { color: axis.label }, axisLine: { lineStyle: { color: axis.line } } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: axis.label }, splitLine: { lineStyle: { color: axis.line } } },
      series: [
        { name: 'Released', type: 'bar', stack: 't', itemStyle: { color: releasedColor }, data: D.years.map(function (y) { return y.released; }) },
        { name: 'Upcoming', type: 'bar', stack: 't', itemStyle: { color: upcomingColor }, data: D.years.map(function (y) { return y.upcoming; }) }
      ]
    };
  }
  function buildMonthly(releasedColor, axis) {
    var counts = state.monthKey === 'all' ? D.sumByMonth : (D.byMonthReleased[state.monthKey] || null);
    if (!counts) counts = D.sumByMonth;
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 44, right: 20, top: 34, bottom: 30 },
      xAxis: { type: 'category', data: MONTH_ABBR, axisLabel: { color: axis.label }, axisLine: { lineStyle: { color: axis.line } } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: axis.label }, splitLine: { lineStyle: { color: axis.line } } },
      series: [{
        name: 'Released',
        type: 'bar',
        data: counts,
        itemStyle: { color: releasedColor, borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 34,
        label: { show: true, position: 'top', fontSize: 10, color: axis.label }
      }]
    };
  }
  function buildPlats(releasedColor, upcomingColor, axis) {
    var names = D.platforms.map(function (p) { return p.name; }).reverse();
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['Released', 'Not yet released'], textStyle: { color: cssInt('--muted') } },
      grid: { left: 140, right: 40, top: 40, bottom: 30 },
      xAxis: { type: 'value', minInterval: 1, axisLabel: { color: axis.label }, splitLine: { lineStyle: { color: axis.line } } },
      yAxis: { type: 'category', data: names, axisLabel: { color: axis.label }, splitLine: { show: false } },
      series: [
        { name: 'Released', type: 'bar', stack: 'p', itemStyle: { color: releasedColor }, data: D.platforms.map(function (p) { return p.released; }).reverse() },
        { name: 'Not yet released', type: 'bar', stack: 'p', itemStyle: { color: upcomingColor }, data: D.platforms.map(function (p) { return p.count - p.released; }).reverse() }
      ]
    };
  }
  function render() {
    ['trend', 'monthly', 'plats'].forEach(function (k) { if (charts[k]) { charts[k].dispose(); charts[k] = null; } });
    // per-theme fallbacks until CSS vars apply (paper root is <html> without attr)
    var releasedColor = cssInt('--released') || '#1e7f4d';
    var upcomingColor = cssInt('--upcoming') || '#ad6d0a';
    var accent = cssInt('--accent') || '#1e4fd6';
    var axis = axisColors();

    charts.trend = echarts.init(document.getElementById('chart-trend'));
    charts.trend.setOption(buildTrend(releasedColor, upcomingColor, axis));
    charts.monthly = echarts.init(document.getElementById('chart-monthly'));
    charts.monthly.setOption(buildMonthly(releasedColor, axis));
    charts.plats = echarts.init(document.getElementById('chart-platforms'));
    charts.plats.setOption(buildPlats(releasedColor, upcomingColor, axis));
  }
  render();

  hmYear && hmYear.addEventListener('change', function () {
    state.monthKey = hmYear.value;
    // keep monthly in sync; rebuild just that chart cheaply
    var released = cssInt('--released') || '#1e7f4d';
    if (charts.monthly) charts.monthly.setOption(buildMonthly(released, axisColors()), true);
  });
  window.addEventListener('resize', function () { for (var k in charts) if (charts[k]) charts[k].resize(); });

  // Rebuild charts when the user switches theme via the header (CSS vars change).
  var mo = new MutationObserver(function () { render(); });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
</script>
`;

  return renderPage({
    title: "Game Calendar — Statistics",
    description: `Release statistics: ${totals.released} games already released across ${totals.years} years, per-year / per-month / per-platform breakdown, from Game Informer data.`,
    body,
    currentYear,
    activeNav: "stats.html",
  });
}

module.exports = { renderStatsPage };