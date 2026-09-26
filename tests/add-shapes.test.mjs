import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const app = readFileSync(new URL("../public/js/app.js", import.meta.url), "utf8");
const source = app.slice(app.indexOf("function addBasicShape("), app.indexOf("function revealAddedObject("));
function add(kind, frame = { x: 0, y: 0, width: 24, height: 24 }) {
  let inserted;
  const inputs = new Proxy({}, { get: (_, key) => ({ value: key === "strokeWidthInput" ? "0" : "#276ef1" }) });
  const context = {
    state: { svg: {}, tool: "select" }, els: inputs, SVG_NS: "http://www.w3.org/2000/svg",
    getCanvasFrame: () => frame, round: (n) => Math.round(n * 1000) / 1000,
    document: { createElementNS: (_, tag) => ({ tag, attrs: {}, setAttribute(key, value) { this.attrs[key] = String(value); } }) },
    insertVector: (node) => { inserted = node; }, setSelection() {}, afterMutation() {}, setStatus() {},
    trackEditorAction() {}, setTool() {}, revealAddedObject() {},
  };
  vm.runInNewContext(`${source}\naddBasicShape(${JSON.stringify(kind)});`, context);
  return inserted;
}
test("added shapes fit small SVG viewBoxes", () => {
  const rect = add("rect");
  assert.ok(Number(rect.attrs.width) <= 24 && Number(rect.attrs.height) <= 24);
  assert.ok(Number(rect.attrs.x) >= 0 && Number(rect.attrs.y) >= 0);
});
test("adding a line after a zero-stroke object produces a visible stroke", () => {
  const line = add("line");
  assert.ok(Number(line.attrs["stroke-width"]) > 0);
});

test("new icons insert editable paths rather than unknown SVG elements", () => {
  for (const kind of ["arrow", "bolt", "plus", "diamond", "tag", "pin"]) {
    const node = add(kind);
    assert.equal(node.tag, "path");
    assert.match(node.attrs.d, /^M /);
    assert.doesNotMatch(node.attrs.d + node.attrs.transform, /undefined|NaN|Infinity/);
    assert.equal(node.attrs["fill-rule"], "evenodd");
  }
  assert.equal(add("circle").tag, "circle");
});
