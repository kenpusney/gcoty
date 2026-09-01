const { test } = require("node:test");
const assert = require("node:assert/strict");
const { normalizePlatform, normalizePlatformList, clean, groupByFamily } = require("../scripts/platforms");

test("clean: strips leaked parentheses and whitespace", () => {
  assert.equal(clean("  (Switch 2)"), "Switch 2");
  assert.equal(clean("(PlayStation 5"), "PlayStation 5");
  assert.equal(clean("  (PC)  "), "PC");
  assert.equal(clean("PC)"), "PC");
  assert.equal(clean(null), null);
  assert.equal(clean("   "), null);
});

test("normalizePlatform: aliases map to canonical names", () => {
  assert.equal(normalizePlatform("PS4"), "PlayStation 4");
  assert.equal(normalizePlatform("PS3"), "PlayStation 3");
  assert.equal(normalizePlatform("360"), "Xbox 360");
  assert.equal(normalizePlatform("Vita"), "PlayStation Vita");
  assert.equal(normalizePlatform("PSVR"), "PlayStation VR");
  assert.equal(normalizePlatform("XBox One"), "Xbox One");
  assert.equal(normalizePlatform("Steam"), "PC");
  assert.equal(normalizePlatform("PC Early Access"), "PC");
  assert.equal(normalizePlatform("3DS eShop"), "3DS");
  assert.equal(normalizePlatform("3DS Retail"), "3DS");
  assert.equal(normalizePlatform("Retail - Xbox One"), "Xbox One");
  assert.equal(normalizePlatform("Oculus"), "Rift");
});

test("normalizePlatform: identity names are kept", () => {
  for (const name of ["PC", "Switch 2", "Xbox Series X/S", "PlayStation VR2", "Quest 3", "Stadia"]) {
    assert.equal(normalizePlatform(name), name);
  }
});

test("normalizePlatform: unknown names survive unchanged (extensibility)", () => {
  assert.equal(normalizePlatform("Xbox One Switch"), "Xbox One Switch");
  assert.equal(normalizePlatform("Future Console"), "Future Console");
});

test("normalizePlatform: empty input yields null", () => {
  assert.equal(normalizePlatform(null), null);
  assert.equal(normalizePlatform(""), null);
  assert.equal(normalizePlatform("  ) "), null);
});

test("normalizePlatformList: dedupes, drops empties, preserves order", () => {
  const out = normalizePlatformList(["PC", " (PC)", "", "PS4", "Steam", "360", "PlayStation 4"]);
  assert.deepEqual(out, ["PC", "PlayStation 4", "Xbox 360"]);
  assert.deepEqual(normalizePlatformList([]), []);
  assert.deepEqual(normalizePlatformList(["", null, "   "]), []);
});

test("groupByFamily: merges same-family members into one icon group", () => {
  const groups = groupByFamily(["Switch 2", "Switch", "PS4", "Xbox One", "PS5"]);
  assert.equal(groups.length, 3); // nintendo, playstation, xbox
  assert.equal(groups[0].family, "nintendo");
  assert.equal(groups[0].icon, "bi-nintendo-switch");
  assert.deepEqual(groups[0].names, ["Switch 2", "Switch"]);
  assert.equal(groups[1].family, "playstation");
  assert.equal(groups[1].icon, "bi-playstation");
  assert.deepEqual(groups[1].names, ["PlayStation 4", "PlayStation 5"]); // normalized, input order kept
  assert.equal(groups[2].family, "xbox");
});

test("groupByFamily: family output follows FAMILIES order", () => {
  const groups = groupByFamily(["iOS", "Android", "Windows Phone", "Rift", "Quest", "Stadia"]);
  assert.deepEqual(groups.map((g) => g.family), ["apple", "android", "windows", "vr", "stadia"]);
  assert.equal(groups.find((g) => g.family === "vr").icon, "bi-headset-vr");
  assert.equal(groups.find((g) => g.family === "stadia").icon, "bi-google");
});

test("groupByFamily: unknown platforms are kept with no icon", () => {
  const groups = groupByFamily(["PC", "Xbox One Switch", "Future Console"]);
  assert.equal(groups[0].family, "pc");
  assert.equal(groups[0].icon, "bi-pc-display");
  assert.equal(groups[1].family, "other");
  assert.equal(groups[1].icon, null);
  assert.deepEqual(groups.slice(1).map((g) => g.names), [["Xbox One Switch"], ["Future Console"]]);
  assert.deepEqual(groupByFamily([]), []);
});