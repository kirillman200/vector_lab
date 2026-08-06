function finiteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} must be a finite number`);
  return number;
}

function positiveNumber(value, label) {
  const number = finiteNumber(value, label);
  if (number <= 0) throw new RangeError(`${label} must be greater than zero`);
  return number;
}

function alignmentFactor(alignment, axis) {
  if (axis === "x") {
    if (alignment.startsWith("xMin")) return 0;
    if (alignment.startsWith("xMax")) return 1;
    return 0.5;
  }
  if (alignment.endsWith("YMin")) return 0;
  if (alignment.endsWith("YMax")) return 1;
  return 0.5;
}

export function computeViewBoxMapping({
  minX,
  minY,
  viewBoxWidth,
  viewBoxHeight,
  viewportWidth,
  viewportHeight,
  preserveAspectRatio = "xMidYMid meet",
}) {
  const values = {
    minX: finiteNumber(minX, "Minimum x"),
    minY: finiteNumber(minY, "Minimum y"),
    viewBoxWidth: positiveNumber(viewBoxWidth, "viewBox width"),
    viewBoxHeight: positiveNumber(viewBoxHeight, "viewBox height"),
    viewportWidth: positiveNumber(viewportWidth, "Viewport width"),
    viewportHeight: positiveNumber(viewportHeight, "Viewport height"),
  };

  const normalized = String(preserveAspectRatio).trim();
  if (normalized === "none") {
    return {
      ...values,
      mode: "none",
      alignment: "none",
      scaleX: values.viewportWidth / values.viewBoxWidth,
      scaleY: values.viewportHeight / values.viewBoxHeight,
      offsetX: 0,
      offsetY: 0,
    };
  }

  const match = normalized.match(/^(x(?:Min|Mid|Max)Y(?:Min|Mid|Max))\s+(meet|slice)$/);
  if (!match) throw new TypeError("Choose a valid preserveAspectRatio value");
  const [, alignment, mode] = match;
  const rawScaleX = values.viewportWidth / values.viewBoxWidth;
  const rawScaleY = values.viewportHeight / values.viewBoxHeight;
  const scale = mode === "slice" ? Math.max(rawScaleX, rawScaleY) : Math.min(rawScaleX, rawScaleY);
  const freeX = values.viewportWidth - values.viewBoxWidth * scale;
  const freeY = values.viewportHeight - values.viewBoxHeight * scale;

  return {
    ...values,
    mode,
    alignment,
    scaleX: scale,
    scaleY: scale,
    offsetX: freeX * alignmentFactor(alignment, "x"),
    offsetY: freeY * alignmentFactor(alignment, "y"),
  };
}

export function svgPointToViewport(mapping, x, y) {
  const svgX = finiteNumber(x, "SVG x");
  const svgY = finiteNumber(y, "SVG y");
  return {
    x: mapping.offsetX + (svgX - mapping.minX) * mapping.scaleX,
    y: mapping.offsetY + (svgY - mapping.minY) * mapping.scaleY,
  };
}

export function viewportPointToSvg(mapping, x, y) {
  const viewportX = finiteNumber(x, "Viewport x");
  const viewportY = finiteNumber(y, "Viewport y");
  return {
    x: mapping.minX + (viewportX - mapping.offsetX) / mapping.scaleX,
    y: mapping.minY + (viewportY - mapping.offsetY) / mapping.scaleY,
  };
}

export function cubicBezierPoint(points, t) {
  const amount = finiteNumber(t, "t");
  if (amount < 0 || amount > 1) throw new RangeError("t must be between zero and one");
  const [p0, p1, p2, p3] = points.map((point, index) => ({
    x: finiteNumber(point.x, `P${index} x`),
    y: finiteNumber(point.y, `P${index} y`),
  }));
  const inverse = 1 - amount;
  return {
    x: inverse ** 3 * p0.x + 3 * inverse ** 2 * amount * p1.x + 3 * inverse * amount ** 2 * p2.x + amount ** 3 * p3.x,
    y: inverse ** 3 * p0.y + 3 * inverse ** 2 * amount * p1.y + 3 * inverse * amount ** 2 * p2.y + amount ** 3 * p3.y,
  };
}

export function cubicBezierDerivative(points, t) {
  const amount = finiteNumber(t, "t");
  if (amount < 0 || amount > 1) throw new RangeError("t must be between zero and one");
  const [p0, p1, p2, p3] = points.map((point, index) => ({
    x: finiteNumber(point.x, `P${index} x`),
    y: finiteNumber(point.y, `P${index} y`),
  }));
  const inverse = 1 - amount;
  return {
    x: 3 * inverse ** 2 * (p1.x - p0.x) + 6 * inverse * amount * (p2.x - p1.x) + 3 * amount ** 2 * (p3.x - p2.x),
    y: 3 * inverse ** 2 * (p1.y - p0.y) + 6 * inverse * amount * (p2.y - p1.y) + 3 * amount ** 2 * (p3.y - p2.y),
  };
}

export function approximateCubicBezierLength(points, segments = 160) {
  const count = Math.max(8, Math.min(2000, Math.trunc(positiveNumber(segments, "Segment count"))));
  let previous = cubicBezierPoint(points, 0);
  let length = 0;
  for (let index = 1; index <= count; index += 1) {
    const current = cubicBezierPoint(points, index / count);
    length += Math.hypot(current.x - previous.x, current.y - previous.y);
    previous = current;
  }
  return length;
}

function format(value, digits = 3) {
  if (Math.abs(value) < 1e-10) return "0";
  return Number(value.toFixed(digits)).toString();
}

function formNumber(form, name) {
  return finiteNumber(form.elements.namedItem(name)?.value, name);
}

function setText(root, role, value) {
  const element = root.querySelector(`[data-output="${role}"]`);
  if (element) element.textContent = value;
}

function setSvgAttributes(element, attributes) {
  if (!element) return;
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
}

function initializeCoordinateCalculator(root) {
  const form = root.querySelector("form");
  const preview = root.querySelector("[data-coordinate-preview]");
  if (!form || !preview) return;

  const update = () => {
    try {
      const preserveAspectRatio = form.elements.namedItem("preserveAspectRatio")?.value || "xMidYMid meet";
      const mapping = computeViewBoxMapping({
        minX: formNumber(form, "minX"),
        minY: formNumber(form, "minY"),
        viewBoxWidth: formNumber(form, "viewBoxWidth"),
        viewBoxHeight: formNumber(form, "viewBoxHeight"),
        viewportWidth: formNumber(form, "viewportWidth"),
        viewportHeight: formNumber(form, "viewportHeight"),
        preserveAspectRatio,
      });
      const svgPoint = {
        x: formNumber(form, "svgX"),
        y: formNumber(form, "svgY"),
      };
      const viewportPoint = {
        x: formNumber(form, "viewportX"),
        y: formNumber(form, "viewportY"),
      };
      const convertedViewport = svgPointToViewport(mapping, svgPoint.x, svgPoint.y);
      const convertedSvg = viewportPointToSvg(mapping, viewportPoint.x, viewportPoint.y);

      setText(root, "scale", mapping.scaleX === mapping.scaleY
        ? `${format(mapping.scaleX)} px per SVG unit`
        : `${format(mapping.scaleX)} px/unit x, ${format(mapping.scaleY)} px/unit y`);
      setText(root, "offset", `${format(mapping.offsetX)}, ${format(mapping.offsetY)} px`);
      setText(root, "viewportPoint", `${format(convertedViewport.x)}, ${format(convertedViewport.y)} px`);
      setText(root, "svgPoint", `${format(convertedSvg.x)}, ${format(convertedSvg.y)} SVG units`);
      setText(root, "status", "Results updated");

      preview.setAttribute("viewBox", `${mapping.minX} ${mapping.minY} ${mapping.viewBoxWidth} ${mapping.viewBoxHeight}`);
      preview.setAttribute("preserveAspectRatio", preserveAspectRatio);
      preview.style.aspectRatio = `${mapping.viewportWidth} / ${mapping.viewportHeight}`;
      setSvgAttributes(preview.querySelector('[data-role="frame"]'), {
        x: mapping.minX,
        y: mapping.minY,
        width: mapping.viewBoxWidth,
        height: mapping.viewBoxHeight,
      });
      const radius = Math.min(mapping.viewBoxWidth, mapping.viewBoxHeight) / 45;
      setSvgAttributes(preview.querySelector('[data-role="source-point"]'), { cx: svgPoint.x, cy: svgPoint.y, r: radius });
      setSvgAttributes(preview.querySelector('[data-role="converted-point"]'), { cx: convertedSvg.x, cy: convertedSvg.y, r: radius });
      root.classList.remove("calculator-invalid");
    } catch (error) {
      setText(root, "status", error instanceof Error ? error.message : "Check the calculator inputs");
      root.classList.add("calculator-invalid");
    }
  };

  form.addEventListener("input", update);
  form.addEventListener("reset", () => requestAnimationFrame(update));
  update();
}

function pointInputs(form) {
  return [0, 1, 2, 3].map((index) => ({
    x: formNumber(form, `p${index}x`),
    y: formNumber(form, `p${index}y`),
  }));
}

function initializeBezierCalculator(root) {
  const form = root.querySelector("form");
  const preview = root.querySelector("[data-bezier-preview]");
  if (!form || !preview) return;

  const update = () => {
    try {
      const points = pointInputs(form);
      const t = formNumber(form, "t");
      const point = cubicBezierPoint(points, t);
      const derivative = cubicBezierDerivative(points, t);
      const angle = Math.atan2(derivative.y, derivative.x) * 180 / Math.PI;
      const length = approximateCubicBezierLength(points);
      const pathData = `M ${format(points[0].x)} ${format(points[0].y)} C ${format(points[1].x)} ${format(points[1].y)}, ${format(points[2].x)} ${format(points[2].y)}, ${format(points[3].x)} ${format(points[3].y)}`;

      setText(root, "point", `${format(point.x)}, ${format(point.y)}`);
      setText(root, "derivative", `${format(derivative.x)}, ${format(derivative.y)}`);
      setText(root, "angle", `${format(angle, 2)} degrees`);
      setText(root, "length", `${format(length)} SVG units`);
      setText(root, "pathData", pathData);
      setText(root, "status", "Results updated");

      const xs = points.map((item) => item.x);
      const ys = points.map((item) => item.y);
      const width = Math.max(...xs) - Math.min(...xs) || 100;
      const height = Math.max(...ys) - Math.min(...ys) || 100;
      const padding = Math.max(width, height) * 0.14;
      preview.setAttribute("viewBox", `${Math.min(...xs) - padding} ${Math.min(...ys) - padding} ${width + padding * 2} ${height + padding * 2}`);
      setSvgAttributes(preview.querySelector('[data-role="curve"]'), { d: pathData });
      setSvgAttributes(preview.querySelector('[data-role="handle-one"]'), { x1: points[0].x, y1: points[0].y, x2: points[1].x, y2: points[1].y });
      setSvgAttributes(preview.querySelector('[data-role="handle-two"]'), { x1: points[2].x, y1: points[2].y, x2: points[3].x, y2: points[3].y });
      const markerRadius = Math.max(width, height) / 65;
      points.forEach((item, index) => setSvgAttributes(preview.querySelector(`[data-role="p${index}"]`), { cx: item.x, cy: item.y, r: markerRadius }));
      setSvgAttributes(preview.querySelector('[data-role="curve-point"]'), { cx: point.x, cy: point.y, r: markerRadius * 1.25 });
      const derivativeLength = Math.hypot(derivative.x, derivative.y) || 1;
      const tangentSize = Math.max(width, height) * 0.16;
      setSvgAttributes(preview.querySelector('[data-role="tangent"]'), {
        x1: point.x - derivative.x / derivativeLength * tangentSize,
        y1: point.y - derivative.y / derivativeLength * tangentSize,
        x2: point.x + derivative.x / derivativeLength * tangentSize,
        y2: point.y + derivative.y / derivativeLength * tangentSize,
      });
      root.classList.remove("calculator-invalid");
    } catch (error) {
      setText(root, "status", error instanceof Error ? error.message : "Check the calculator inputs");
      root.classList.add("calculator-invalid");
    }
  };

  form.addEventListener("input", update);
  form.addEventListener("reset", () => requestAnimationFrame(update));
  update();
}

export function initializeCalculators(documentRoot = document) {
  documentRoot.querySelectorAll('[data-calculator="coordinates"]').forEach(initializeCoordinateCalculator);
  documentRoot.querySelectorAll('[data-calculator="bezier"]').forEach(initializeBezierCalculator);
}

if (typeof document !== "undefined") initializeCalculators(document);
