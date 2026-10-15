import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../public/js/svg-utils.js", import.meta.url), "utf8");
const { shapeToPath } = vm.runInNewContext(`${source}\n;({ shapeToPath });`);
function rect(attributes) {
  return shapeToPath({
    tagName: "rect",
    getAttribute: (name) => attributes[name] === undefined ? null : String(attributes[name])
  });
}

test("rectangle conversion mirrors a single radius before clamping each axis", () => {
  const expected = "M 10 0 H 90 A 10 10 0 0 1 100 10 V 40 A 10 10 0 0 1 90 50 H 10 A 10 10 0 0 1 0 40 V 10 A 10 10 0 0 1 10 0 Z";
  assert.equal(rect({ width: 100, height: 50, ry: 10 }), expected);
  assert.equal(rect({ width: 100, height: 50, rx: 10 }), expected);
  assert.match(rect({ width: 20, height: 100, rx: 30 }), /A 10 30 /);
  assert.match(rect({ width: 100, height: 20, ry: 30 }), /A 30 10 /);
});

test("rectangle conversion keeps square corners when either radius is explicitly zero", () => {
  const square = "M 3 4 H 103 V 54 H 3 Z";
  for (const radii of [{}, { rx: 0, ry: 10 }, { rx: 10, ry: 0 }]) {
    assert.equal(rect({ x: 3, y: 4, width: 100, height: 50, ...radii }), square);
  }
});

test("rectangle conversion preserves distinct radii and clamps independently", () => {
  const d = rect({ x: 3, y: 4, width: 100, height: 50, rx: 80, ry: 10 });
  assert.match(d, /^M 53 4 H 53 A 50 10 0 0 1 103 14 /);
  assert.equal((d.match(/A 50 10 /g) || []).length, 4);
  assert.match(d, /A 50 10 0 0 1 53 4 Z$/);
});
