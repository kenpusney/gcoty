// Per-day share poster — canvas, drawn with the REAL typefaces/glyphs.
//
// Rationale: html-to-image was blank in this environment (cross-origin sheet
// + serialization), so we go back to a controlled canvas. Instead of drawing
// cartoon logos, each platform icon is rendered with its actual
// "bootstrap-icons" glyph (char code resolved from the loaded stylesheet) and
// the poster type uses the theme's real display/body fonts. All colours read
// the active theme tokens, so the PNG mirrors the chosen theme.

// CDN:<script>lazy
const QR_CDN =
  "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";

function makeShareClient({ base, pageYear }) {
  const MONTHS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];
  const MBASE = String(base).replace(/\/+$/, "");
  const YEAR = Number(pageYear);

  return `<script>
(function () {
  var MONTHS = ${JSON.stringify(MONTHS)};
  var MBASE = ${JSON.stringify(MBASE)};
  var YEAR = ${YEAR};
  var qrLib = null, overlay = null, cssIconCache = {};
  var DARK = (document.documentElement.getAttribute('data-theme') || '') === 'void';
  // deterministic glyph codepoints for the platform/VR families we use as a
  // primary source (bootstrap-icons), fall back to stylesheet probe otherwise.
  var GS = Object.freeze({
    'bi-pc-display': 0xf6a6, 'bi-apple': 0xf65b, 'bi-android': 0xf7d0,
    'bi-windows': 0xf65e, 'bi-playstation': 0xf6a9, 'bi-xbox': 0xf6d4,
    'bi-nintendo-switch': 0xf6a4, 'bi-headset-vr': 0xf645, 'bi-google': 0xf3f0,
    'bi-share': 0xf52e, 'bi-controller': 0xf2d4, 'bi-moon': 0xf497, 'bi-sun': 0xf5a2
  });

  function cssVar(n) { return (getComputedStyle(document.documentElement).getPropertyValue(n) || '').trim(); }
  function byDate(ds) { return document.querySelector('.day-cell[data-date="' + ds + '"]'); }
  function nodeOf(el) { return el && el.closest ? el.closest('.day-cell') : el; }
  function esc(s) { return String(s == null ? '' : s); }
  function monthId(m) { return MONTHS[m - 1]; }
  function shareUrl(m) { return MBASE + '/' + YEAR + '.html#' + monthId(m); }

  // lightest readable hex from --bg / --card, else default per theme
  function flatBg() {
    var bg = cssVar('--bg') || '';
    var m2 = /#[0-9a-fA-F]{6}/.exec(bg);
    if (m2) return m2[0];
    return DARK ? '#181440' : '#f6f0e4';
  }
  function firstToken(v, dflt) {
    if (!v) return dflt;
    return v.split(',')[0].trim().replace(/["']/g, '');
  }
  function qFont(name) { return /\\s/.test(name) ? '"' + name + '"' : name; }

  // Resolve a Bootstrap icon glyph from the loaded stylesheet (CORS-enabled)
  // e.g. class "bi-playstation" -> "\\f1xx".
  // Resolve a glyph char for an icon class: prefer the hardcoded GS table,
  // else probe the loaded stylesheet (CORS-enabled) and cache the result.
  function iconCode(cls) {
    var css = (cls && cls.indexOf('bi-') === 0) ? cls : 'bi-' + cls;
    if (cssIconCache[css]) return cssIconCache[css];
    var cp = GS[css];
    if (cp) { var ch1 = String.fromCodePoint(cp); cssIconCache[css] = ch1; return ch1; }
    var out = '';
    var sheets = (document.styleSheets || []);
    for (var i = 0; i < sheets.length && !out; i++) {
      var rules = null;
      try { rules = sheets[i].cssRules; } catch (e) { rules = null; }
      for (var r = 0; r < (rules ? rules.length : 0) && !out; r++) {
        var cs = rules[r];
        if (cs.selectorText && cs.selectorText.replace('::', ':').indexOf('.' + css + ':before') >= 0) {
          var cdel = cs.style.content || '';
          var m = /([0-9a-fA-F]{4,5})/.exec(cdel);
          if (m) out = String.fromCodePoint(parseInt(m[1], 16));
          else { var mt = cdel.match(/"([^"]+)"/); if (mt) out = mt[1]; }
        }
      }
    }
    cssIconCache[css] = out;
    return out;
  }

  // Gather one day's rows: title text + platform family classes per li.
  function readRows(ul) {
    var rows = [];
    if (!ul) return rows;
    ul.querySelectorAll('li').forEach(function (li) {
      var a = li.querySelector('a');
      var title = (a ? (a.textContent || '') : (li.textContent || '')).trim();
      var icons = [];
      li.querySelectorAll('.platform-icons i.bi').forEach(function (ic) {
        var m = (/\\bbi-([a-z0-9-]+)/).exec(ic.className || '');
        if (m) icons.push({ cls: 'bi-' + m[1] });
      });
      if (!icons.length) {
        // no icon resolution: fall back to plain text platforms
        var txt = (li.querySelector('.platform-icons') || {}).textContent || '';
        if (txt) icons = [{ text: txt.trim() }];
      }
      if (title) rows.push({ title: title, icons: icons });
    });
    return rows;
  }

  // layout title into several lines for a width (word-greedy, single words pass)
  function wrap(ctx, text, maxW) {
    var lines = [], line = '';
    function pushHard(word) {
      if (ctx.measureText(word).width <= maxW) { lines.push(word); return; }
      var cur = '';
      for (var i = 0; i < word.length; i++) {
        if (ctx.measureText(cur + word[i]).width > maxW) { lines.push(cur); cur = word[i]; }
        else cur += word[i];
      }
      if (cur) lines.push(cur);
    }
    var words = String(text == null ? '' : text).split(' ');
    for (var w = 0; w < words.length; w++) {
      if (!words[w]) continue;
      var cand = line ? line + ' ' + words[w] : words[w];
      if (line && ctx.measureText(cand).width > maxW) {
        lines.push(line);
        line = '';
        pushHard(words[w]);
      } else { line = cand; }
    }
    if (line) lines.push(line);
    return lines;
  }

  // lazy QR lib
  function ensureQr() {
    return new Promise(function (resolve, reject) {
      if (qrLib) return resolve();
      if (window.qrcode) { qrLib = window.qrcode; return resolve(); }
      var s = document.createElement('script');
      s.src = ${JSON.stringify(QR_CDN)};
      s.onload = function () { qrLib = window.qrcode; resolve(); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function drawQR(ctx, x, y, url) {
    var q = qrLib(4, 'L'); q.addData(url); q.make();
    var p = 6; // quiet-zone cells in px units below given px
    var px = 3, mods = q.getModuleCount(), side = mods * px + 2 * p;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, side, side); // readable on any theme
    ctx.fillStyle = '#11122b';
    for (var r = 0; r < mods; r++) for (var c = 0; c < mods; c++)
      if (q.isDark(r, c)) ctx.fillRect(x + p + c * px, y + p + r * px, px, px);
  }

  function build(dCell, cb) {
    var dateLabel = dCell.getAttribute('data-label') || '';
    var month = parseInt(dCell.getAttribute('data-month') || '1', 10) || 1;
    var rows = readRows(dCell.querySelector('.games'));
    var url = shareUrl(month);

    var displayD = firstToken(cssVar('--font-display'), 'Newsreader');
    var bodyD = firstToken(cssVar('--font-body'), 'Newsreader');
    var iconF = 'bootstrap-icons';

    var bg = flatBg();
    var fg = cssVar('--fg') || '#' + (DARK ? 'efeefc' : '26241f');
    var muted = cssVar('--muted');
    var accent = (cssVar('--accent') || (DARK ? '#e879f9' : '#1f6f54'));
    var accent2 = (cssVar('--accent2') || accent);

    var W = 640;             // narrower portrait
    var pad = 42;
    var headerH = 128;
    var bottomH = 150;
    var titleSize = 19;                 // game titles
    var titleLH = 25;                   // line pitch inside a wrapped title
    var iconSize = 12;                  // platform glyphs — must stay < titleSize
    var noIconGap = 10;                 // bottom margin rows without icons
    var iconGap = 17;                   // reserved below title block for icons + gap
    var bodyW = W - pad * 2;

    var tmp = document.createElement('canvas').getContext('2d');
    tmp.font = '600 ' + titleSize + 'px ' + qFont(bodyD) + ', sans-serif';

    // pass 1 — deterministic layout (title lines + per-row height)
    var starts = [], nLines = [], rowH = [], total = headerH;
    rows.forEach(function (row, ri) {
      starts.push(total);
      var L = wrap(tmp, row.title, bodyW).length;
      var hasI = row.icons && row.icons.length;
      nLines.push(L);
      var rh = L * titleLH + (hasI ? iconGap + 2 : noIconGap);
      rowH.push(rh);
      total += rh;
    });
    var H = total + bottomH;

    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var c = cv.getContext('2d');

    // base
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    var grad = c.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, accent); grad.addColorStop(1, accent2);
    c.fillStyle = grad; c.fillRect(0, 0, W, 6);
    // kicker + date
    c.textBaseline = 'alphabetic';
    c.font = '800 34px ' + qFont(displayD) + ', sans-serif';
    c.fillStyle = fg;
    c.fillText('Game Calendar', pad, 44);
    c.font = '700 22px ' + qFont(bodyD) + ', sans-serif';
    c.fillStyle = muted;
    c.fillText(dateLabel + ', ' + YEAR, pad, 76);
    c.strokeStyle = accent; c.lineWidth = 2; c.beginPath(); c.moveTo(pad, 112); c.lineTo(W - pad, 112); c.stroke();

    // pass 2 — paint rows on the computed starts
    var bodyF = '600 ' + titleSize + 'px ' + qFont(bodyD) + ', sans-serif';
    rows.forEach(function (row, ri) {
      var top0 = starts[ri];
      var lines = wrap(c, row.title, bodyW);
      var tb = top0 + titleSize;
      c.font = bodyF;
      lines.forEach(function (ln) { c.fillStyle = fg; c.fillText(ln, pad, tb); tb += titleLH; });
      var gY = top0 + nLines[ri] * titleLH + 10;   // platform baseline below the title block
      var ix = pad, okP = 0;
      for (var z = 0; z < row.icons.length; z++) {
        var ic = row.icons[z];
        if (ic.text) {
          c.font = bodyF; c.fillStyle = muted;
          var gw2 = c.measureText(ic.text).width;
          c.fillStyle = muted; c.textAlign = 'left'; c.fillText(ic.text, ix, gY + 22);
          ix += gw2 + 14; continue;
        }
        var glyph = iconCode(ic.cls);
        if (!glyph) continue;
        c.font = '400 ' + iconSize + 'px ' + qFont(iconF);
        c.fillStyle = accent2;
        c.fillText(glyph, ix, gY);
        var gw = c.measureText(glyph).width;
        ix += gw + 9; okP++;
      }
      void okP;
      c.font = bodyF;
    });

    // footer caption (left) — official base url (scheme stripped)
    var fy = H - bottomH + 22;
    c.font = '600 14px ' + qFont(bodyD) + ', sans-serif';
    c.fillStyle = muted;
    var hostDot = MBASE.indexOf('//') >= 0 ? MBASE.slice(MBASE.indexOf('//') + 2) : MBASE;
    c.fillText(hostDot, pad, fy);
    // divider
    c.strokeStyle = accent; c.globalAlpha = .35; c.lineWidth = 1;
    c.beginPath(); c.moveTo(pad, H - bottomH + 8); c.lineTo(W - pad, H - bottomH + 8); c.stroke();
    c.globalAlpha = 1;

    // QR bottom-right
    if (qrLib) { drawQR(c, W - pad - 150, H - bottomH + 10, url); }
    else { c.fillStyle = muted; c.save(); c.translate(W - pad - 110, H - bottomH + 30); c.rotate(-.5); c.fillText('offline QR', 0, 0); c.restore(); }

    return { canvas: cv, dataUrl: cv.toDataURL('image/png'), label: dateLabel, url: url };
  }

  // overlay preview + download
  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'share-overlay';
    overlay.innerHTML =
      '<div class="backdrop" data-share-close></div>' +
      '<div class="panel"><button type="button" class="close" data-share-close>&times;</button>' +
      '<img class="preview" alt="Share preview">' +
      '<div class="actions"><a class="download" download="share.png">Download PNG</a></div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) {
      if (e.target && (e.target.closest('[data-share-close]') || e.target.hasAttribute('data-share-close'))) close();
    });
    document.addEventListener('keydown', function (k) { if (k.key === 'Escape') close(); });
    return overlay;
  }
  function close() { if (overlay) overlay.style.display = 'none'; document.body.classList.remove('modal-open'); }
  function show(dataUrl, label) {
    var o = ensureOverlay();
    o.style.display = 'flex';
    var img = o.querySelector('img.preview');
    img.src = dataUrl;
    var dl = o.querySelector('.download');
    dl.href = dataUrl;
    dl.setAttribute('download', (label ? label.split(' ').join('-') : 'share').toLowerCase() + '.png');
    document.body.classList.add('modal-open');
  }

  function okFont() {
    return new Promise(function (ok) {
      var asked = [];
      function ask(n) { try { if (document.fonts && document.fonts.load) document.fonts.load('600 16px ' + n).then(function(){ ok(); }); else ok(); } catch (e) { ok(); } }
      var have = new Set();
      var f = cssVar('--font-display') + ', ' + cssVar('--font-body');
      f.split(',').forEach(function (t) { var name = t.trim().replace(/["']/g, ''); if (name && !have.has(name)) { have.add(name); asked.push(name); } });
      if (!asked.length) return ok();
      var count = asked.length, done = 0, finish = function () { done++; if (done === count) ok(); };
      asked.forEach(function (n) { try { document.fonts.load('600 16px "' + n.replace(/"/g, '') + '"').then(finish, finish); } catch (e) { finish(); } });
      try { document.fonts.load('600 16px "bootstrap-icons"'); } catch (e) {}
      // hard cap
      setTimeout(ok, 700);
    });
  }

  function doShare(dCell) {
    if (!dCell) return;
    var month = parseInt(dCell.getAttribute('data-month') || '1', 10) || 1;
    var url = shareUrl(month);
    ensureQr()
      .then(function () { return okFont(); })
      .then(function () {
        var r = build(dCell);
        show(r.dataUrl, r.label);
      })
      .catch(function (err) { console.error('share poster failed', err); });
  }

  document.addEventListener('click', function (e) {
    var trg = e.target && e.target.closest ? e.target.closest('[data-share-date]') : null;
    if (trg) { e.preventDefault(); e.stopPropagation(); var d = trg.getAttribute('data-share-date'); doShare(d ? byDate(d) : nodeOf(trg)); }
  });
})();
</script>`;
}

module.exports = { makeShareClient };