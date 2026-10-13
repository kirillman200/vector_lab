import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../public/js/svg-utils.js", import.meta.url), "utf8");
const { parseSvgLength, getSvgBaseSize, getPngExportSize } = vm.runInNewContext(`${source}\n;({ parseSvgLength, getSvgBaseSize, getPngExportSize });`);
const svg = (attrs) => ({ getAttribute: (name) => attrs[name] ?? null });
const plain = (value) => JSON.parse(JSON.stringify(value));

test("absolute SVG units resolve to CSS pixels", () => {
  for (const length of ["96", "96px", "1in", "2.54cm", "25.4mm", "101.6Q", "72pt", "6pc", " 1e0in "]) {
    assert.ok(Math.abs(parseSvgLength(length) - 96) < 1e-9, length);
  }
});

test("unresolved or malformed lengths use the viewBox fallback", () => {
  for (const length of [null, "", "50%", "2em", "3rem", "calc(100% - 1px)", "12garbage", "Infinity", "-2px", "0", "1px extra"]) {
    assert.equal(parseSvgLength(length), null, String(length));
    assert.deepEqual(plain(getSvgBaseSize(svg({ width: length, height: length, viewBox: "0 0 200 100" }))), { width: 200, height: 100 });
  }
});

test("PNG presets and custom dimensions use converted SVG proportions", () => {
  const size = getSvgBaseSize(svg({ width: "2in", height: "72pt", viewBox: "0 0 200 100" }));
  assert.deepEqual(plain(size), { width: 192, height: 96 });
  assert.deepEqual(plain(getPngExportSize(size, 2)), { width: 384, height: 192 });
  assert.deepEqual(plain(getPngExportSize(size, 1, "480", "")), { width: 480, height: 240 });
});

test("import without a viewBox uses the converted viewport without changing explicit units", () => {
  const app = readFileSync(new URL("../public/js/app.js", import.meta.url), "utf8");
  const loader = app.slice(app.indexOf("function loadSvg("), app.indexOf("/* ---------------------------------------------------------------- selection */"));
  const attrs = { width: "2in", height: "72pt" };
  const imported = {
    ...svg(attrs), tagName: "svg", dataset: {}, attributes: [],
    setAttribute(name, value) { attrs[name] = value; },
    removeAttribute(name) { delete attrs[name]; },
    querySelectorAll: () => [], addEventListener() {},
  };
  const els = { svgMount: { replaceChildren() {} }, canvasWidthInput: {}, canvasHeightInput: {} };
  const noop = () => {};
  const context = {
    state: {}, els,
    DOMParser: class { parseFromString() { return { querySelector: () => null, documentElement: imported }; } },
    document: { importNode: () => imported, createElement: () => ({ append() {} }) },
    applyBackgroundColor: noop, applySvgZoom: noop, handleSvgClick: noop, handlePointerDown: noop,
    updatePrecisionHud: noop, syncSource: noop, refreshLayers: noop, refreshInspector: noop,
    setStatus: noop,
  };
  const loaded = vm.runInNewContext(`${source}\n${loader}\nloadSvg("fixture", { fit: false, recordHistory: false });`, context);
  assert.equal(loaded, true);
  assert.equal(attrs.viewBox, "0 0 192 96");
  assert.equal(attrs.width, "2in");
  assert.equal(attrs.height, "72pt");
  assert.deepEqual(imported.dataset, { baseWidth: "192", baseHeight: "96" });
  assert.equal(els.canvasWidthInput.value, "192");
  assert.equal(els.canvasHeightInput.value, "96");
});
