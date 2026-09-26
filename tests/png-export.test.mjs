import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../public/js/svg-utils.js", import.meta.url), "utf8");
const { getPngExportSize } = vm.runInNewContext(`${source}\n;({ getPngExportSize });`);
const size = { width: 640, height: 420 };
const result = (...args) => JSON.parse(JSON.stringify(getPngExportSize(...args)));

test("PNG presets and one-sided dimensions preserve proportions", () => {
  assert.deepEqual(result(size, 2), { width: 1280, height: 840 });
  assert.deepEqual(result(size, 8, "320", ""), { width: 320, height: 210 });
  assert.deepEqual(result(size, 8, "", "210"), { width: 320, height: 210 });
  assert.deepEqual(result(size, 2, "500", "500"), { width: 500, height: 500 });
});

test("PNG rejects invalid inputs before canvas allocation", () => {
  for (const value of ["0", "-1", "1.5", "Infinity", "NaN", "1000000000"]) {
    assert.throws(() => getPngExportSize(size, 2, value, ""));
    assert.throws(() => getPngExportSize(size, 2, "", value));
  }
  assert.throws(() => getPngExportSize(size, 2, "6000", "6000"));
  assert.throws(() => getPngExportSize({ width: 100000, height: 1 }, 1, "", "100"));
  assert.throws(() => getPngExportSize({ width: 1, height: 100000 }, 1, "", "1"));
});
