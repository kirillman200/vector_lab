import test from "node:test";
import assert from "node:assert/strict";
import {
  approximateCubicBezierLength,
  computeViewBoxMapping,
  cubicBezierDerivative,
  cubicBezierPoint,
  svgPointToViewport,
  viewportPointToSvg,
} from "../public/js/svg-calculators.mjs";

test("meet conversion accounts for centered letterboxing in both directions", () => {
  const mapping = computeViewBoxMapping({
    minX: 0,
    minY: 0,
    viewBoxWidth: 200,
    viewBoxHeight: 100,
    viewportWidth: 300,
    viewportHeight: 300,
    preserveAspectRatio: "xMidYMid meet",
  });

  assert.equal(mapping.scaleX, 1.5);
  assert.equal(mapping.scaleY, 1.5);
  assert.equal(mapping.offsetX, 0);
  assert.equal(mapping.offsetY, 75);
  assert.deepEqual(svgPointToViewport(mapping, 100, 50), { x: 150, y: 150 });
  assert.deepEqual(viewportPointToSvg(mapping, 150, 75), { x: 100, y: 0 });
});

test("slice and none use their correct scales and offsets", () => {
  const base = {
    minX: 0,
    minY: 0,
    viewBoxWidth: 200,
    viewBoxHeight: 100,
    viewportWidth: 300,
    viewportHeight: 300,
  };
  const slice = computeViewBoxMapping({ ...base, preserveAspectRatio: "xMidYMid slice" });
  assert.equal(slice.scaleX, 3);
  assert.equal(slice.scaleY, 3);
  assert.equal(slice.offsetX, -150);
  assert.equal(slice.offsetY, 0);

  const stretched = computeViewBoxMapping({ ...base, preserveAspectRatio: "none" });
  assert.equal(stretched.scaleX, 1.5);
  assert.equal(stretched.scaleY, 3);
  assert.equal(stretched.offsetX, 0);
  assert.equal(stretched.offsetY, 0);
});

test("coordinate conversion rejects invalid dimensions and fitting rules", () => {
  const valid = {
    minX: 0,
    minY: 0,
    viewBoxWidth: 100,
    viewBoxHeight: 100,
    viewportWidth: 100,
    viewportHeight: 100,
  };
  assert.throws(() => computeViewBoxMapping({ ...valid, viewBoxWidth: 0 }), /greater than zero/);
  assert.throws(() => computeViewBoxMapping({ ...valid, preserveAspectRatio: "sometimes" }), /valid preserveAspectRatio/);
});

test("cubic Bezier point and derivative match a symmetric curve", () => {
  const points = [
    { x: 20, y: 140 },
    { x: 70, y: 20 },
    { x: 170, y: 20 },
    { x: 220, y: 140 },
  ];
  assert.deepEqual(cubicBezierPoint(points, 0), points[0]);
  assert.deepEqual(cubicBezierPoint(points, 1), points[3]);
  assert.deepEqual(cubicBezierPoint(points, 0.5), { x: 120, y: 50 });
  assert.deepEqual(cubicBezierDerivative(points, 0.5), { x: 225, y: 0 });
});

test("Bezier length approximation is exact for a straight cubic segment", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 1 / 3, y: 0 },
    { x: 2 / 3, y: 0 },
    { x: 1, y: 0 },
  ];
  assert.ok(Math.abs(approximateCubicBezierLength(points) - 1) < 1e-12);
  assert.throws(() => cubicBezierPoint(points, 1.01), /between zero and one/);
});
