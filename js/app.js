// Main application: state, selection, drag interactions, inspector, history, IO.
// Depends on js/path-data.js, js/svg-utils.js and js/icons.js being loaded first.

const AUTOSAVE_KEY = "svg-vector-lab:autosave";
const GEOMETRY_ATTRS = ["x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "width", "height", "points"];

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" width="640" height="420">
  <defs>
    <linearGradient id="sunset" x1="0" x2="1">
      <stop offset="0" stop-color="#f59e0b"/>
      <stop offset="1" stop-color="#ef4444"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="640" height="420" fill="#f8fafc"/>
  <circle cx="485" cy="98" r="54" fill="url(#sunset)" opacity="0.95"/>
  <path d="M 78 318 C 148 178 220 188 282 292 S 418 384 562 190" fill="none" stroke="#2563eb" stroke-width="18" stroke-linecap="round"/>
  <polygon points="122,328 204,214 288,328" fill="#10b981" stroke="#0f766e" stroke-width="6"/>
  <rect x="330" y="210" width="130" height="88" rx="16" fill="#ffffff" stroke="#334155" stroke-width="7"/>
  <path d="M 366 255 L 399 285 L 436 228" fill="none" stroke="#dc2626" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="72" y="76" font-size="38" font-family="Arial, sans-serif" font-weight="700" fill="#17202a">SVG Vector Lab</text>
</svg>`;

const els = {
  appShell: document.querySelector(".app-shell"),
  svgInput: document.querySelector("#svgInput"),
  loadInputBtn: document.querySelector("#loadInputBtn"),
  loadSampleBtn: document.querySelector("#loadSampleBtn"),
  fileInput: document.querySelector("#fileInput"),
  copySvgBtn: document.querySelector("#copySvgBtn"),
  downloadSvgBtn: document.querySelector("#downloadSvgBtn"),
  downloadPngBtn: document.querySelector("#downloadPngBtn"),
  pngScaleInput: document.querySelector("#pngScaleInput"),
  backgroundInput: document.querySelector("#backgroundInput"),
  backgroundAlphaInput: document.querySelector("#backgroundAlphaInput"),
  backgroundAlphaOutput: document.querySelector("#backgroundAlphaOutput"),
  statusLine: document.querySelector("#statusLine"),
  layerList: document.querySelector("#layerList"),
  refreshLayersBtn: document.querySelector("#refreshLayersBtn"),
  svgMount: document.querySelector("#svgMount"),
  stage: document.querySelector("#stage"),
  precisionHud: document.querySelector("#precisionHud"),
  zoomInput: document.querySelector("#zoomInput"),
  snapToggle: document.querySelector("#snapToggle"),
  fitBtn: document.querySelector("#fitBtn"),
  toggleSourceBtn: document.querySelector("#toggleSourceBtn"),
  toggleInspectorBtn: document.querySelector("#toggleInspectorBtn"),
  undoBtn: document.querySelector("#undoBtn"),
  redoBtn: document.querySelector("#redoBtn"),
  convertPathBtn: document.querySelector("#convertPathBtn"),
  deleteBtn: document.querySelector("#deleteBtn"),
  duplicateBtn: document.querySelector("#duplicateBtn"),
  selectedName: document.querySelector("#selectedName"),
  fillInput: document.querySelector("#fillInput"),
  fillAlphaInput: document.querySelector("#fillAlphaInput"),
  fillAlphaOutput: document.querySelector("#fillAlphaOutput"),
  strokeInput: document.querySelector("#strokeInput"),
  strokeAlphaInput: document.querySelector("#strokeAlphaInput"),
  strokeAlphaOutput: document.querySelector("#strokeAlphaOutput"),
  strokeWidthInput: document.querySelector("#strokeWidthInput"),
  opacityInput: document.querySelector("#opacityInput"),
  fillNoneBtn: document.querySelector("#fillNoneBtn"),
  strokeNoneBtn: document.querySelector("#strokeNoneBtn"),
  bringForwardBtn: document.querySelector("#bringForwardBtn"),
  sendBackwardBtn: document.querySelector("#sendBackwardBtn"),
  geometryControls: document.querySelector("#geometryControls"),
  translateXInput: document.querySelector("#translateXInput"),
  translateYInput: document.querySelector("#translateYInput"),
  scaleInput: document.querySelector("#scaleInput"),
  rotateInput: document.querySelector("#rotateInput"),
  applyTransformBtn: document.querySelector("#applyTransformBtn"),
  pathInput: document.querySelector("#pathInput"),
  normalizePathBtn: document.querySelector("#normalizePathBtn"),
  pathTable: document.querySelector("#pathTable"),
  attrList: document.querySelector("#attrList"),
  attrNameInput: document.querySelector("#attrNameInput"),
  attrValueInput: document.querySelector("#attrValueInput"),
  setAttrBtn: document.querySelector("#setAttrBtn"),
  learnPanel: document.querySelector("#learnPanel")
};

const state = {
  svg: null,
  selection: [],
  selected: null,
  zoom: 1,
  drag: null,
  pathCommands: [],
  history: [],
  historyIndex: -1,
  restoring: false,
  snapEnabled: false,
  snapPoint: null,
  activeHandleKey: null,
  activePoint: null,
  backgroundColor: "#ffffff",
  backgroundAlpha: 1,
  pngScale: 2,
  spacePan: false,
  suppressClick: false
};

let sourceSyncTimer = 0;
let autosaveTimer = 0;

function setStatus(message, isError = false) {
  els.statusLine.textContent = message;
  els.statusLine.classList.toggle("error", isError);
}

/* ---------------------------------------------------------------- geometry */

function transformPoint(matrix, point) {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f
  };
}

function transformDelta(matrix, dx, dy) {
  return { x: matrix.a * dx + matrix.c * dy, y: matrix.b * dx + matrix.d * dy };
}

// Converts a screen-pixel delta into the node's local user space, so dragging
// works at the right rate inside transformed groups.
function screenDeltaToLocal(node, dx, dy) {
  const matrix = node.getScreenCTM?.();
  if (!matrix) return { x: dx, y: dy };
  return transformDelta(matrix.inverse(), dx, dy);
}

function clientPointToLocal(inverseMatrix, clientX, clientY) {
  return transformPoint(inverseMatrix, { x: clientX, y: clientY });
}

// Screen pixels per local user unit (for keeping overlays a constant size).
function screenScaleOf(node) {
  const matrix = node.getScreenCTM?.();
  if (!matrix) return 1;
  return Math.max(1e-6, Math.hypot(matrix.a, matrix.b));
}

function screenRectOf(node) {
  const matrix = node.getScreenCTM?.();
  if (!matrix) return null;
  let box;
  try {
    box = node.getBBox();
  } catch {
    return null;
  }
  const corners = [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x, y: box.y + box.height },
    { x: box.x + box.width, y: box.y + box.height }
  ].map((point) => transformPoint(matrix, point));
  return {
    left: Math.min(...corners.map((c) => c.x)),
    right: Math.max(...corners.map((c) => c.x)),
    top: Math.min(...corners.map((c) => c.y)),
    bottom: Math.max(...corners.map((c) => c.y))
  };
}

/* ------------------------------------------------------------------ loading */

function getSvgBackground() {
  if (state.backgroundAlpha <= 0) return "";
  return hexToRgba(state.backgroundColor, state.backgroundAlpha);
}

function applyBackgroundColor(svg = state.svg) {
  if (!svg) return;
  const color = getSvgBackground();
  if (!color) {
    svg.style.removeProperty("background-color");
  } else {
    svg.style.backgroundColor = color;
  }
}

function applySvgZoom(svg) {
  const width = Number(svg.dataset.baseWidth || parseFloat(svg.getAttribute("width")) || 640);
  const height = Number(svg.dataset.baseHeight || parseFloat(svg.getAttribute("height")) || 420);
  svg.style.width = `${Math.max(1, width * state.zoom)}px`;
  svg.style.height = `${Math.max(1, height * state.zoom)}px`;
}

function loadSvg(markup, options = {}) {
  try {
    const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
    const parseError = doc.querySelector("parsererror");
    const parsedSvg = doc.documentElement;
    if (parseError || !parsedSvg || parsedSvg.tagName.toLowerCase() !== "svg") {
      throw new Error("Input must be valid SVG markup with an <svg> root.");
    }

    const imported = document.importNode(parsedSvg, true);
    sanitizeSvg(imported);
    if (!imported.getAttribute("viewBox")) {
      const width = parseFloat(imported.getAttribute("width")) || 640;
      const height = parseFloat(imported.getAttribute("height")) || 420;
      imported.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }
    if (!imported.getAttribute("width") || !imported.getAttribute("height")) {
      const viewBox = imported.getAttribute("viewBox").split(/[\s,]+/).map(Number);
      imported.setAttribute("width", String(viewBox[2] || 640));
      imported.setAttribute("height", String(viewBox[3] || 420));
    }
    imported.removeAttribute("style");
    const baseSize = getSvgBaseSize(imported);
    imported.dataset.baseWidth = String(baseSize.width);
    imported.dataset.baseHeight = String(baseSize.height);
    applySvgZoom(imported);
    applyBackgroundColor(imported);
    imported.addEventListener("click", handleSvgClick);
    imported.addEventListener("pointerdown", handlePointerDown);

    els.svgMount.replaceChildren(imported);
    state.svg = imported;
    state.selection = [];
    state.selected = null;
    state.activeHandleKey = null;
    state.activePoint = null;
    updatePrecisionHud();
    syncSource();
    refreshLayers();
    refreshInspector();
    if (options.recordHistory !== false) {
      pushHistory(true);
    }
    setStatus("SVG loaded.");
  } catch (error) {
    setStatus(error.message, true);
  }
}

/* ---------------------------------------------------------------- selection */

function getVectors() {
  if (!state.svg) return [];
  return [...state.svg.querySelectorAll(VECTOR_SELECTOR)].filter((node) => !node.closest(".lab-overlay"));
}

function setSelection(nodes, primary = null) {
  let selection = nodes.filter((node) => node && state.svg && state.svg.contains(node));
  selection = [...new Set(selection)];
  if (primary && selection.includes(primary)) {
    selection = selection.filter((node) => node !== primary).concat(primary);
  }
  state.selection = selection;
  state.selected = selection[selection.length - 1] || null;
  state.activeHandleKey = null;
  state.activePoint = null;
  updatePrecisionHud();
  refreshLayers();
  refreshInspector();
  renderOverlay();
}

function selectElement(node, additive = false) {
  if (!node) {
    setSelection([]);
    return;
  }
  if (additive) {
    if (state.selection.includes(node)) {
      setSelection(state.selection.filter((other) => other !== node));
    } else {
      setSelection([...state.selection, node]);
    }
  } else {
    setSelection([node]);
  }
}

// Drops nodes whose ancestor is also selected, so group + child never both move.
function topLevelSelection() {
  return state.selection.filter(
    (node) => !state.selection.some((other) => other !== node && other.contains(node))
  );
}

function labelFor(node, index) {
  const id = node.getAttribute("id");
  const cls = node.getAttribute("class");
  const extra = id ? `#${id}` : cls ? `.${cls.split(/\s+/)[0]}` : "";
  return `${index + 1}. ${node.tagName.toLowerCase()}${extra}`;
}

function summarizeElement(node) {
  if (node.tagName.toLowerCase() === "path") {
    return compact(node.getAttribute("d") || "", 64);
  }
  if (node.hasAttribute("points")) {
    return compact(node.getAttribute("points") || "", 64);
  }
  const attrs = ["x", "y", "cx", "cy", "r", "width", "height", "fill", "stroke"]
    .filter((name) => node.hasAttribute(name))
    .map((name) => `${name}=${node.getAttribute(name)}`);
  return compact(attrs.join(" "), 64);
}

function refreshLayers() {
  const vectors = getVectors();
  els.layerList.replaceChildren();
  vectors.forEach((node, index) => {
    const button = document.createElement("button");
    button.className = "layer-item";
    if (state.selection.includes(node)) button.classList.add("active");
    if (node === state.selected) button.classList.add("primary");
    const tag = document.createElement("span");
    tag.className = "layer-tag";
    tag.textContent = labelFor(node, index);
    const meta = document.createElement("span");
    meta.className = "layer-meta";
    meta.textContent = summarizeElement(node);
    button.append(tag, meta);
    button.addEventListener("click", (event) => {
      selectElement(node, event.shiftKey || event.ctrlKey || event.metaKey);
    });
    els.layerList.append(button);
  });
}

function handleSvgClick(event) {
  if (state.suppressClick) {
    state.suppressClick = false;
    return;
  }
  const target = event.target;
  if (target.closest(".lab-overlay")) return;
  const vector = target.closest(VECTOR_SELECTOR);
  if (vector && state.svg.contains(vector)) {
    event.stopPropagation();
    selectElement(vector, event.shiftKey || event.ctrlKey || event.metaKey);
  } else if (!event.shiftKey) {
    setSelection([]);
  }
}

/* ---------------------------------------------------------------- inspector */

function refreshInspector() {
  const node = state.selected;
  const tagName = node ? node.tagName.toLowerCase() : "None";
  els.selectedName.textContent =
    state.selection.length > 1 ? `${state.selection.length} selected — editing ${tagName}` : tagName;
  els.geometryControls.replaceChildren();
  els.pathTable.replaceChildren();
  els.attrList.replaceChildren();
  els.pathInput.value = "";
  state.pathCommands = [];

  const disabled = !node;
  [
    els.fillInput,
    els.fillAlphaInput,
    els.strokeInput,
    els.strokeAlphaInput,
    els.strokeWidthInput,
    els.opacityInput,
    els.pathInput
  ].forEach((input) => {
    input.disabled = disabled;
  });

  if (!node) {
    els.learnPanel.textContent = "Select a vector to inspect how its coordinates and drawing commands work.";
    return;
  }

  els.fillInput.value = paintToColor(node, "fill", "#4e7cff");
  els.fillAlphaInput.value = String(Math.round(paintToAlpha(node, "fill") * 100));
  els.fillAlphaOutput.textContent = `${els.fillAlphaInput.value}%`;
  els.strokeInput.value = paintToColor(node, "stroke", "#1d2733");
  els.strokeAlphaInput.value = String(Math.round(paintToAlpha(node, "stroke") * 100));
  els.strokeAlphaOutput.textContent = `${els.strokeAlphaInput.value}%`;
  els.strokeWidthInput.value = node.getAttribute("stroke-width") || "";
  els.opacityInput.value = node.getAttribute("opacity") || "";

  buildGeometryControls(node);
  buildAttrList(node);
  buildPathControls(node);
  updateLearnPanel(node);
}

function safeSetAttribute(node, name, value) {
  if (isUnsafeAttribute(name, value)) {
    setStatus(`Blocked unsafe attribute "${name}".`, true);
    return false;
  }
  try {
    node.setAttribute(name, value);
  } catch {
    setStatus(`Invalid attribute name "${name}".`, true);
    return false;
  }
  return true;
}

function buildGeometryControls(node) {
  const tag = node.tagName.toLowerCase();

  if (tag === "text") {
    if (node.children.length) {
      const note = document.createElement("div");
      note.className = "learn-panel";
      note.style.gridColumn = "1 / -1";
      note.textContent = "This text contains <tspan> children — edit its content in the source panel.";
      els.geometryControls.append(note);
    } else {
      const label = document.createElement("label");
      label.textContent = "text";
      label.style.gridColumn = "1 / -1";
      const input = document.createElement("input");
      input.type = "text";
      input.value = node.textContent;
      input.addEventListener("input", () => {
        node.textContent = input.value;
        afterMutation(false);
      });
      label.append(input);
      els.geometryControls.append(label);
    }
  }

  const fieldsByTag = {
    rect: ["x", "y", "width", "height", "rx", "ry"],
    circle: ["cx", "cy", "r"],
    ellipse: ["cx", "cy", "rx", "ry"],
    line: ["x1", "y1", "x2", "y2"],
    text: ["x", "y", "font-size"],
    path: [],
    polygon: ["points"],
    polyline: ["points"],
    g: [],
    use: ["href", "x", "y", "width", "height"]
  };
  const fields = fieldsByTag[tag] || [];
  if (!fields.length && tag !== "text") {
    const note = document.createElement("div");
    note.className = "learn-panel";
    note.textContent = tag === "path" ? "Use Path Data to edit drawing commands." : "Use Attributes to edit this element.";
    els.geometryControls.append(note);
    return;
  }

  fields.forEach((name) => {
    const label = document.createElement("label");
    label.textContent = name;
    const input = document.createElement("input");
    input.value = node.getAttribute(name) || "";
    input.type = name === "points" || name === "href" ? "text" : "number";
    input.step = "1";
    input.addEventListener("input", () => {
      if (input.value === "") {
        node.removeAttribute(name);
      } else if (!safeSetAttribute(node, name, input.value)) {
        return;
      }
      afterMutation(false);
    });
    label.append(input);
    els.geometryControls.append(label);
  });
}

function buildAttrList(node) {
  [...node.attributes].forEach((attr) => {
    const row = document.createElement("div");
    row.className = "attr-row";
    const name = document.createElement("span");
    name.textContent = attr.name;
    const input = document.createElement("input");
    input.value = attr.value;
    input.addEventListener("input", () => {
      if (!safeSetAttribute(node, attr.name, input.value)) return;
      afterMutation(false);
    });
    const remove = document.createElement("button");
    remove.textContent = "x";
    remove.title = `Remove ${attr.name}`;
    remove.addEventListener("click", () => {
      node.removeAttribute(attr.name);
      afterMutation();
    });
    row.append(name, input, remove);
    els.attrList.append(row);
  });
}

function buildPathControls(node) {
  const tag = node.tagName.toLowerCase();
  let data = "";
  if (tag === "path") data = node.getAttribute("d") || "";
  if (tag === "polyline" || tag === "polygon") data = pointsToPath(node.getAttribute("points") || "", tag === "polygon");

  if (!data) {
    els.pathInput.disabled = true;
    return;
  }

  els.pathInput.disabled = false;
  els.pathInput.value = data;
  state.pathCommands = parsePathData(data);
  renderPathTable();
}

function renderPathTable() {
  els.pathTable.replaceChildren();
  state.pathCommands.forEach((command) => {
    const row = document.createElement("div");
    row.className = "path-row";
    const cmd = document.createElement("strong");
    cmd.textContent = command.code;
    row.append(cmd);

    for (let i = 0; i < 7; i += 1) {
      const input = document.createElement("input");
      input.type = "number";
      input.step = "1";
      input.value = command.values[i] ?? "";
      input.disabled = i >= command.values.length;
      input.addEventListener("input", () => {
        command.values[i] = Number(input.value || 0);
        applyPathCommands();
      });
      row.append(input);
    }
    els.pathTable.append(row);
  });
}

function applyPathCommands() {
  const node = state.selected;
  if (!node) return;
  const d = serializePathData(state.pathCommands);
  const tag = node.tagName.toLowerCase();
  if (tag === "path") {
    node.setAttribute("d", d);
  } else if (tag === "polyline" || tag === "polygon") {
    node.setAttribute("points", pathToPoints(state.pathCommands));
  }
  els.pathInput.value = d;
  afterMutation(false);
}

function updateLearnPanel(node) {
  const tag = node.tagName.toLowerCase();
  if (tag === "path") {
    const commands = parsePathData(node.getAttribute("d") || "");
    const counts = commands.reduce((map, command) => {
      const key = command.code.toUpperCase();
      map[key] = (map[key] || 0) + 1;
      return map;
    }, {});
    els.learnPanel.innerHTML = `This <code>path</code> is a command stream. <code>M</code> moves the pen, <code>L</code> draws lines, <code>C/Q/S</code> draw Bezier curves, <code>A</code> draws arcs, and <code>Z</code> closes a shape. Commands here: ${Object.entries(counts).map(([key, value]) => `<code>${key}:${value}</code>`).join(" ")}. Drag blue endpoints or amber control points on the canvas.`;
    return;
  }
  if (tag === "polygon" || tag === "polyline") {
    els.learnPanel.innerHTML = `This <code>${tag}</code> is a list of x,y coordinate pairs. Editing <code>points</code> moves each vertex; polygon closes automatically, polyline stays open.`;
    return;
  }
  if (tag === "circle" || tag === "ellipse") {
    els.learnPanel.innerHTML = `This <code>${tag}</code> is controlled from its center. <code>cx</code> and <code>cy</code> move it; radius attributes change its size.`;
    return;
  }
  if (tag === "rect") {
    els.learnPanel.innerHTML = `This <code>rect</code> uses <code>x/y</code> for the top-left corner, <code>width/height</code> for size, and <code>rx/ry</code> for rounded corners.`;
    return;
  }
  els.learnPanel.innerHTML = `This <code>${tag}</code> can be edited through attributes and transforms. SVG rendering is attribute-driven, so each value maps directly to visible geometry or paint.`;
}

/* --------------------------------------------------------- drag interactions */

function captureElementGeometry(node) {
  const tag = node.tagName.toLowerCase();
  if (tag === "path") {
    return { tag, commands: parsePathData(node.getAttribute("d") || "") };
  }
  if (tag === "polygon" || tag === "polyline") {
    return { tag, points: pointsAttributeToPairs(node.getAttribute("points") || "") };
  }
  const attrSets = {
    rect: ["x", "y"],
    circle: ["cx", "cy"],
    ellipse: ["cx", "cy"],
    line: ["x1", "y1", "x2", "y2"],
    text: ["x", "y"],
    use: ["x", "y"]
  };
  const names = attrSets[tag];
  if (!names) return { tag };
  return {
    tag,
    attrs: Object.fromEntries(names.map((name) => [name, Number(node.getAttribute(name) || 0)]))
  };
}

function applyElementTranslation(node, geometry, dx, dy) {
  if (!geometry) return false;
  if (geometry.tag === "path") {
    node.setAttribute("d", serializePathData(translatePathCommands(geometry.commands, dx, dy)));
    return true;
  }
  if (geometry.tag === "polygon" || geometry.tag === "polyline") {
    node.setAttribute("points", geometry.points.map((point) => `${round(point.x + dx)},${round(point.y + dy)}`).join(" "));
    return true;
  }
  if (!geometry.attrs) return false;
  const xAttrs = ["x", "x1", "x2", "cx"];
  const yAttrs = ["y", "y1", "y2", "cy"];
  Object.entries(geometry.attrs).forEach(([name, value]) => {
    const offset = xAttrs.includes(name) ? dx : yAttrs.includes(name) ? dy : 0;
    node.setAttribute(name, String(round(value + offset)));
  });
  return true;
}

// Moves one captured item by a cumulative screen-pixel delta. Geometry edits
// happen in the node's local space; the transform fallback works in parent space.
function translateNodeBy(item, screenDx, screenDy) {
  const { node, geometry, transform } = item;
  const local = screenDeltaToLocal(node, screenDx, screenDy);
  if (!applyElementTranslation(node, geometry, round(local.x), round(local.y))) {
    const reference = node.parentNode && node.parentNode.getScreenCTM ? node.parentNode : state.svg;
    const parentDelta = screenDeltaToLocal(reference, screenDx, screenDy);
    node.setAttribute("transform", `translate(${round(parentDelta.x)} ${round(parentDelta.y)}) ${transform}`.trim());
  }
}

function handlePointerDown(event) {
  state.suppressClick = false;
  if (state.spacePan || event.button !== 0 || event.shiftKey || event.ctrlKey || event.metaKey) return;
  const target = event.target;
  if (target.closest(".lab-overlay")) return;
  const vector = target.closest(VECTOR_SELECTOR);
  if (!vector || !state.svg.contains(vector)) return;
  if (!state.selection.includes(vector)) selectElement(vector);
  event.preventDefault();
  state.drag = {
    type: "element",
    clientX: event.clientX,
    clientY: event.clientY,
    moved: false,
    items: topLevelSelection().map((node) => ({
      node,
      geometry: captureElementGeometry(node),
      transform: node.getAttribute("transform") || ""
    }))
  };
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp, { once: true });
}

function startHandleDrag(event, handle) {
  event.stopPropagation();
  event.preventDefault();
  setActiveHandle(handle);
  const matrix = state.selected?.getScreenCTM?.();
  if (!matrix) return;
  state.drag = {
    type: "path-handle",
    handle,
    matrix,
    inverse: matrix.inverse(),
    candidates: state.snapEnabled ? collectSnapCandidatesScreen(state.selected) : []
  };
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp, { once: true });
}

function startResizeDrag(event, node, info) {
  event.stopPropagation();
  event.preventDefault();
  const matrix = node.getScreenCTM?.();
  if (!matrix) return;
  const inverse = matrix.inverse();
  state.drag = {
    type: "resize",
    node,
    info,
    inverse,
    start: clientPointToLocal(inverse, event.clientX, event.clientY),
    base: node.getAttribute("transform") || ""
  };
  document.body.style.cursor = event.target.style.cursor || "default";
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp, { once: true });
}

function startRotateDrag(event, node, info) {
  event.stopPropagation();
  event.preventDefault();
  const matrix = node.getScreenCTM?.();
  if (!matrix) return;
  const inverse = matrix.inverse();
  state.drag = {
    type: "rotate",
    node,
    info,
    inverse,
    start: clientPointToLocal(inverse, event.clientX, event.clientY),
    base: node.getAttribute("transform") || ""
  };
  document.body.style.cursor = "grabbing";
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp, { once: true });
}

function handlePointerMove(event) {
  const drag = state.drag;
  if (!drag) return;

  if (drag.type === "element") {
    const dx = event.clientX - drag.clientX;
    const dy = event.clientY - drag.clientY;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
    drag.items.forEach((item) => translateNodeBy(item, dx, dy));
    renderOverlay();
    syncSourceThrottled();
    return;
  }

  if (drag.type === "path-handle") {
    const local = clientPointToLocal(drag.inverse, event.clientX, event.clientY);
    const rawPoint = { x: local.x - drag.handle.offsetX, y: local.y - drag.handle.offsetY };
    let targetPoint = rawPoint;
    state.snapPoint = null;
    if (state.snapEnabled && drag.candidates.length) {
      const rawScreen = transformPoint(drag.matrix, rawPoint);
      const snappedScreen = snapToCandidates(rawScreen, drag.candidates, 10);
      if (snappedScreen) {
        targetPoint = clientPointToLocal(drag.inverse, snappedScreen.x, snappedScreen.y);
        const rootMatrix = state.svg.getScreenCTM?.();
        state.snapPoint = rootMatrix ? clientPointToLocal(rootMatrix.inverse(), snappedScreen.x, snappedScreen.y) : null;
      }
    }
    updateHandlePosition(drag.handle, targetPoint);
    updatePrecisionHud(state.activePoint, state.snapPoint ? "snap" : "drag");
    applyPathCommands();
    renderOverlay();
    return;
  }

  if (drag.type === "resize") {
    const point = clientPointToLocal(drag.inverse, event.clientX, event.clientY);
    const { anchor, scaleX, scaleY } = drag.info;
    const safeScale = (target, start, origin) => {
      const denominator = start - origin;
      if (Math.abs(denominator) < 1e-6) return 1;
      const value = (target - origin) / denominator;
      if (!Number.isFinite(value)) return 1;
      return (value < 0 ? -1 : 1) * Math.max(Math.abs(value), 0.01);
    };
    let sx = scaleX ? safeScale(point.x, drag.start.x, anchor.x) : 1;
    let sy = scaleY ? safeScale(point.y, drag.start.y, anchor.y) : 1;
    if (event.shiftKey && scaleX && scaleY) {
      const uniform = Math.max(Math.abs(sx), Math.abs(sy));
      sx = (sx < 0 ? -1 : 1) * uniform;
      sy = (sy < 0 ? -1 : 1) * uniform;
    }
    drag.node.setAttribute(
      "transform",
      `${drag.base} translate(${round(anchor.x)} ${round(anchor.y)}) scale(${round(sx)} ${round(sy)}) translate(${round(-anchor.x)} ${round(-anchor.y)})`.trim()
    );
    updatePrecisionHud(point, "resize");
    renderOverlay();
    syncSourceThrottled();
    return;
  }

  if (drag.type === "rotate") {
    const point = clientPointToLocal(drag.inverse, event.clientX, event.clientY);
    const { cx, cy } = drag.info;
    let degrees =
      ((Math.atan2(point.y - cy, point.x - cx) - Math.atan2(drag.start.y - cy, drag.start.x - cx)) * 180) / Math.PI;
    if (event.shiftKey) degrees = Math.round(degrees / 15) * 15;
    drag.node.setAttribute("transform", `${drag.base} rotate(${round(degrees)} ${round(cx)} ${round(cy)})`.trim());
    updatePrecisionHud(point, `rotate ${Math.round(degrees)}°`);
    renderOverlay();
    syncSourceThrottled();
  }
}

function handlePointerUp() {
  const drag = state.drag;
  state.drag = null;
  state.snapPoint = null;
  document.body.style.cursor = "";
  window.removeEventListener("pointermove", handlePointerMove);
  if (drag && drag.type === "element" && drag.moved) state.suppressClick = true;
  afterMutation();
}

/* --------------------------------------------------------------------- snap */

function elementSnapPoints(node) {
  const points = [];
  try {
    const box = node.getBBox();
    const midX = box.x + box.width / 2;
    const midY = box.y + box.height / 2;
    points.push(
      { x: box.x, y: box.y },
      { x: midX, y: box.y },
      { x: box.x + box.width, y: box.y },
      { x: box.x, y: midY },
      { x: midX, y: midY },
      { x: box.x + box.width, y: midY },
      { x: box.x, y: box.y + box.height },
      { x: midX, y: box.y + box.height },
      { x: box.x + box.width, y: box.y + box.height }
    );
  } catch {
    return points;
  }

  const tag = node.tagName.toLowerCase();
  const n = (name, fallback = 0) => Number(node.getAttribute(name) || fallback);
  if (tag === "circle" || tag === "ellipse") {
    points.push({ x: n("cx"), y: n("cy") });
  } else if (tag === "line") {
    points.push({ x: n("x1"), y: n("y1") }, { x: n("x2"), y: n("y2") });
  } else if (tag === "polygon" || tag === "polyline") {
    points.push(...pointsAttributeToPairs(node.getAttribute("points") || ""));
  } else if (tag === "path") {
    points.push(...pathCommandPoints(parsePathData(node.getAttribute("d") || "")));
  }
  return points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}

// Cached once at drag start; candidates are converted into screen pixels so
// snapping works across elements living in different transformed spaces.
function collectSnapCandidatesScreen(excludedNode) {
  const candidates = [];
  getVectors().forEach((node) => {
    if (node === excludedNode || excludedNode.contains(node) || node.contains(excludedNode)) return;
    const matrix = node.getScreenCTM?.();
    if (!matrix) return;
    elementSnapPoints(node).forEach((point) => {
      candidates.push(transformPoint(matrix, point));
    });
  });
  return candidates;
}

function snapToCandidates(point, candidates, threshold) {
  let bestX = threshold;
  let bestY = threshold;
  let snappedX = null;
  let snappedY = null;
  candidates.forEach((candidate) => {
    const dx = Math.abs(candidate.x - point.x);
    const dy = Math.abs(candidate.y - point.y);
    if (dx <= bestX) {
      bestX = dx;
      snappedX = candidate.x;
    }
    if (dy <= bestY) {
      bestY = dy;
      snappedY = candidate.y;
    }
  });
  if (snappedX === null && snappedY === null) return null;
  return { x: snappedX ?? point.x, y: snappedY ?? point.y };
}

/* ------------------------------------------------------------------ overlay */

function updatePrecisionHud(point = state.activePoint, mode = "") {
  if (!point) {
    els.precisionHud.textContent = "x: -, y: -";
    return;
  }
  const suffix = mode ? ` ${mode}` : "";
  els.precisionHud.textContent = `x: ${round(point.x)}, y: ${round(point.y)}${suffix}`;
}

function setActiveHandle(handle) {
  state.activeHandleKey = {
    commandIndex: handle.commandIndex,
    xIndex: handle.xIndex,
    yIndex: handle.yIndex
  };
  state.activePoint = { x: handle.x, y: handle.y };
  updatePrecisionHud(state.activePoint);
}

function isActiveHandle(handle) {
  const key = state.activeHandleKey;
  return (
    key &&
    key.commandIndex === handle.commandIndex &&
    key.xIndex === handle.xIndex &&
    key.yIndex === handle.yIndex
  );
}

function findActiveHandle() {
  if (!state.selected || !state.activeHandleKey) return null;
  const key = state.activeHandleKey;
  return (
    pathHandlesFor(state.selected).find(
      (handle) =>
        key.commandIndex === handle.commandIndex &&
        key.xIndex === handle.xIndex &&
        key.yIndex === handle.yIndex
    ) || null
  );
}

function pathHandlesFor(node) {
  const tag = node.tagName.toLowerCase();
  const d =
    tag === "path"
      ? node.getAttribute("d") || ""
      : tag === "polyline" || tag === "polygon"
        ? pointsToPath(node.getAttribute("points") || "", tag === "polygon")
        : "";
  if (!d) return [];
  state.pathCommands = parsePathData(d);
  return buildPathHandles(state.pathCommands);
}

function updateHandlePosition(handle, point) {
  const command = state.pathCommands[handle.commandIndex];
  if (!command) return;
  const actualPoint = { ...point };
  if (handle.xIndex !== null) {
    command.values[handle.xIndex] = round(handle.rel ? point.x - handle.base.x : point.x);
  } else {
    actualPoint.x = handle.x;
  }
  if (handle.yIndex !== null) {
    command.values[handle.yIndex] = round(handle.rel ? point.y - handle.base.y : point.y);
  } else {
    actualPoint.y = handle.y;
  }
  state.activePoint = actualPoint;
}

function nudgeActiveHandle(event) {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return false;
  const handle = findActiveHandle();
  if (!handle) return false;
  event.preventDefault();
  const step = event.shiftKey ? 10 : event.altKey ? 0.1 : 1;
  const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
  const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
  const point = { x: handle.x + dx, y: handle.y + dy };
  updateHandlePosition(handle, point);
  updatePrecisionHud(state.activePoint, "nudge");
  applyPathCommands();
  renderOverlay();
  return true;
}

function nudgeSelection(event) {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return false;
  const targets = topLevelSelection();
  if (!targets.length || !state.svg) return false;
  event.preventDefault();
  const step = event.shiftKey ? 10 : event.altKey ? 0.1 : 1;
  const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
  const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
  const rootMatrix = state.svg.getScreenCTM?.();
  const screenDelta = rootMatrix ? transformDelta(rootMatrix, dx, dy) : { x: dx, y: dy };
  targets.forEach((node) => {
    translateNodeBy(
      {
        node,
        geometry: captureElementGeometry(node),
        transform: node.getAttribute("transform") || ""
      },
      screenDelta.x,
      screenDelta.y
    );
  });
  afterMutation(false);
  return true;
}

function positionHandleAwayFromElement(handle, box, scale) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  let dx = handle.x - cx;
  let dy = handle.y - cy;
  if (!Math.hypot(dx, dy)) {
    dx = 1;
    dy = -1;
  }
  const length = Math.hypot(dx, dy);
  const offset = 74 / scale;
  handle.offsetX = (dx / length) * offset;
  handle.offsetY = (dy / length) * offset;
  handle.displayX = handle.x + handle.offsetX;
  handle.displayY = handle.y + handle.offsetY;
}

function pointToward(from, to, distance) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x: from.x + (dx / length) * distance,
    y: from.y + (dy / length) * distance
  };
}

function renderOverlay() {
  if (!state.svg) return;
  state.svg.querySelectorAll(".lab-overlay").forEach((node) => node.remove());
  if (!state.selection.length) return;
  const rootMatrix = state.svg.getScreenCTM?.();
  if (!rootMatrix) return;
  const rootInverse = rootMatrix.inverse();

  const overlay = document.createElementNS(SVG_NS, "g");
  overlay.classList.add("lab-overlay");

  state.selection.forEach((node) => {
    const matrix = node.getScreenCTM?.();
    if (!matrix) return;
    let box;
    try {
      box = node.getBBox();
    } catch {
      return;
    }

    // Position the per-node overlay in root coordinates via the node's full
    // local-to-root matrix, so ancestor transforms are respected.
    const toRoot = rootInverse.multiply(matrix);
    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("transform", `matrix(${toRoot.a} ${toRoot.b} ${toRoot.c} ${toRoot.d} ${toRoot.e} ${toRoot.f})`);
    const scale = screenScaleOf(node);
    const boxGap = 8 / scale;

    const rect = document.createElementNS(SVG_NS, "rect");
    rect.classList.add("lab-overlay-box");
    rect.setAttribute("x", box.x - boxGap);
    rect.setAttribute("y", box.y - boxGap);
    rect.setAttribute("width", box.width + boxGap * 2);
    rect.setAttribute("height", box.height + boxGap * 2);
    group.append(rect);

    if (node === state.selected) {
      appendPathHandles(group, node, box, scale);
      if (state.selection.length === 1) {
        appendTransformHandles(group, node, box, boxGap, scale);
      }
    }
    overlay.append(group);
  });

  if (state.snapPoint) {
    const rootScale = screenScaleOf(state.svg);
    const guideSize = 7 / rootScale;
    const guideH = document.createElementNS(SVG_NS, "line");
    guideH.classList.add("lab-snap-guide");
    guideH.setAttribute("x1", state.snapPoint.x - guideSize);
    guideH.setAttribute("y1", state.snapPoint.y);
    guideH.setAttribute("x2", state.snapPoint.x + guideSize);
    guideH.setAttribute("y2", state.snapPoint.y);
    const guideV = document.createElementNS(SVG_NS, "line");
    guideV.classList.add("lab-snap-guide");
    guideV.setAttribute("x1", state.snapPoint.x);
    guideV.setAttribute("y1", state.snapPoint.y - guideSize);
    guideV.setAttribute("x2", state.snapPoint.x);
    guideV.setAttribute("y2", state.snapPoint.y + guideSize);
    overlay.append(guideH, guideV);
  }

  state.svg.append(overlay);
}

function appendPathHandles(group, node, box, scale) {
  pathHandlesFor(node).forEach((handle) => {
    positionHandleAwayFromElement(handle, box, scale);
    const spokeStart = pointToward(handle, { x: handle.displayX, y: handle.displayY }, 5 / scale);

    const spoke = document.createElementNS(SVG_NS, "line");
    spoke.classList.add("lab-handle-spoke");
    spoke.setAttribute("x1", spokeStart.x);
    spoke.setAttribute("y1", spokeStart.y);
    spoke.setAttribute("x2", handle.displayX);
    spoke.setAttribute("y2", handle.displayY);
    group.append(spoke);

    if (handle.link) {
      const line = document.createElementNS(SVG_NS, "line");
      line.classList.add("lab-handle-line");
      line.setAttribute("x1", handle.link.x);
      line.setAttribute("y1", handle.link.y);
      const controlEnd = pointToward(handle, handle.link, 4 / scale);
      line.setAttribute("x2", controlEnd.x);
      line.setAttribute("y2", controlEnd.y);
      group.append(line);
    }

    const circle = document.createElementNS(SVG_NS, "circle");
    circle.classList.add("lab-handle", handle.kind);
    if (isActiveHandle(handle)) circle.classList.add("active");
    circle.setAttribute("cx", handle.displayX);
    circle.setAttribute("cy", handle.displayY);
    circle.setAttribute("r", 4 / scale);
    circle.addEventListener("pointerdown", (event) => startHandleDrag(event, handle));
    group.append(circle);
  });
}

function appendTransformHandles(group, node, box, boxGap, scale) {
  if (box.width < 1e-6 && box.height < 1e-6) return;
  const size = 7 / scale;
  const cursors = {
    nw: "nwse-resize",
    se: "nwse-resize",
    ne: "nesw-resize",
    sw: "nesw-resize",
    n: "ns-resize",
    s: "ns-resize",
    w: "ew-resize",
    e: "ew-resize"
  };
  const positions = [
    ["nw", 0, 0],
    ["n", 0.5, 0],
    ["ne", 1, 0],
    ["w", 0, 0.5],
    ["e", 1, 0.5],
    ["sw", 0, 1],
    ["s", 0.5, 1],
    ["se", 1, 1]
  ];

  positions.forEach(([key, tx, ty]) => {
    const x = box.x + tx * box.width + (tx - 0.5) * 2 * boxGap;
    const y = box.y + ty * box.height + (ty - 0.5) * 2 * boxGap;
    const handleRect = document.createElementNS(SVG_NS, "rect");
    handleRect.classList.add("lab-resize-handle");
    handleRect.setAttribute("x", x - size / 2);
    handleRect.setAttribute("y", y - size / 2);
    handleRect.setAttribute("width", size);
    handleRect.setAttribute("height", size);
    handleRect.style.cursor = cursors[key];
    handleRect.addEventListener("pointerdown", (event) =>
      startResizeDrag(event, node, {
        scaleX: tx !== 0.5,
        scaleY: ty !== 0.5,
        anchor: {
          x: box.x + (1 - tx) * box.width,
          y: box.y + (1 - ty) * box.height
        }
      })
    );
    group.append(handleRect);
  });

  const cx = box.x + box.width / 2;
  const knobY = box.y - boxGap - 18 / scale;
  const stem = document.createElementNS(SVG_NS, "line");
  stem.classList.add("lab-rotate-line");
  stem.setAttribute("x1", cx);
  stem.setAttribute("y1", box.y - boxGap);
  stem.setAttribute("x2", cx);
  stem.setAttribute("y2", knobY);
  group.append(stem);

  const knob = document.createElementNS(SVG_NS, "circle");
  knob.classList.add("lab-rotate-handle");
  knob.setAttribute("cx", cx);
  knob.setAttribute("cy", knobY);
  knob.setAttribute("r", 4.5 / scale);
  knob.addEventListener("pointerdown", (event) =>
    startRotateDrag(event, node, { cx, cy: box.y + box.height / 2 })
  );
  group.append(knob);
}

/* -------------------------------------------------- marquee, pan, zoom, fit */

function startMarquee(event) {
  event.preventDefault();
  const additive = event.shiftKey;
  const startX = event.clientX;
  const startY = event.clientY;
  const band = document.createElement("div");
  band.className = "rubber-band";
  band.style.left = `${startX}px`;
  band.style.top = `${startY}px`;
  document.body.append(band);
  let moved = false;

  const frame = (ev) => ({
    left: Math.min(startX, ev.clientX),
    top: Math.min(startY, ev.clientY),
    width: Math.abs(ev.clientX - startX),
    height: Math.abs(ev.clientY - startY)
  });

  const onMove = (ev) => {
    const rect = frame(ev);
    if (rect.width + rect.height > 6) moved = true;
    band.style.left = `${rect.left}px`;
    band.style.top = `${rect.top}px`;
    band.style.width = `${rect.width}px`;
    band.style.height = `${rect.height}px`;
  };

  const onUp = (ev) => {
    window.removeEventListener("pointermove", onMove);
    band.remove();
    if (!moved) {
      if (!additive) setSelection([]);
      return;
    }
    state.suppressClick = true;
    const rect = frame(ev);
    const bounds = { left: rect.left, top: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height };
    let hits = getVectors().filter((node) => {
      const screenRect = screenRectOf(node);
      return (
        screenRect &&
        screenRect.left < bounds.right &&
        screenRect.right > bounds.left &&
        screenRect.top < bounds.bottom &&
        screenRect.bottom > bounds.top
      );
    });
    hits = hits.filter((node) => !hits.some((other) => other !== node && other.contains(node)));
    setSelection(additive ? [...state.selection, ...hits] : hits);
    setStatus(hits.length ? `${hits.length} element(s) selected.` : "Nothing inside the selection box.");
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

function startPan(event) {
  event.preventDefault();
  const start = {
    x: event.clientX,
    y: event.clientY,
    left: els.stage.scrollLeft,
    top: els.stage.scrollTop
  };
  els.stage.classList.add("panning-active");
  const onMove = (ev) => {
    els.stage.scrollLeft = start.left - (ev.clientX - start.x);
    els.stage.scrollTop = start.top - (ev.clientY - start.y);
  };
  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    els.stage.classList.remove("panning-active");
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

function setZoom(zoom) {
  state.zoom = Math.min(12, Math.max(0.1, Number(zoom) || 1));
  if (state.svg) applySvgZoom(state.svg);
  els.zoomInput.value = String(Math.round(state.zoom * 100));
  document.querySelectorAll("[data-zoom]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.zoom) === state.zoom);
  });
}

// Zoom keeping the point under the cursor fixed.
function zoomAtCursor(multiplier, clientX, clientY) {
  if (!state.svg) {
    setZoom(state.zoom * multiplier);
    return;
  }
  const before = state.svg.getBoundingClientRect();
  const fx = (clientX - before.left) / (before.width || 1);
  const fy = (clientY - before.top) / (before.height || 1);
  setZoom(state.zoom * multiplier);
  const after = state.svg.getBoundingClientRect();
  els.stage.scrollLeft += after.left + fx * after.width - clientX;
  els.stage.scrollTop += after.top + fy * after.height - clientY;
}

function fitToView() {
  if (!state.svg) {
    setZoom(1);
    return;
  }
  const width = Number(state.svg.dataset.baseWidth) || 640;
  const height = Number(state.svg.dataset.baseHeight) || 420;
  const margin = 48;
  const zoom = Math.min(
    (els.stage.clientWidth - margin) / width,
    (els.stage.clientHeight - margin) / height
  );
  setZoom(zoom);
  els.stage.scrollLeft = (els.stage.scrollWidth - els.stage.clientWidth) / 2;
  els.stage.scrollTop = (els.stage.scrollHeight - els.stage.clientHeight) / 2;
  setStatus(`Fit to view at ${Math.round(state.zoom * 100)}%.`);
}

/* -------------------------------------------------------- mutation, history */

function afterMutation(full = true) {
  if (state.drag) {
    syncSourceThrottled();
    renderOverlay();
    return;
  }
  syncSource();
  renderOverlay();
  refreshLayers();
  if (full) refreshInspector();
  pushHistory();
}

function serializeCurrentSvg() {
  const clone = state.svg.cloneNode(true);
  clone.querySelectorAll(".lab-overlay").forEach((node) => node.remove());
  clone.style.removeProperty("width");
  clone.style.removeProperty("height");
  const color = getSvgBackground();
  if (!color) {
    clone.style.removeProperty("background-color");
  } else {
    clone.style.setProperty("background-color", color);
  }
  if (!clone.getAttribute("style")) clone.removeAttribute("style");
  clone.removeAttribute("data-base-width");
  clone.removeAttribute("data-base-height");
  return new XMLSerializer().serializeToString(clone);
}

function syncSource() {
  if (!state.svg) return;
  if (sourceSyncTimer) {
    clearTimeout(sourceSyncTimer);
    sourceSyncTimer = 0;
  }
  els.svgInput.value = serializeCurrentSvg();
  scheduleAutosave();
}

// During drags the full-document serialization is throttled: re-serializing on
// every pointermove is the single most expensive part of a drag on large files.
function syncSourceThrottled() {
  if (sourceSyncTimer) return;
  sourceSyncTimer = setTimeout(() => {
    sourceSyncTimer = 0;
    if (state.svg) {
      els.svgInput.value = serializeCurrentSvg();
      scheduleAutosave();
    }
  }, 150);
}

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    try {
      if (state.svg) localStorage.setItem(AUTOSAVE_KEY, serializeCurrentSvg());
    } catch {
      /* storage unavailable (private mode etc.) — autosave silently off */
    }
  }, 400);
}

function pushHistory(reset = false) {
  if (!state.svg || state.restoring) return;
  const snapshot = serializeCurrentSvg();
  if (reset) {
    state.history = [snapshot];
    state.historyIndex = 0;
    updateHistoryButtons();
    return;
  }
  if (state.history[state.historyIndex] === snapshot) {
    updateHistoryButtons();
    return;
  }
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(snapshot);
  let totalBytes = state.history.reduce((sum, entry) => sum + entry.length, 0);
  while (state.history.length > 80 || (totalBytes > 8_000_000 && state.history.length > 2)) {
    totalBytes -= state.history[0].length;
    state.history.shift();
  }
  state.historyIndex = state.history.length - 1;
  updateHistoryButtons();
}

function restoreHistory(index) {
  if (index < 0 || index >= state.history.length) return;
  const previousVectors = getVectors();
  const selectedIndices = state.selection
    .map((node) => previousVectors.indexOf(node))
    .filter((position) => position >= 0);
  state.restoring = true;
  state.historyIndex = index;
  loadSvg(state.history[state.historyIndex], { recordHistory: false });
  state.restoring = false;
  const vectors = getVectors();
  setSelection(selectedIndices.map((position) => vectors[position]).filter(Boolean));
  updateHistoryButtons();
  setStatus("History restored.");
}

function undo() {
  restoreHistory(state.historyIndex - 1);
}

function redo() {
  restoreHistory(state.historyIndex + 1);
}

function updateHistoryButtons() {
  els.undoBtn.disabled = state.historyIndex <= 0;
  els.redoBtn.disabled = state.historyIndex < 0 || state.historyIndex >= state.history.length - 1;
}

/* ----------------------------------------------------------------- editing */

// Paints are written as attributes only (no inline style), keeping the export
// clean and letting CSS/inheritance keep working.
function applyPaint(name, value) {
  if (!state.selection.length) return;
  state.selection.forEach((node) => {
    if (value === "") {
      node.removeAttribute(name);
    } else {
      node.setAttribute(name, value);
    }
    node.style.removeProperty(name);
  });
  afterMutation();
}

function applyColorPaint(name) {
  if (!state.selection.length) return;
  const colorInput = name === "fill" ? els.fillInput : els.strokeInput;
  const alphaInput = name === "fill" ? els.fillAlphaInput : els.strokeAlphaInput;
  const output = name === "fill" ? els.fillAlphaOutput : els.strokeAlphaOutput;
  const alphaPercent = Number(alphaInput.value || 100);
  output.textContent = `${alphaPercent}%`;
  const value =
    alphaPercent <= 0 ? "none" : alphaPercent >= 100 ? colorInput.value : hexToRgba(colorInput.value, alphaPercent / 100);
  let replacedPaintRefs = 0;
  state.selection.forEach((node) => {
    if ((node.getAttribute(name) || "").trim().startsWith("url(")) replacedPaintRefs += 1;
    node.setAttribute(name, value);
    node.style.removeProperty(name);
  });
  afterMutation();
  if (replacedPaintRefs) {
    setStatus(`Replaced a url() gradient/pattern ${name} with a solid color on ${replacedPaintRefs} element(s).`);
  }
}

function applyTransform() {
  if (!state.selection.length) return;
  const tx = Number(els.translateXInput.value || 0);
  const ty = Number(els.translateYInput.value || 0);
  const scale = Number(els.scaleInput.value || 1);
  const rotate = Number(els.rotateInput.value || 0);
  state.selection.forEach((node) => {
    const existing = node.getAttribute("transform") || "";
    const transform = `translate(${tx} ${ty}) scale(${scale}) rotate(${rotate}) ${existing}`.trim();
    node.setAttribute("transform", transform);
  });
  els.translateXInput.value = "0";
  els.translateYInput.value = "0";
  els.scaleInput.value = "1";
  els.rotateInput.value = "0";
  afterMutation();
}

function moveLayer(direction) {
  const node = state.selected;
  if (!node || !node.parentNode) return;
  if (direction > 0) {
    let next = node.nextElementSibling;
    while (next && next.classList.contains("lab-overlay")) next = next.nextElementSibling;
    if (next) node.parentNode.insertBefore(node, next.nextSibling);
  } else {
    const previous = node.previousElementSibling;
    if (previous) node.parentNode.insertBefore(node, previous);
  }
  afterMutation();
}

function deleteSelected() {
  if (!state.selection.length) return;
  const count = state.selection.length;
  state.selection.forEach((node) => node.remove());
  setSelection([]);
  afterMutation();
  setStatus(`Deleted ${count} element(s).`);
}

function duplicateSelected() {
  const targets = topLevelSelection().filter((node) => node.parentNode);
  if (!targets.length) return;
  const clones = targets.map((node) => {
    const clone = node.cloneNode(true);
    clone.removeAttribute("id");
    clone.setAttribute("transform", `translate(18 18) ${clone.getAttribute("transform") || ""}`.trim());
    node.parentNode.insertBefore(clone, node.nextSibling);
    return clone;
  });
  setSelection(clones);
  afterMutation();
  setStatus(`Duplicated ${clones.length} element(s).`);
}

function convertSelectedToPath() {
  if (!state.selection.length) return;
  const nextSelection = [];
  let converted = 0;
  state.selection.forEach((node) => {
    if (node.tagName.toLowerCase() === "path" || !node.parentNode) {
      nextSelection.push(node);
      return;
    }
    const d = shapeToPath(node);
    if (!d) {
      nextSelection.push(node);
      return;
    }
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    [...node.attributes].forEach((attr) => {
      if (!GEOMETRY_ATTRS.includes(attr.name)) {
        path.setAttribute(attr.name, attr.value);
      }
    });
    node.parentNode.replaceChild(path, node);
    nextSelection.push(path);
    converted += 1;
  });
  if (!converted) {
    setStatus("Selection has no convertible shapes.", true);
    return;
  }
  setSelection(nextSelection);
  afterMutation();
  setStatus(`Converted ${converted} shape(s) to path.`);
}

/* ---------------------------------------------------------------- input/out */

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through to execCommand (file:// and other non-secure contexts) */
    }
  }
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.append(helper);
  helper.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  helper.remove();
  return copied;
}

async function downloadPng() {
  if (!state.svg) return;
  const svgText = serializeCurrentSvg();
  const size = getSvgBaseSize(state.svg);
  const scale = Math.max(1, Number(state.pngScale || 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(size.width * scale);
  canvas.height = Math.round(size.height * scale);
  const ctx = canvas.getContext("2d");
  const color = getSvgBackground();
  if (color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const image = new Image();
  const blob = new Blob([svgText], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = url;
  });
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);

  canvas.toBlob((pngBlob) => {
    if (!pngBlob) {
      setStatus("PNG export failed.", true);
      return;
    }
    downloadBlob(pngBlob, `vector-lab-export-${scale}x.png`);
    setStatus(`PNG downloaded at ${canvas.width}x${canvas.height}.`);
  }, "image/png");
}

/* -------------------------------------------------------------------- wire */

function decorateButtons() {
  [
    [els.loadSampleBtn, "sample"],
    [els.copySvgBtn, "copy"],
    [els.downloadSvgBtn, "download"],
    [els.downloadPngBtn, "download"],
    [els.loadInputBtn, "load"],
    [els.refreshLayersBtn, "refresh"],
    [els.fitBtn, "fit"],
    [els.toggleSourceBtn, "panelLeft"],
    [els.toggleInspectorBtn, "panelRight"],
    [els.undoBtn, "undo"],
    [els.redoBtn, "redo"],
    [els.convertPathBtn, "path"],
    [els.deleteBtn, "trash"],
    [els.duplicateBtn, "duplicate"],
    [els.fillNoneBtn, "slash"],
    [els.strokeNoneBtn, "slash"],
    [els.bringForwardBtn, "forward"],
    [els.sendBackwardBtn, "backward"],
    [els.applyTransformBtn, "check"],
    [els.normalizePathBtn, "path"],
    [els.setAttrBtn, "check"]
  ].forEach(([button, iconName]) => decorateButton(button, iconName));
}

decorateButtons();
[
  els.refreshLayersBtn,
  els.toggleSourceBtn,
  els.toggleInspectorBtn,
  els.undoBtn,
  els.redoBtn,
  els.deleteBtn,
  els.duplicateBtn
].forEach(iconOnly);

els.loadInputBtn.addEventListener("click", () => loadSvg(els.svgInput.value));
els.loadSampleBtn.addEventListener("click", () => loadSvg(SAMPLE_SVG));
els.refreshLayersBtn.addEventListener("click", refreshLayers);
els.fileInput.addEventListener("change", async () => {
  const file = els.fileInput.files[0];
  if (!file) return;
  loadSvg(await file.text());
  els.fileInput.value = "";
});
els.copySvgBtn.addEventListener("click", async () => {
  if (!state.svg) return;
  const copied = await copyText(serializeCurrentSvg());
  setStatus(copied ? "SVG copied." : "Copy failed — copy the source panel text manually.", !copied);
});
els.downloadSvgBtn.addEventListener("click", () => {
  if (!state.svg) return;
  const blob = new Blob([serializeCurrentSvg()], { type: "image/svg+xml" });
  downloadBlob(blob, "vector-lab-export.svg");
  setStatus("SVG downloaded.");
});
els.downloadPngBtn.addEventListener("click", () => {
  downloadPng().catch((error) => {
    setStatus(`PNG export failed: ${error.message}`, true);
  });
});
els.pngScaleInput.addEventListener("change", () => {
  state.pngScale = Number(els.pngScaleInput.value || 1);
  setStatus(`PNG export scale set to ${state.pngScale}x.`);
});
els.backgroundInput.addEventListener("input", () => {
  state.backgroundColor = els.backgroundInput.value;
  applyBackgroundColor();
  syncSource();
});
els.backgroundAlphaInput.addEventListener("input", () => {
  state.backgroundAlpha = Math.min(1, Math.max(0, Number(els.backgroundAlphaInput.value || 0) / 100));
  els.backgroundAlphaOutput.textContent = `${Math.round(state.backgroundAlpha * 100)}%`;
  applyBackgroundColor();
  syncSource();
});
els.fitBtn.addEventListener("click", fitToView);
els.toggleSourceBtn.addEventListener("click", () => {
  els.appShell.classList.toggle("hide-source");
  els.toggleSourceBtn.classList.toggle("active", els.appShell.classList.contains("hide-source"));
});
els.toggleInspectorBtn.addEventListener("click", () => {
  els.appShell.classList.toggle("hide-inspector");
  els.toggleInspectorBtn.classList.toggle("active", els.appShell.classList.contains("hide-inspector"));
});
els.undoBtn.addEventListener("click", undo);
els.redoBtn.addEventListener("click", redo);
document.querySelectorAll("[data-zoom]").forEach((button) => {
  button.addEventListener("click", () => {
    setZoom(Number(button.dataset.zoom));
  });
});
els.zoomInput.addEventListener("change", () => {
  setZoom(Number(els.zoomInput.value) / 100);
});
els.snapToggle.addEventListener("change", () => {
  state.snapEnabled = els.snapToggle.checked;
  state.snapPoint = null;
  renderOverlay();
  setStatus(state.snapEnabled ? "Snap enabled." : "Snap disabled.");
});
els.stage.addEventListener(
  "wheel",
  (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    zoomAtCursor(event.deltaY < 0 ? 1.08 : 0.92, event.clientX, event.clientY);
  },
  { passive: false }
);
els.stage.addEventListener("pointerdown", (event) => {
  const stageRect = els.stage.getBoundingClientRect();
  if (
    event.clientX - stageRect.left > els.stage.clientWidth ||
    event.clientY - stageRect.top > els.stage.clientHeight
  ) {
    return; // scrollbar click
  }
  if (state.spacePan || event.button === 1) {
    startPan(event);
    return;
  }
  if (event.button !== 0 || state.drag || !state.svg) return;
  const target = event.target;
  if (target.closest(".lab-overlay")) return;
  if (target.closest(VECTOR_SELECTOR) && state.svg.contains(target)) return;
  startMarquee(event);
});
els.stage.addEventListener("dragover", (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
});
els.stage.addEventListener("drop", async (event) => {
  event.preventDefault();
  const file = event.dataTransfer.files && event.dataTransfer.files[0];
  if (file && (file.type === "image/svg+xml" || /\.svg$/i.test(file.name))) {
    loadSvg(await file.text());
    setStatus(`Loaded ${file.name}.`);
    return;
  }
  const text = event.dataTransfer.getData("text/plain") || "";
  if (/<svg[\s>]/i.test(text)) {
    loadSvg(text);
    return;
  }
  setStatus("Drop an .svg file or SVG markup onto the canvas.", true);
});
els.deleteBtn.addEventListener("click", deleteSelected);
els.duplicateBtn.addEventListener("click", duplicateSelected);
els.convertPathBtn.addEventListener("click", convertSelectedToPath);
els.fillInput.addEventListener("input", () => applyColorPaint("fill"));
els.fillAlphaInput.addEventListener("input", () => applyColorPaint("fill"));
els.strokeInput.addEventListener("input", () => applyColorPaint("stroke"));
els.strokeAlphaInput.addEventListener("input", () => applyColorPaint("stroke"));
els.strokeWidthInput.addEventListener("input", () => applyPaint("stroke-width", els.strokeWidthInput.value));
els.opacityInput.addEventListener("input", () => applyPaint("opacity", els.opacityInput.value));
els.fillNoneBtn.addEventListener("click", () => {
  els.fillAlphaInput.value = "0";
  els.fillAlphaOutput.textContent = "0%";
  applyPaint("fill", "none");
});
els.strokeNoneBtn.addEventListener("click", () => {
  els.strokeAlphaInput.value = "0";
  els.strokeAlphaOutput.textContent = "0%";
  applyPaint("stroke", "none");
});
els.bringForwardBtn.addEventListener("click", () => moveLayer(1));
els.sendBackwardBtn.addEventListener("click", () => moveLayer(-1));
els.applyTransformBtn.addEventListener("click", applyTransform);
els.pathInput.addEventListener("input", () => {
  const node = state.selected;
  if (!node) return;
  const tag = node.tagName.toLowerCase();
  const commands = parsePathData(els.pathInput.value);
  if (tag === "path") {
    node.setAttribute("d", els.pathInput.value);
  } else if (tag === "polyline" || tag === "polygon") {
    const dropped = commands.filter((command) => !["m", "l", "z"].includes(command.code.toLowerCase())).length;
    node.setAttribute("points", pathToPoints(commands));
    if (dropped) {
      setStatus(
        `<${tag}> keeps straight M/L points only — ${dropped} curve/arc command(s) dropped. Convert to path to keep curves.`,
        true
      );
    }
  }
  state.pathCommands = commands;
  renderPathTable();
  afterMutation(false);
});
els.normalizePathBtn.addEventListener("click", () => {
  if (!state.selected) return;
  state.pathCommands = parsePathData(els.pathInput.value);
  applyPathCommands();
  renderPathTable();
});
els.setAttrBtn.addEventListener("click", () => {
  const name = els.attrNameInput.value.trim();
  if (!state.selection.length || !name) return;
  let applied = 0;
  state.selection.forEach((node) => {
    if (safeSetAttribute(node, name, els.attrValueInput.value)) applied += 1;
  });
  if (!applied) return;
  els.attrNameInput.value = "";
  els.attrValueInput.value = "";
  afterMutation();
  setStatus(`Set ${name} on ${applied} element(s).`);
});

document.addEventListener("paste", (event) => {
  if (event.target.matches?.("input,textarea")) return;
  const text = event.clipboardData?.getData("text/plain") || "";
  if (/<svg[\s>]/i.test(text)) {
    event.preventDefault();
    loadSvg(text);
    setStatus("SVG pasted and loaded.");
  }
});

document.addEventListener("keydown", (event) => {
  // Never hijack shortcuts while the user is typing — native undo in the
  // source textarea and inputs must keep working.
  if (event.target.matches?.("input,textarea,select")) return;
  const mod = event.ctrlKey || event.metaKey;
  if (mod && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) redo();
    else undo();
    return;
  }
  if (mod && event.key.toLowerCase() === "y") {
    event.preventDefault();
    redo();
    return;
  }
  if (event.key === "Escape") {
    if (state.selection.length) {
      setSelection([]);
      setStatus("Selection cleared.");
    }
    return;
  }
  if (event.code === "Space") {
    event.preventDefault();
    if (!event.repeat) {
      state.spacePan = true;
      els.stage.classList.add("pan-ready");
    }
    return;
  }
  if (nudgeActiveHandle(event)) return;
  if (nudgeSelection(event)) return;
  if (event.key === "Delete" || event.key === "Backspace") {
    deleteSelected();
    return;
  }
  if (mod && event.key.toLowerCase() === "d") {
    event.preventDefault();
    duplicateSelected();
  }
});
document.addEventListener("keyup", (event) => {
  if (event.code === "Space") {
    state.spacePan = false;
    els.stage.classList.remove("pan-ready");
  }
});
window.addEventListener("blur", () => {
  state.spacePan = false;
  els.stage.classList.remove("pan-ready");
});
window.addEventListener("beforeunload", () => {
  try {
    if (state.svg) localStorage.setItem(AUTOSAVE_KEY, serializeCurrentSvg());
  } catch {
    /* storage unavailable */
  }
});

let autosaved = null;
try {
  autosaved = localStorage.getItem(AUTOSAVE_KEY);
} catch {
  autosaved = null;
}
if (autosaved && /<svg[\s>]/i.test(autosaved)) {
  loadSvg(autosaved);
  setStatus("Restored your last session from autosave — load Sample to start fresh.");
} else {
  loadSvg(SAMPLE_SVG);
}
