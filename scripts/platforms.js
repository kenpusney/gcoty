// Platform name normalization for Game Calendar data.
//
// GameInformer has changed platform labels over the years (PS4 -> PlayStation 4,
// 360 -> Xbox 360, ...) and the raw scrape occasionally leaks parentheses, e.g.
// " (Switch 2)" or "(PlayStation 5".
//
// This mapping is intentionally a standalone, editable table: when GameInformer
// changes how platforms are written, add/update an entry here instead of
// touching the scraper.

const ALIASES = {
  // PC-ish
  "Steam": "PC",
  "PC Early Access": "PC",
  // PlayStation
  "PS5": "PlayStation 5",
  "PS4": "PlayStation 4",
  "PS3": "PlayStation 3",
  "Vita": "PlayStation Vita",
  "PSVR": "PlayStation VR",
  // Case fixes / Xbox legacy names
  "XBox One": "Xbox One",
  "Retail - Xbox One": "Xbox One",
  "360": "Xbox 360",
  "Xbox Series X|S": "Xbox Series X/S",
  // Nintendo stores
  "3DS eShop": "3DS",
  "3DS Retail": "3DS",
  // VR
  "Oculus": "Rift",
};

// Identity entries (kept explicit so the full vocabulary is visible in one place).
const IDENTITY = [
  "PC", "Mac", "Linux", "iOS", "Android", "Windows Phone",
  "PlayStation 5", "PlayStation 4", "PlayStation 3",
  "Xbox One", "Xbox Series X/S", "Xbox 360",
  "Switch", "Switch 2", "Wii U", "Wii", "3DS",
  "PlayStation Vita", "PlayStation VR", "PlayStation VR2",
  "Rift", "Vive", "Quest", "Quest 2", "Quest 3", "Gear VR",
  "Stadia", "NES", "SNES Classic",
];

const LOOKUP = new Map();
for (const k of Object.keys(ALIASES)) LOOKUP.set(k, ALIASES[k]);
for (const k of IDENTITY) LOOKUP.set(k, k);
for (const [k, v] of LOOKUP) LOOKUP.set(k.toLowerCase(), v);

// Strip parentheses / stray whitespace leaked from the scraped markup.
function clean(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  s = s.replace(/^[(\s]+|[)\s]+$/g, "").trim();
  return s || null;
}

/** Normalize one platform label; returns null for empty input. */
function normalizePlatform(raw) {
  const s = clean(raw);
  if (!s) return null;
  return LOOKUP.get(s) || LOOKUP.get(s.toLowerCase()) || s;
}

/** Normalize a platform list, dropping empties and de-duping (order preserved). */
function normalizePlatformList(list) {
  const out = [];
  for (const raw of list || []) {
    const n = normalizePlatform(raw);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

// --- Platform families -----------------------------------------------------
// For UI purposes platforms are grouped into families shown as a single brand
// icon (merged when a game ships on several family members, e.g. "Switch",
// "Switch 2"). The icon is a Bootstrap Icons class.

const FAMILIES = [
  { id: "pc",          icon: "bi-pc-display",    members: ["PC", "Linux"] },
  { id: "apple",       icon: "bi-apple",         members: ["Mac", "iOS"] },
  { id: "android",     icon: "bi-android",       members: ["Android"] },
  { id: "windows",     icon: "bi-windows",       members: ["Windows Phone"] },
  { id: "playstation", icon: "bi-playstation",   members: ["PlayStation 5", "PlayStation 4", "PlayStation 3", "PlayStation Vita", "PlayStation VR", "PlayStation VR2"] },
  { id: "xbox",        icon: "bi-xbox",          members: ["Xbox One", "Xbox Series X/S", "Xbox 360"] },
  { id: "nintendo",    icon: "bi-nintendo-switch", members: ["Switch", "Switch 2", "Wii U", "Wii", "3DS", "NES", "SNES Classic"] },
  { id: "vr",          icon: "bi-headset-vr",    members: ["Rift", "Vive", "Quest", "Quest 2", "Quest 3", "Gear VR"] },
  { id: "stadia",      icon: "bi-google",        members: ["Stadia"] },
];

const FAMILY_BY_PLATFORM = new Map();
for (const fam of FAMILIES) {
  for (const member of fam.members) FAMILY_BY_PLATFORM.set(member, fam);
}

/** Family id for a (already normalized) platform, or null when unknown. */
function familyOf(platform) {
  const fam = FAMILY_BY_PLATFORM.get(platform);
  return fam ? fam.id : null;
}

/**
 * Group normalized platform names into families for icon display.
 * @param {string[]} platforms normalized platform names
 * @returns {Array<{family:string, icon:string|null, names:string[]}>}
 *          known families in FAMILIES order, unknown ones appended last (icon null)
 */
function groupByFamily(platforms) {
  const byId = new Map();
  const unknown = [];
  for (const raw of platforms || []) {
    const p = normalizePlatform(raw);
    if (!p) continue;
    const fam = FAMILY_BY_PLATFORM.get(p);
    if (!fam) {
      const u = unknown.find((x) => x.names[0] === p);
      if (u) u.names.push(p);
      else unknown.push({ family: "other", icon: null, names: [p] });
      continue;
    }
    let g = byId.get(fam.id);
    if (!g) {
      g = { family: fam.id, icon: fam.icon, names: [] };
      byId.set(fam.id, g);
    }
    g.names.push(p);
  }
  return [...byId.values(), ...unknown];
}

module.exports = {
  normalizePlatform,
  normalizePlatformList,
  clean,
  ALIASES,
  IDENTITY,
  FAMILIES,
  familyOf,
  groupByFamily,
};