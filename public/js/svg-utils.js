// Browser-side SVG helpers: sanitizing, sizing, colors, shape conversion.
// Depends on js/path-data.js being loaded first (pointsToPath).

const SVG_NS = "http://www.w3.org/2000/svg";
const VECTOR_SELECTOR = "path,rect,circle,ellipse,line,polyline,polygon,text,image,g,use";

function isUnsafeAttribute(name, value) {
  const cleanName = String(name).trim().toLowerCase();
  const cleanValue = String(value).trim().toLowerCase();
  const isLink = cleanName === "href" || cleanName === "xlink:href" || cleanName === "src";
  const isLocalImage = /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(String(value).trim());
  const localCssValue = cleanValue.replace(/url\(\s*['"]?#[-\w:.]+['"]?\s*\)/g, "");

  return cleanName.startsWith("on")
    || cleanValue.includes("javascript:")
    || cleanValue.includes("data:text/html")
    || (isLink && cleanValue !== "" && !cleanValue.startsWith("#") && !isLocalImage)
    || localCssValue.includes("url(")
    || localCssValue.includes("@import");
}

function sanitizeSvg(svg) {
  svg.querySelectorAll("script,foreignObject,style,link,meta,iframe,object,embed,audio,video,feImage,animate,animateMotion,animateTransform,set").forEach((node) => node.remove());
  [svg, ...svg.querySelectorAll("*")].forEach((node) => {
    [...node.attributes].forEach((attr) => {
      if (isUnsafeAttribute(attr.name, attr.value)) {
        node.removeAttribute(attr.name);
      }
    });
  });
}

function parseSvgLength(value) {
  if (!value || /%$/.test(value.trim())) return null;
  const number = parseFloat(value);
  return Number.isFinite(number) ? number : null;
}

function getSvgBaseSize(svg) {
  const viewBox = svg.getAttribute("viewBox")?.split(/[\s,]+/).map(Number) || [];
  const width = parseSvgLength(svg.getAttribute("width")) || viewBox[2] || 640;
  const height = parseSvgLength(svg.getAttribute("height")) || viewBox[3] || 420;
  return { width, height };
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function toColor(value, fallback) {
  if (!value || value === "none" || value.startsWith("url(")) return fallback;
  const probe = document.createElement("span");
  probe.style.color = "";
  probe.style.color = value;
  document.body.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  const match = color.match(/\d+/g);
  if (!match || match.length < 3) return fallback;
  return `#${match.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
}

function colorToAlpha(value) {
  if (!value || value === "none" || value.startsWith("url(")) return 1;
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (!match) return 1;
  const parts = match[1].split(/[,/ ]+/).filter(Boolean);
  const alpha = Number(parts[3]);
  return Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1;
}

function paintToColor(node, name, fallback) {
  const raw = node.getAttribute(name) || node.style.getPropertyValue(name);
  if (raw && raw !== "none" && !raw.startsWith("url(") && !raw.includes("var(")) {
    return toColor(raw, fallback);
  }
  const computed = getComputedStyle(node).getPropertyValue(name);
  return toColor(computed, fallback);
}

function paintToAlpha(node, name) {
  const raw = node.getAttribute(name) || node.style.getPropertyValue(name);
  const color = raw && raw !== "none" && !raw.startsWith("url(") && !raw.includes("var(")
    ? raw
    : getComputedStyle(node).getPropertyValue(name);
  return colorToAlpha(color);
}

function compact(value, length) {
  return value.length > length ? `${value.slice(0, length - 1)}...` : value;
}

function shapeToPath(node) {
  const tag = node.tagName.toLowerCase();
  const n = (name, fallback = 0) => Number(node.getAttribute(name) || fallback);
  if (tag === "rect") {
    const x = n("x");
    const y = n("y");
    const w = n("width");
    const h = n("height");
    const rx = Math.min(n("rx"), w / 2);
    const ry = Math.min(n("ry", rx), h / 2);
    if (!rx && !ry) return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
    return `M ${x + rx} ${y} H ${x + w - rx} A ${rx} ${ry} 0 0 1 ${x + w} ${y + ry} V ${y + h - ry} A ${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h} H ${x + rx} A ${rx} ${ry} 0 0 1 ${x} ${y + h - ry} V ${y + ry} A ${rx} ${ry} 0 0 1 ${x + rx} ${y} Z`;
  }
  if (tag === "circle") {
    const cx = n("cx");
    const cy = n("cy");
    const r = n("r");
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
  }
  if (tag === "ellipse") {
    const cx = n("cx");
    const cy = n("cy");
    const rx = n("rx");
    const ry = n("ry");
    return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
  }
  if (tag === "line") {
    return `M ${n("x1")} ${n("y1")} L ${n("x2")} ${n("y2")}`;
  }
  if (tag === "polygon" || tag === "polyline") {
    return pointsToPath(node.getAttribute("points") || "", tag === "polygon");
  }
  return "";
}
