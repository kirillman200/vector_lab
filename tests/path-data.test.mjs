import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  round,
  parsePathData,
  serializePathData,
  pointsAttributeToPairs,
  pointsToPath,
  pathToPoints,
  translatePathCommands,
  pathCommandPoints,
  buildPathHandles
} = require("../public/js/path-data.js");

test("parses basic absolute commands", () => {
  const commands = parsePathData("M 10 20 L 30 40 Z");
  assert.deepEqual(commands, [
    { code: "M", values: [10, 20] },
    { code: "L", values: [30, 40] },
    { code: "Z", values: [] }
  ]);
});

test("implicit moveto repetitions become lineto", () => {
  assert.deepEqual(
    parsePathData("M 1 2 3 4 5 6").map((c) => c.code),
    ["M", "L", "L"]
  );
  assert.deepEqual(
    parsePathData("m 1 2 3 4").map((c) => c.code),
    ["m", "l"]
  );
});

test("explicit moveto starting a later subpath keeps its code", () => {
  assert.deepEqual(
    parsePathData("M0 0 L1 1 M10 10 L11 11").map((c) => c.code),
    ["M", "L", "M", "L"]
  );
});

test("parses compact arc flags without separators", () => {
  const commands = parsePathData("M0 0 a25,25 0 0110,10");
  assert.deepEqual(commands[1], { code: "a", values: [25, 25, 0, 0, 1, 10, 10] });

  const chained = parsePathData("M0 0A5 5 0 01 10 10A5 5 0 0020 20");
  assert.deepEqual(chained[1].values, [5, 5, 0, 0, 1, 10, 10]);
  assert.deepEqual(chained[2].values, [5, 5, 0, 0, 0, 20, 20]);
});

test("parses scientific notation and signed numbers", () => {
  const commands = parsePathData("M 1e2 -3.5e-1 L-2-3");
  assert.deepEqual(commands[0].values, [100, -0.35]);
  assert.deepEqual(commands[1].values, [-2, -3]);
});

test("stops cleanly on malformed input", () => {
  assert.deepEqual(parsePathData("M 0 0 L"), [{ code: "M", values: [0, 0] }]);
  assert.deepEqual(parsePathData("garbage"), []);
  assert.deepEqual(parsePathData(""), []);
});

test("serialize rounds to 3 decimals and round-trips", () => {
  const d = serializePathData(parsePathData("M0 0 L10.12345 5"));
  assert.equal(d, "M 0 0 L 10.123 5");
  assert.deepEqual(parsePathData(d), [
    { code: "M", values: [0, 0] },
    { code: "L", values: [10.123, 5] }
  ]);
});

test("translatePathCommands shifts absolute commands and first relative move", () => {
  const commands = parsePathData("m 5 5 l 10 0 L 20 20 H 30 V 40 A 5 5 0 0 1 50 60");
  const moved = translatePathCommands(commands, 2, 3);
  assert.deepEqual(moved[0].values, [7, 8]); // first relative m shifts
  assert.deepEqual(moved[1].values, [10, 0]); // relative l untouched
  assert.deepEqual(moved[2].values, [22, 23]); // absolute L shifts
  assert.deepEqual(moved[3].values, [32]); // H shifts by dx
  assert.deepEqual(moved[4].values, [43]); // V shifts by dy
  assert.deepEqual(moved[5].values, [5, 5, 0, 0, 1, 52, 63]); // arc endpoint shifts
});

test("pathToPoints resolves relative moves into absolute points", () => {
  const commands = parsePathData("M 0 0 l 10 0 l 0 10");
  assert.equal(pathToPoints(commands), "0,0 10,0 10,10");
});

test("pointsToPath emits M/L and optional close", () => {
  assert.equal(pointsToPath("0,0 10,0 10,10", true), "M 0 0 L 10 0 L 10 10 Z");
  assert.equal(pointsToPath("0,0 10,0", false), "M 0 0 L 10 0");
  assert.equal(pointsToPath("", true), "");
});

test("pointsAttributeToPairs handles mixed separators", () => {
  assert.deepEqual(pointsAttributeToPairs("1,2 3 4  5,6"), [
    { x: 1, y: 2 },
    { x: 3, y: 4 },
    { x: 5, y: 6 }
  ]);
});

test("pathCommandPoints tracks h/v/z pen positions", () => {
  const points = pathCommandPoints(parsePathData("M0 0 H10 V10 Z"));
  assert.deepEqual(points, [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 0 }
  ]);
});

test("buildPathHandles emits control handles with links for cubic curves", () => {
  const handles = buildPathHandles(parsePathData("M0 0 C 1 1 2 2 3 3"));
  assert.equal(handles.length, 4);
  assert.deepEqual(
    handles.map((h) => h.kind),
    ["end", "control", "control", "end"]
  );
  assert.deepEqual(handles[1].link, { x: 0, y: 0 }); // first control links to segment start
  assert.deepEqual(handles[2].link, { x: 3, y: 3 }); // second control links to endpoint
});

test("buildPathHandles resolves relative coordinates", () => {
  const handles = buildPathHandles(parsePathData("m 10 10 l 5 0"));
  assert.deepEqual(
    handles.map((h) => ({ x: h.x, y: h.y })),
    [
      { x: 10, y: 10 },
      { x: 15, y: 10 }
    ]
  );
});

test("round keeps 3 decimals", () => {
  assert.equal(round(1.23456), 1.235);
  assert.equal(round("2.5"), 2.5);
});
