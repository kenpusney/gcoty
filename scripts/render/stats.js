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

<h2>Released games per month (calendar heatmap)</h2>
<div class="filter-row">
  <label for="hm-year">Year:</label>
  <select id="hm-year">${yearOptionsHtml}</select>
</div>
<div id="chart-monthly" class="chart chart-sm"></div>

<h2>Top platforms by games released</h2>
<div id="chart-platforms" class="chart"></div>

<script src="${ECHARTS_CDN}"></script>
<script>window.__GC = ${JSON.stringify(data).replace(/</g, "\\u003c")};</script>
<script>
(function () {
  var D = window.__GC;
  if (!window.echarts) return;
  var releasedColor = '#16a34a';
  var upcomingColor = '#f59e0b';

  var trend = echarts.init(document.getElementById('chart-trend'));
  trend.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Released', 'Upcoming'] },
    grid: { left: 40, right: 20, top: 40, bottom: 40 },
    xAxis: { type: 'category', data: D.years.map(function (y) { return y.year; }) },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      { name: 'Released', type: 'bar', stack: 't', itemStyle: { color: releasedColor }, data: D.years.map(function (y) { return y.released; }) },
      { name: 'Upcoming', type: 'bar', stack: 't', itemStyle: { color: upcomingColor }, data: D.years.map(function (y) { return y.upcoming; }) }
    ]
  });

  var monthly = echarts.init(document.getElementById('chart-monthly'));
  var hmYear = document.getElementById('hm-year');
  function pad2js(n) { return n < 10 ? '0' + n : '' + n; }
  function renderHeatmap(key) {
    var counts = key === 'all' ? D.sumByMonth : (D.byMonthReleased[key] || null);
    if (!counts) return;
    var yearNum = key === 'all' ? D.currentYear : Number(key);
    var maxV = 1;
    counts.forEach(function (c) { if (c > maxV) maxV = c; });
    monthly.setOption({
      tooltip: {
        formatter: function (p) { return p.value[0] + ': <b>' + p.value[1] + '</b> released'; }
      },
      visualMap: { min: 0, max: maxV, calculable: true, orient: 'horizontal', left: 'center', top: 8, inRange: { color: ['#f0fdf4', '#4ade80', '#15803d'] } },
      calendar: { range: [yearNum + '-01-01', yearNum + '-12-31'], cellSize: ['auto', 26], itemStyle: { borderWidth: 2, borderColor: '#fff' }, yearLabel: { show: false }, monthLabel: { nameMap: 'en' }, dayLabel: { show: false } },
      series: [{
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: counts.map(function (c, i) { return [yearNum + '-' + pad2js(i + 1) + '-15', c]; })
      }]
    }, true);
  }
  renderHeatmap(hmYear.value);
  hmYear.addEventListener('change', function () { renderHeatmap(hmYear.value); });

  var names = D.platforms.map(function (p) { return p.name; }).reverse();
  var plats = echarts.init(document.getElementById('chart-platforms'));
  plats.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Released', 'Not yet released'] },
    grid: { left: 140, right: 40, top: 40, bottom: 30 },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: { type: 'category', data: names },
    series: [
      { name: 'Released', type: 'bar', stack: 'p', itemStyle: { color: releasedColor }, data: D.platforms.map(function (p) { return p.released; }).reverse() },
      { name: 'Not yet released', type: 'bar', stack: 'p', itemStyle: { color: upcomingColor }, data: D.platforms.map(function (p) { return p.count - p.released; }).reverse() }
    ]
  });

  window.addEventListener('resize', function () { trend.resize(); monthly.resize(); plats.resize(); });
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