// SHARE image builder — rendered per page (client-side, reusable markup).
// Returns a <script> block (self-contained) that:
//  - turns any [data-share-date] the user clicks into a themed PNG poster of
//    that day's releases (list read from the calendar DOM),
//  - draws a QR code (top-right footer) pointing at
//        BASE/{pageYear}.html#{month-id}
//  - shows a small themed preview and lets the visitor Download PNG / Close.
//
// To keep the page light, the qrcode-generator lib (UMD global `qrcode`) is
// pulled from a CDN lazily at first use.

const QR_CDN =
  "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";

/**
 * @param {object} o
 * @param {string} o.base          e.g. "https://kimleo.net/gcoty"
 * @param {number} o.pageYear      e.g. 2026
 * @returns {string} markup (one <script> tag) to embed in a page body
 */
function makeShareClient({ base, pageYear }) {
  const months = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];
  const MBASE = String(base).replace(/\/$/, "");
  const YEAR = Number(pageYear);

  return `<script>
(function () {
  var YEAR = ${YEAR};
  var BASE = ${JSON.stringify(MBASE)};
  var MONTHS = ${JSON.stringify(months)};
  var qrLib = null;     // lazy qrcode-generator
  var overlay = null;   // preview <div> created on first use

  // ---------- small css helpers loaded per theme ----------
  function cssVar(name) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v && v !== 'transparent' ? v : null;
  }
  function pick(pairs, fallback) {
    for (var i = 0; i < pairs.length; i++) if (pairs[i]) return pairs[i];
    return fallback;
  }
  function theme() { return document.documentElement.getAttribute('data-theme') || 'paper'; }

  // ---------- gather a day's releases from the visible DOM ----------
  function monthName(m) { return MONTHS[m - 1]; }
  function shareUrl(m) { return BASE + '/' + YEAR + '.html#' + monthName(m); }
  function readGames(list) {
    var out = [];
    if (!list) return out;
    list.querySelectorAll('li').forEach(function (li) {
      var a = li.querySelector('a');
      var title = (a ? a.textContent : li.textContent || '').trim();
      var plats = [];
      li.querySelectorAll('.platform-icons i.bi, .platform-icons .plat-txt').forEach(function (el) {
        var t = el.getAttribute('title');
        if (t) plats.push(t.trim());
        else if (el.textContent) plats.push(el.textContent.trim());
      });
      var href = a ? a.getAttribute('href') : null;
      if (title) out.push({ title: title, platforms: plats, href: href });
    });
    return out;
  }

  function cellNode(el) {
    var c = el && el.closest ? el.closest('.day-cell') : null;
    return c;
  }
  function byDate(ds) {
    return document.querySelector('.day-cell[data-date="' + ds + '"]');
  }

  // ---------- canvas painting ----------
  function loadFonts() {
    try {
      if (document.fonts && document.fonts.ready) return document.fonts.ready.then(function(){});
    } catch (e) { /* no-op */ }
    return Promise.resolve();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function draw(dCell) {
    var label = (dCell.getAttribute('data-label') || '') + ', ' + YEAR;
    var games = readGames(dCell.querySelector('.games'));
    var m = parseInt(dCell.getAttribute('data-month'), 10) ||
            parseInt((dCell.closest && dCell.closest('section.month') ?
                      dCell.closest('section.month').getAttribute('data-month') : '0'), 10) || 1;
    var url = shareUrl(m);

    var W = 840, H = 560, pad = 56;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');

    // theme tokens
    var accent = pick([cssVar('--accent')], '#1e4fd6');
    var accent2 = pick([cssVar('--accent2')], accent);
    var bg = cssVar('--bg');
    var card = cssVar('--card') || '#ffffff';
    var fg = cssVar('--fg') || '#1f2430';
    var muted = cssVar('--muted') || '#6b7280';
    var fdl = cssVar('--font-display');
    var fbody = cssVar('--font-body');
    var isDark = theme() === 'void';
    // decide flat bg (radial-gradient string can't be used directly)
    function solidBg() {
      if (isDark) return '#171238';
      return typeof bg === 'string' && bg.indexOf('#') >= 0 ? (bg.match(/#[0-9a-f]{3,8}/i) || [])[bg.match(/#[0-9a-f]{3,8}/i).length - 1] || '#f6f0e4' : '#f6f0e4';
    }
    function flatColor(hexLike) {
      var m2 = /(#[0-9a-f]{6}|#[0-9a-f]{3})/i.exec(hexLike || '');
      return m2 ? m2[1] : (isDark ? '#f2f0ff' : '#26241f');
    }
    var baseSolid = solidBg();
    var fgSolid = fg.match(/#/) ? flatColor(fg) : fg;
    var accentSolid = flatColor(accent);

    // paper
    ctx.fillStyle = baseSolid;
    ctx.fillRect(0, 0, W, H);
    // header band using accent solid (not white)
    ctx.save();
    if (isDark) {
      var g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, '#4c1d95');
      g.addColorStop(1, '#1e1b57');
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = flatColor(card);
    }
    ctx.fillRect(0, 0, W, 120);
    ctx.restore();

    ctx.fillStyle = accentSolid;
    ctx.fillRect(0, 120, W, 4);

    // title
    var titleFont = (fdl ? '"' + fdl.split(',')[0].replace(/"/g, '') + '", sans-serif' : 'Georgia, serif');
    ctx.fillStyle = fgSolid;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = '700 34px ' + titleFont;
    ctx.fillText('Game Calendar', pad, 34);
    ctx.font = '600 22px ' + titleFont;
    ctx.fillStyle = isDark ? '#cbd0ff' : '#5b5f6b';
    ctx.fillText(label, pad, 74);

    // rows
    var y = 170;
    var maxRows = 9;
    var shown = games.slice(0, maxRows);
    ctx.textBaseline = 'alphabetic';
    ctx.font = ('500 20px ' + (fbody ? '"' + fbody.split(',')[0].replace(/"/g, '') + '", sans-serif' : '"Segoe UI", sans-serif'));
    for (var i = 0; i < shown.length; i++) {
      if (y >= H - 130) break;
      var g = shown[i];
      ctx.fillStyle = fgSolid;
      var platSuff = g.platforms && g.platforms.length ? '  ·  ' + g.platforms.join(', ') : '';
      // clamp width to avoid overflow behind QR
      var t = g.title + platSuff;
      var maxW = W - pad * 2 - 190;
      var tw = ctx.measureText(t).width;
      if (tw > maxW) {
        var cut = '';
        var k = g.title.length;
        while (ctx.measureText(g.title.slice(0, k) + '…').width > maxW && k > 0) k--;
        t = (k > 0 ? g.title.slice(0, k) + '…' : g.title.slice(0, 30)) + (platSuff ? '· ' + g.platforms[0] : '');
      }
      ctx.fillText(t, pad, y);
      y += 40;
      if (y > H - 150) break;
    }

    // bottom row meta
    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = '500 14px ' + titleFont;
    ctx.fillStyle = muted;
    var host = BASE.slice(BASE.indexOf('//') + 2); // strip scheme without regex
    ctx.fillText(host + '/' + YEAR + '.html#' + monthName(m), W - pad - 190, H - 30);
    ctx.restore();

    // QR (bottom right) - only if lib loaded
    if (qrLib) {
      var q = qrLib(4, 'L');
      q.addData(url);
      q.make();
      var sz = q.getModuleCount(), px = 4, qw = sz * px, qx = W - pad - qw, qy = H - pad - qw;
      ctx.fillStyle = isDark ? '#fff' : '#1a1a1a';
      ctx.fillRect(qx, qy, qw, qw);
      ctx.fillStyle = isDark ? '#171238' : '#ffffff';
      for (var rr = 0; rr < sz; rr++)
        for (var cc = 0; cc < sz; cc++)
          if (q.isDark(rr, cc)) ctx.fillRect(qx + cc * px, qy + rr * px, px, px);
      // corner caption
    }
    return { dataUrl: canvas.toDataURL('image/png'), gamesCount: games.length, url: url };
  }

  // ---------- lazy qrcode script ----------
  function ensureQr() {
    return new Promise(function (resolve, reject) {
      if (qrLib) return resolve();
      if (window['qrcode']) { qrLib = window.qrcode; return resolve(); }
      var s = document.createElement('script');
      s.src = ${JSON.stringify(QR_CDN)};
      s.onload = function () { qrLib = window.qrcode; resolve(); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function buildPreview(dCell, dataUrl) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'share-overlay';
      overlay.innerHTML =
        '<div class="backdrop" data-share-close></div>' +
        '<div class="panel" role="dialog" aria-modal="true"><button type="button" class="close" data-share-close>×</button>' +
        '<img alt="Share preview" crossorigin="anonymous">' +
        '<div class="actions"><a class="download btn">Download PNG</a></div></div>';
      document.body.appendChild(overlay);
      overlay.querySelector('[data-share-close="true"]');
      overlay.addEventListener('click', function (e) {
        if (e.target && (e.target.hasAttribute('data-share-close') || e.target.closest('[data-share-close]'))) close();
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    }
    var img = overlay.querySelector('img');
    img.src = dataUrl;
    var dl = overlay.querySelector('.download');
    dl.setAttribute('download', 'share-' + (dCell.getAttribute('data-label') || 'day').toLowerCase().replace(/\\s+/g, '-') + '.png');
    dl.href = dataUrl;
    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');
  }
  function close() {
    if (overlay) overlay.style.display = 'none';
    document.body.classList.remove('modal-open');
  }

  function doShare(dCell) {
    if (!dCell) return;
    ensureQr().then(function () {
      return loadFonts();
    }).then(function () {
      try {
        var r = draw(dCell);
        buildPreview(dCell, r.dataUrl);
      } catch (e) {
        console.error('share poster error', e);
      }
    }).catch(function () {
      // offline/ no QR -> still allow poster without QR
      try {
        var r2 = draw(dCell);
        buildPreview(dCell, r2.dataUrl);
      } catch (e2) { console.error(e2); }
    });
  }

  // ---------- global click delegation ----------
  document.addEventListener('click', function (e) {
    var trg = e.target && e.target.closest ? e.target.closest('[data-share-date]') : null;
    var oc = e.target && e.target.closest ? e.target.closest('[data-share-ovclose]') : null;
    if (oc) { close(); return; }
    if (trg) {
      e.preventDefault(); e.stopPropagation();
      var date = trg.getAttribute('data-share-date');
      var cell = date ? byDate(date) : cellNode(trg);
      doShare(cell || trg);
    }
  });
})();
</script>`;
}

module.exports = { makeShareClient };