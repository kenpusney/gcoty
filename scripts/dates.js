// Tolerant parsing of GameInformer releaseDate strings.
//
// Known shapes seen in the historical data (2016-2027):
//   "January 5"                       -> Jan 5
//   "June27"                          -> Jun 27 (missing space)
//   "May 5 (May 3 for pre-orders)"    -> May 5  (suffix dropped)
//   "July 12 (PS Plus Members)"       -> Jul 12 (suffix dropped)
//   "unconfirmed" / "" / undefined    -> TBA
//   "PC" (platform leaked into date)  -> invalid -> treated as TBA by callers
// Month labels support full names and 3-letter abbreviations so the parser can
// survive small changes in GameInformer's markup.

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Map a month label (full or 3-letter) to 1..12; -1 when unknown. */
function monthIndex(label) {
  if (!label) return -1;
  const l = String(label).toLowerCase();
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (l === MONTH_NAMES[i].toLowerCase() || MONTH_NAMES[i].toLowerCase().startsWith(l)) {
      return i + 1;
    }
  }
  return -1;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * @param {*} raw   raw releaseDate value from a data file
 * @param {number} year  the calendar year this entry belongs to
 * @returns {{ok:true, year:number, month:number, day:number, label:string, date:Date, raw:*}
 *        | {ok:false, kind:"tba"|"invalid", raw:*}}
 */
function parseDate(raw, year) {
  if (raw == null) return { ok: false, kind: "tba", raw: null };
  const s = String(raw).trim();
  if (!s) return { ok: false, kind: "tba", raw };
  if (/^unconfirmed$/i.test(s)) return { ok: false, kind: "tba", raw };

  const m = /^([A-Za-z]+)\s*(\d{1,2})/.exec(s);
  if (!m) return { ok: false, kind: "invalid", raw };

  const month = monthIndex(m[1]);
  const day = Number(m[2]);
  if (month < 1 || day < 1 || day > daysInMonth(year, month)) {
    return { ok: false, kind: "invalid", raw };
  }

  const label = `${MONTH_NAMES[month - 1]} ${day}`;
  return {
    ok: true,
    year,
    month,
    day,
    label,
    raw,
    date: new Date(year, month - 1, day),
  };
}

function monthLabel(month) {
  return MONTH_NAMES[month - 1];
}

module.exports = { MONTH_NAMES, parseDate, monthIndex, monthLabel, daysInMonth };