// Per-day share poster — main loop convert real DOM to PNG (html-to-image).
// Unlike an earlier hand-drawn-canvas version, this captures the actual page
// markup, so themes / webfonts / Bootstrap Icons / autowrap are rendered by
// the engine and stay pixel-accurate.
//
// Client flow:
//   1) click a [data-share-date] (desktop button or modal header button)
//   2) lazily load html-to-image + qrcode-generator (CDN), wait for webfonts
//   3) build an offscreen portrait .share-poster using the real day's list,
//      draw its QR from BOOTSTRAP? no — from the provided lib into an <img>
//   4) toPng(poster, {fontEmbedCSS}); show a preview modal, allow Download PNG

const QR_CDN =
  "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";
const H2I_CDN =
  "https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js";

function makeShareClient({ base, pageYear }) {
  const MONTHS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];
  const MBASE = String(base).replace(/\/+$/, "");
  const YEAR = Number(pageYear);
  const MONTHS_JSON = JSON.stringify(MONTHS);
  const MBASE_JSON = JSON.stringify(MBASE);

  return `<script>
(function () {
  var YEAR = ${YEAR};
  var MBASE = ${MBASE_JSON};
  var MONTHS = ${MONTHS_JSON};

  var qrLib = null, h2i = null, fontEmbed = null;
  var overlay = null;

  function cssVar(name) {
    return (getComputedStyle(document.documentElement).getPropertyValue(name) || '').trim();
  }
  function nodeOf(el) { return el && el.closest ? el.closest('.day-cell') : (el || null); }
  function byDate(ds) { return document.querySelector('.day-cell[data-date="' + ds + '"]'); }
  function monthId(m) { return MONTHS[m - 1]; }
  function shareUrl(m) { return MBASE + '/' + YEAR + '.html#' + monthId(m); }
  function postLabel() { return MBASE.replace(/^https?:\\/\\//, '') + '/' + YEAR + '.html#'; }

  // ---------- poster (a DOM tree we then render via html-to-image) ----------
  function buildPoster(dCell) {
    var label = dCell.getAttribute('data-label') || '';
    var month = parseInt(dCell.getAttribute('data-month') || '1', 10) || 1;

    var host = document.createElement('div');
    host.className = 'share-poster';
    host.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') || 'paper');
    host.setAttribute('data-label', (label || 'day').toLowerCase());
    host.innerHTML =
      '<header class="sp-head"><span class="sp-kicker">Game Calendar</span>' +
      '<span class="sp-date">' + escape(label) + '</span></header>' +
      '<ul class="sp-list"></ul>' +
      '<footer class="sp-foot"><span>source: Game Informer</span></footer>';
    // reuse real games markup (titles full width, platform icons via .bi)
    var srcList = dCell.querySelector('.games');
    var ul = host.querySelector('.sp-list');
    if (srcList) {
      srcList.querySelectorAll('li').forEach(function (li) { ul.appendChild(li.cloneNode(true)); });
    }
    return { host: host, month: month, label: escape(label) };
  }
  function escape(t) {
    return String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function qrImg(url) {
    if (!qrLib) return null;
    var q = qrLib(4, 'L');
    q.addData(url); q.make();
    var n = q.getModuleCount(); var px = 4; var size = n * px;
    var cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    var c = cv.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, size, size);
    c.fillStyle = '#161336' /* QR modules dark, readable on light box */;
    for (var r = 0; r < n; r++) for (var col = 0; col < n; col++) if (q.isDark(r, col)) c.fillRect(col * px, r * px, px, px);
    var img = document.createElement('img');
    img.className = 'sp-qr';
    img.alt = url;
    img.src = cv.toDataURL('image/png');
    return img;
  }

  // ---------- preview modal ----------
  function close() {
    if (overlay) overlay.style.display = 'none';
    document.body.classList.remove('modal-open');
  }
  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'share-overlay';
    overlay.innerHTML =
      '<div class="backdrop" data-share-close></div>' +
      '<div class="panel"><button type="button" class="close" data-share-close>×</button>' +
      '<img class="preview" alt="Share preview">' +
      '<div class="actions"><a class="download" download="share.png">Download PNG</a></div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) {
      if (e.target && (e.target.closest('[data-share-close]') || e.target.hasAttribute('data-share-close'))) close();
    });
    document.addEventListener('keydown', function (k) { if (k.key === 'Escape') close(); });
    return overlay;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { resolve(); }; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function doShare(dCell) {
    if (!dCell) return;
    var month = parseInt(dCell.getAttribute('data-month') || '1', 10) || 1;
    var url = shareUrl(month);
    var soon = [];
    if (!qrLib) soon.push(loadScript(${JSON.stringify(QR_CDN)}).then(function(){ qrLib = window.qrcode; }));
    if (!h2i) soon.push(loadScript(${JSON.stringify(H2I_CDN)}).then(function(){ h2i = window.htmlToImage; }));

    Promise.all(soon)
      .then(function () {
        var b = buildPoster(dCell);
        var qr = qrImg(url);
        if (qr) b.host.querySelector('.sp-foot').appendChild(qr);
        document.body.appendChild(b.host); // offscreen (CSS left:-99999px, has layout)
        return (document.fonts && document.fonts.ready) ? document.fonts.ready.then(function(){ return b; }) : Promise.resolve(b);
      })
      .then(function (b) {
        try {
          var dispF = cssVar('--font-display');
          var bodyF = cssVar('--font-body');
          if (document.fonts && document.fonts.load) {
            if (bodyF) document.fonts.load('600 16px ' + bodyF);
            if (dispF) document.fonts.load('800 24px ' + dispF);
            document.fonts.load('600 16px "bootstrap-icons"');
          }
          if (document.fonts && document.fonts.ready) return document.fonts.ready.then(function () { return b; });
        } catch (e) { /* best-effort */ }
        return Promise.resolve(b);
      })
      .then(function (b) {
        return Promise.resolve(fontEmbed ? fontEmbed : h2i.getFontEmbedCSS(b.host).then(function (css) { fontEmbed = css; return css; }));
      })
      .then(function (css) {
        var host = document.body.querySelector('.share-poster');
        return h2i.toPng(host, { cacheBust: true, fontEmbedCSS: css, pixelRatio: 2 });
      })
      .then(function (dataUrl) {
        var host = document.body.querySelector('.share-poster');
        var label = (host && host.getAttribute('data-label')) || 'share';
        if (host && host.parentNode) host.parentNode.removeChild(host);
        var o = ensureOverlay();
        var img = o.querySelector('img.preview');
        img.src = dataUrl;
        var dl = o.querySelector('.download');
        dl.href = dataUrl;
        dl.setAttribute('download', label.split(' ').join('-').toLowerCase() + '.png');
        o.style.display = 'flex';
        document.body.classList.add('modal-open');
      })
      .catch(function (err) { console.error('share poster failed', err); });
  }

  document.addEventListener('click', function (e) {
    var shareE = e.target && e.target.closest ? e.target.closest('[data-share-date]') : null;
    if (shareE) {
      e.preventDefault(); e.stopPropagation();
      var date = shareE.getAttribute('data-share-date');
      doShare(date ? byDate(date) : nodeOf(shareE));
    }
  });
})();
</script>`;
}

module.exports = { makeShareClient };