// Main application: state, selection, drag interactions, inspector, history, IO.
// Depends on js/path-data.js, js/svg-utils.js and js/icons.js being loaded first.

const AUTOSAVE_KEY = "svg-vector-lab:autosave";
const LOCAL_SAVE_KEY = "svg-vector-lab:manual-save";
const LOCAL_SAVE_TIME_KEY = "svg-vector-lab:manual-save-time";
const GEOMETRY_ATTRS = ["x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "width", "height", "points"];

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" width="640" height="420">
  <text x="64" y="72" font-size="34" font-family="Arial, sans-serif" font-weight="700" fill="#071d3d">SVG Vector Lab</text>
  <text x="64" y="102" font-size="16" font-family="Arial, sans-serif" fill="#586a82">Edit paths. See the source. Keep files local.</text>
  <path id="curve" d="M 72 278 C 148 104 246 104 322 278 S 502 410 568 188" fill="none" stroke="#276ef1" stroke-width="12" stroke-linecap="round"/>
</svg>`;

const STARTER_SVGS = {
  path: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" width="640" height="420">
  <path id="editable-path" d="M 72 300 C 128 92 256 92 320 244 S 486 406 568 142" fill="none" stroke="#276ef1" stroke-width="14" stroke-linecap="round"/>
</svg>`,
  shapes: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" width="640" height="420">
  <rect id="rounded-rectangle" x="72" y="82" width="212" height="148" rx="28" fill="#276ef1"/>
  <circle id="circle" cx="436" cy="156" r="76" fill="#0aaaa6"/>
  <polygon id="polygon" points="172,278 244,374 100,374" fill="#f0a233"/>
</svg>`,
  png: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" width="640" height="420">
  <rect width="640" height="420" rx="32" fill="#edf4ff"/>
  <circle cx="210" cy="210" r="112" fill="#276ef1"/>
  <path d="M 326 296 L 430 116 L 534 296 Z" fill="#0aaaa6"/>
  <text x="320" y="374" text-anchor="middle" font-size="22" font-family="Arial, sans-serif" fill="#071d3d">Ready to export as PNG</text>
</svg>`,
  blank: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" width="640" height="420"></svg>`
};

const els = {
  appShell: document.querySelector(".app-shell"),
  svgInput: document.querySelector("#svgInput"),
  loadInputBtn: document.querySelector("#loadInputBtn"),
  loadSampleBtn: document.querySelector("#loadSampleBtn"),
  saveLocalBtn: document.querySelector("#saveLocalBtn"),
  restoreLocalBtn: document.querySelector("#restoreLocalBtn"),
  checkpointMeta: document.querySelector("#checkpointMeta"),
  fileInput: document.querySelector("#fileInput"),
  copySvgBtn: document.querySelector("#copySvgBtn"),
  downloadSvgBtn: document.querySelector("#downloadSvgBtn"),
  downloadPngBtn: document.querySelector("#downloadPngBtn"),
  pngScaleInput: document.querySelector("#pngScaleInput"),
  pngWidthInput: document.querySelector("#pngWidthInput"),
  pngHeightInput: document.querySelector("#pngHeightInput"),
  backgroundInput: document.querySelector("#backgroundInput"),
  backgroundHexInput: document.querySelector("#backgroundHexInput"),
  backgroundAlphaInput: document.querySelector("#backgroundAlphaInput"),
  backgroundAlphaOutput: document.querySelector("#backgroundAlphaOutput"),
  canvasWidthInput: document.querySelector("#canvasWidthInput"),
  canvasHeightInput: document.querySelector("#canvasHeightInput"),
  canvasRatioToggle: document.querySelector("#canvasRatioToggle"),
  applyCanvasSizeBtn: document.querySelector("#applyCanvasSizeBtn"),
  statusLine: document.querySelector("#statusLine"),
  layerList: document.querySelector("#layerList"),
  refreshLayersBtn: document.querySelector("#refreshLayersBtn"),
  svgMount: document.querySelector("#svgMount"),
  stage: document.querySelector("#stage"),
  precisionHud: document.querySelector("#precisionHud"),
  zoomInput: document.querySelector("#zoomInput"),
  snapToggle: document.querySelector("#snapToggle"),
  gridToggle: document.querySelector("#gridToggle"),
  gridSizeInput: document.querySelector("#gridSizeInput"),
  handToolBtn: document.querySelector("#handToolBtn"),
  freehandToolBtn: document.querySelector("#freehandToolBtn"),
  penToolBtn: document.querySelector("#penToolBtn"),
  imageInput: document.querySelector("#imageInput"),
  fitBtn: document.querySelector("#fitBtn"),
  toggleSourceBtn: document.querySelector("#toggleSourceBtn"),
  toggleInspectorBtn: document.querySelector("#toggleInspectorBtn"),
  mobileSourceBtn: document.querySelector("#mobileSourceBtn"),
  mobileInspectorBtn: document.querySelector("#mobileInspectorBtn"),
  undoBtn: document.querySelector("#undoBtn"),
  redoBtn: document.querySelector("#redoBtn"),
  convertPathBtn: document.querySelector("#convertPathBtn"),
  deleteBtn: document.querySelector("#deleteBtn"),
  duplicateBtn: document.querySelector("#duplicateBtn"),
  groupBtn: document.querySelector("#groupBtn"),
  ungroupBtn: document.querySelector("#ungroupBtn"),
  selectedName: document.querySelector("#selectedName"),
  fillInput: document.querySelector("#fillInput"),
  fillHexInput: document.querySelector("#fillHexInput"),
  fillAlphaInput: document.querySelector("#fillAlphaInput"),
  fillAlphaOutput: document.querySelector("#fillAlphaOutput"),
  strokeInput: document.querySelector("#strokeInput"),
  strokeHexInput: document.querySelector("#strokeHexInput"),
  strokeAlphaInput: document.querySelector("#strokeAlphaInput"),
  strokeAlphaOutput: document.querySelector("#strokeAlphaOutput"),
  strokeWidthInput: document.querySelector("#strokeWidthInput"),
  strokeLinecapInput: document.querySelector("#strokeLinecapInput"),
  strokeLinejoinInput: document.querySelector("#strokeLinejoinInput"),
  strokeDashInput: document.querySelector("#strokeDashInput"),
  opacityInput: document.querySelector("#opacityInput"),
  fillNoneBtn: document.querySelector("#fillNoneBtn"),
  strokeNoneBtn: document.querySelector("#strokeNoneBtn"),
  gradientBtn: document.querySelector("#gradientBtn"),
  bringForwardBtn: document.querySelector("#bringForwardBtn"),
  sendBackwardBtn: document.querySelector("#sendBackwardBtn"),
  geometryControls: document.querySelector("#geometryControls"),
  dimensionSummary: document.querySelector("#dimensionSummary"),
  translateXInput: document.querySelector("#translateXInput"),
  translateYInput: document.querySelector("#translateYInput"),
  scaleInput: document.querySelector("#scaleInput"),
  rotateInput: document.querySelector("#rotateInput"),
  objectRatioToggle: document.querySelector("#objectRatioToggle"),
  applyTransformBtn: document.querySelector("#applyTransformBtn"),
  pathInput: document.querySelector("#pathInput"),
  normalizePathBtn: document.querySelector("#normalizePathBtn"),
  addNodeBtn: document.querySelector("#addNodeBtn"),
  removeNodeBtn: document.querySelector("#removeNodeBtn"),
  straightNodeBtn: document.querySelector("#straightNodeBtn"),
  curveNodeBtn: document.querySelector("#curveNodeBtn"),
  closePathBtn: document.querySelector("#closePathBtn"),
  joinPathsBtn: document.querySelector("#joinPathsBtn"),
  pathTable: document.querySelector("#pathTable"),
  attrList: document.querySelector("#attrList"),
  attrNameInput: document.querySelector("#attrNameInput"),
  attrValueInput: document.querySelector("#attrValueInput"),
  setAttrBtn: document.querySelector("#setAttrBtn"),
  learnPanel: document.querySelector("#learnPanel"),
  pasteDialog: document.querySelector("#pasteDialog"),
  pasteAsObjectsBtn: document.querySelector("#pasteAsObjectsBtn"),
  replaceFromPasteBtn: document.querySelector("#replaceFromPasteBtn")
};

function initializePanelTabs(tabList) {
  const tabs = [...tabList.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((tab) => document.getElementById(tab.dataset.tabTarget));

  function activateTab(nextTab, moveFocus = false) {
    let activePanel = null;
    tabs.forEach((tab, index) => {
      const active = tab === nextTab;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      if (panels[index]) {
        panels[index].hidden = !active;
        if (active) activePanel = panels[index];
      }
    });
    if (activePanel) requestAnimationFrame(() => window.requestAdsIn?.(activePanel));
    if (moveFocus) nextTab.focus();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (event) => {
      let nextIndex = index;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = tabs.length - 1;
      else return;
      event.preventDefault();
      activateTab(tabs[nextIndex], true);
    });
  });

  activateTab(tabs.find((tab) => tab.getAttribute("aria-selected") === "true") || tabs[0]);
}

document.querySelectorAll('[role="tablist"]').forEach(initializePanelTabs);

const compactMenus = [...document.querySelectorAll(".action-menu, .toolbar-menu")];
compactMenus.forEach((menu) => {
  menu.addEventListener("toggle", () => {
    if (!menu.open) return;
    compactMenus.forEach((other) => {
      if (other !== menu) other.open = false;
    });
  });
});
document.addEventListener("pointerdown", (event) => {
  compactMenus.forEach((menu) => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const hadOpenMenu = compactMenus.some((menu) => menu.open);
  compactMenus.forEach((menu) => {
    menu.open = false;
  });
  if (hadOpenMenu) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
});

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
  gridEnabled: true,
  gridSize: 16,
  tool: "select",
  drawing: null,
  selectedCommandIndex: -1,
  lockedNodes: new WeakSet(),
  lastPaint: { fill: new WeakMap(), stroke: new WeakMap() },
  clipboardMarkup: "",
  pendingPasteMarkup: "",
  dirty: false,
  documentDirty: false,
  lastManualSave: "",
  fitMode: true,
  spacePan: false,
  suppressClick: false
};

let sourceSyncTimer = 0;
let autosaveTimer = 0;

function setStatus(message, isError = false) {
  els.statusLine.setAttribute("role", isError ? "alert" : "status");
  els.statusLine.setAttribute("aria-live", isError ? "assertive" : "polite");
  els.statusLine.classList.toggle("error", isError);
  els.statusLine.textContent = message;
}

function setTool(tool) {
  state.tool = tool;
  const handActive = tool === "hand" || state.spacePan;
  els.handToolBtn.classList.toggle("active", tool === "hand");
  els.handToolBtn.setAttribute("aria-pressed", String(tool === "hand"));
  els.freehandToolBtn.classList.toggle("active", tool === "freehand");
  els.penToolBtn.classList.toggle("active", tool === "pen");
  els.stage.classList.toggle("hand-tool", handActive);
  updatePanCursor(handActive);
  if (tool !== "pen") finishDrawing(true);
  setStatus(`${tool === "select" ? "Select" : tool[0].toUpperCase() + tool.slice(1)} tool active.`);
}

function updatePanCursor(visible, event = null) {
  let cursor = document.querySelector(".pan-cursor");
  if (!visible) {
    cursor?.remove();
    return;
  }
  if (!cursor) {
    cursor = document.createElement("div");
    cursor.className = "pan-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7.5 12V7.5a1.5 1.5 0 0 1 3 0V11 5.5a1.5 1.5 0 0 1 3 0V11 6.5a1.5 1.5 0 0 1 3 0V12 9a1.5 1.5 0 0 1 3 0v5c0 4.4-2.6 7-7 7h-1c-2.2 0-3.5-1-4.8-2.7L4 14.8a1.6 1.6 0 0 1 2.4-2.1z"/></svg>';
    document.body.append(cursor);
  }
  if (event) {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  }
}

function localPointFromEvent(event) {
  const matrix = state.svg?.getScreenCTM?.();
  if (!matrix) return null;
  const point = clientPointToLocal(matrix.inverse(), event.clientX, event.clientY);
  if (!state.snapEnabled) return point;
  return {
    x: Math.round(point.x / state.gridSize) * state.gridSize,
    y: Math.round(point.y / state.gridSize) * state.gridSize
  };
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
  const surface = svg.closest(".svg-zoom-surface");
  if (!surface) return;
  surface.style.width = `${Math.max(1, width * state.zoom)}px`;
  surface.style.height = `${Math.max(1, height * state.zoom)}px`;
  surface.style.setProperty("--canvas-base-width", `${width}px`);
  surface.style.setProperty("--canvas-base-height", `${height}px`);
  surface.style.setProperty("--canvas-zoom", String(state.zoom));
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
    applyBackgroundColor(imported);
    imported.addEventListener("click", handleSvgClick);
    imported.addEventListener("pointerdown", handlePointerDown);

    const zoomSurface = document.createElement("div");
    zoomSurface.className = "svg-zoom-surface";
    zoomSurface.append(imported);
    els.svgMount.replaceChildren(zoomSurface);
    applySvgZoom(imported);
    state.svg = imported;
    state.lockedNodes = new WeakSet();
    state.lastPaint = { fill: new WeakMap(), stroke: new WeakMap() };
    state.selection = [];
    state.selected = null;
    state.activeHandleKey = null;
    state.activePoint = null;
    const canvasSize = getSvgBaseSize(imported);
    els.canvasWidthInput.value = String(Math.round(canvasSize.width * 100) / 100);
    els.canvasHeightInput.value = String(Math.round(canvasSize.height * 100) / 100);
    updatePrecisionHud();
    syncSource();
    refreshLayers();
    refreshInspector();
    if (options.recordHistory !== false) {
      pushHistory(true);
    }
    if (options.markClean !== false) state.documentDirty = false;
    setStatus("SVG loaded.");
    if (options.fit !== false) {
      requestAnimationFrame(() => fitToView({ announce: false }));
    }
    return true;
  } catch (error) {
    setStatus(error.message, true);
    return false;
  }
}

/* ---------------------------------------------------------------- selection */

function getVectors() {
  if (!state.svg) return [];
  return [...state.svg.querySelectorAll(VECTOR_SELECTOR)].filter((node) => !node.closest(".lab-overlay"));
}

function vectorAtBoundingPoint(clientX, clientY) {
  if (!state.svg) return null;
  const tolerance = 3;
  const containsPoint = (rect) => rect
    && clientX >= rect.left - tolerance
    && clientX <= rect.right + tolerance
    && clientY >= rect.top - tolerance
    && clientY <= rect.bottom + tolerance;

  if (state.selected) {
    const selectedRect = screenRectOf(state.selected);
    if (containsPoint(selectedRect)) return state.selected;
  }

  const rootRect = state.svg.getBoundingClientRect();
  const rootArea = Math.max(1, rootRect.width * rootRect.height);
  const candidates = getVectors()
    .map((node, index) => ({ node, index, rect: screenRectOf(node) }))
    .filter(({ node, rect }) => {
      if (!containsPoint(rect) || node.getAttribute("display") === "none") return false;
      const area = Math.max(0, (rect.right - rect.left) * (rect.bottom - rect.top));
      return area > 0 && area < rootArea * 0.9;
    })
    .filter(({ node }, _index, entries) => !entries.some(({ node: other }) => other !== node && node.contains(other)));

  candidates.sort((a, b) => {
    const areaA = (a.rect.right - a.rect.left) * (a.rect.bottom - a.rect.top);
    const areaB = (b.rect.right - b.rect.left) * (b.rect.bottom - b.rect.top);
    return areaA - areaB || b.index - a.index;
  });
  return candidates[0]?.node || null;
}

function suppressNextSvgClick() {
  state.suppressClick = true;
  setTimeout(() => {
    state.suppressClick = false;
  }, 0);
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

function isNodeLocked(node) {
  let current = node;
  while (current && current !== state.svg) {
    if (state.lockedNodes.has(current)) return true;
    current = current.parentNode;
  }
  return false;
}

function guardNodeEditable(node, operation = "edit this layer") {
  if (!node || !isNodeLocked(node)) return true;
  setStatus(`Locked layer protected. Unlock it in Layers before you ${operation}.`, true);
  return false;
}

function editableSelection(operation = "edit the selection") {
  const targets = state.selection.filter((node) => !isNodeLocked(node));
  const blocked = state.selection.length - targets.length;
  if (blocked) {
    setStatus(`${blocked} locked layer${blocked === 1 ? " was" : "s were"} protected. Unlock before you ${operation}.`, true);
  }
  return targets;
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
    const row = document.createElement("div");
    row.className = "layer-row";
    row.classList.toggle("locked", isNodeLocked(node));
    const nameCell = document.createElement("div");
    nameCell.className = "layer-name-cell";
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
    const renameInput = document.createElement("input");
    renameInput.className = "layer-rename-input";
    renameInput.type = "text";
    renameInput.hidden = true;
    renameInput.setAttribute("aria-label", `Layer name for ${labelFor(node, index)}`);
    nameCell.append(button, renameInput);
    const control = (label, title, action) => {
      const next = document.createElement("button");
      next.type = "button";
      next.textContent = label;
      next.title = title;
      next.setAttribute("aria-label", title);
      next.addEventListener("click", (event) => {
        event.stopPropagation();
        action();
      });
      return next;
    };
    const rename = control("R", "Rename layer", () => {
      if (!guardNodeEditable(node, "rename it")) return;
      renameInput.value = node.getAttribute("id") || node.tagName.toLowerCase();
      button.hidden = true;
      renameInput.hidden = false;
      renameInput.focus();
      renameInput.select();
    });
    const finishRename = (commit) => {
      if (renameInput.hidden) return;
      if (!commit) {
        renameInput.hidden = true;
        button.hidden = false;
        return;
      }
      const cleanId = renameInput.value.trim().replace(/[^a-zA-Z0-9_.:-]+/g, "-");
      if (!guardNodeEditable(node, "rename it")) return;
      renameInput.hidden = true;
      button.hidden = false;
      if (cleanId) node.setAttribute("id", cleanId);
      else node.removeAttribute("id");
      afterMutation();
      setStatus(cleanId ? `Layer renamed to ${cleanId}.` : "Layer name removed.");
    };
    renameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        finishRename(true);
      } else if (event.key === "Escape") {
        event.preventDefault();
        finishRename(false);
      }
    });
    renameInput.addEventListener("blur", () => finishRename(true));
    const hidden = node.getAttribute("display") === "none";
    const visibility = control(hidden ? "H" : "V", hidden ? "Show layer" : "Hide layer", () => {
      if (!guardNodeEditable(node, "change its visibility")) return;
      if (node.getAttribute("display") === "none") node.removeAttribute("display");
      else node.setAttribute("display", "none");
      afterMutation();
      setStatus(node.getAttribute("display") === "none" ? "Layer hidden." : "Layer shown.");
    });
    visibility.classList.toggle("active", hidden);
    const ownLocked = state.lockedNodes.has(node);
    const inheritedLock = isNodeLocked(node) && !ownLocked;
    const locked = ownLocked || inheritedLock;
    const lock = control(locked ? "U" : "L", inheritedLock ? "Locked by parent layer" : locked ? "Unlock layer" : "Lock layer", () => {
      if (inheritedLock) {
        setStatus("This layer is protected by a locked parent. Unlock the parent layer first.", true);
        return;
      }
      if (state.lockedNodes.has(node)) state.lockedNodes.delete(node);
      else state.lockedNodes.add(node);
      refreshLayers();
      refreshInspector();
      renderOverlay();
      setStatus(state.lockedNodes.has(node) ? "Layer locked. Inspector and canvas edits are disabled." : "Layer unlocked and editable.");
    });
    lock.classList.toggle("active", locked);
    const backward = control("↓", "Send layer backward", () => moveLayerForNode(node, -1));
    const forward = control("↑", "Bring layer forward", () => moveLayerForNode(node, 1));
    row.append(nameCell, rename, visibility, lock, backward, forward);
    els.layerList.append(row);
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

function paintIsRemoved(node, name) {
  if (!node) return false;
  const direct = (node.getAttribute(name) || node.style.getPropertyValue(name)).trim().toLowerCase();
  if (direct) return direct === "none";
  return getComputedStyle(node).getPropertyValue(name).trim().toLowerCase() === "none";
}

function refreshPaintToggleButtons() {
  const nodes = state.selection;
  const hasEditable = nodes.length > 0 && nodes.every((node) => !isNodeLocked(node));
  const fillRemoved = nodes.length > 0 && nodes.every((node) => paintIsRemoved(node, "fill"));
  const strokeRemoved = nodes.length > 0 && nodes.every((node) => paintIsRemoved(node, "stroke"));
  decorateButton(els.fillNoneBtn, fillRemoved ? "fillOn" : "fillOff", fillRemoved ? "Add fill" : "Remove fill");
  decorateButton(els.strokeNoneBtn, strokeRemoved ? "strokeOn" : "strokeOff", strokeRemoved ? "Add stroke" : "Remove stroke");
  els.fillNoneBtn.disabled = !hasEditable;
  els.strokeNoneBtn.disabled = !hasEditable;
  els.gradientBtn.disabled = !hasEditable;
}

function refreshInspector() {
  const node = state.selected;
  const tagName = node ? node.tagName.toLowerCase() : "None";
  const locked = Boolean(node && isNodeLocked(node));
  els.selectedName.textContent =
    state.selection.length > 1 ? `${state.selection.length} selected, editing ${tagName}${locked ? " (locked)" : ""}` : `${tagName}${locked ? " (locked)" : ""}`;
  els.geometryControls.replaceChildren();
  els.pathTable.replaceChildren();
  els.attrList.replaceChildren();
  els.pathInput.value = "";
  state.pathCommands = [];
  state.selectedCommandIndex = -1;

  const disabled = !node || locked;
  [
    els.fillInput,
    els.fillHexInput,
    els.fillAlphaInput,
    els.strokeInput,
    els.strokeHexInput,
    els.strokeAlphaInput,
    els.strokeWidthInput,
    els.strokeLinecapInput,
    els.strokeLinejoinInput,
    els.strokeDashInput,
    els.opacityInput,
    els.pathInput,
    els.translateXInput,
    els.translateYInput,
    els.scaleInput,
    els.rotateInput,
    els.applyTransformBtn,
    els.attrNameInput,
    els.attrValueInput,
    els.setAttrBtn,
    els.normalizePathBtn,
    els.addNodeBtn,
    els.removeNodeBtn,
    els.straightNodeBtn,
    els.curveNodeBtn,
    els.closePathBtn,
    els.joinPathsBtn,
    els.bringForwardBtn,
    els.sendBackwardBtn,
    els.deleteBtn,
    els.convertPathBtn
  ].forEach((input) => {
    input.disabled = disabled;
  });
  refreshPaintToggleButtons();
  updateDimensionSummary(node);

  if (!node) {
    const geometryPlaceholder = document.createElement("div");
    geometryPlaceholder.className = "learn-panel geometry-placeholder";
    geometryPlaceholder.textContent = "Select a vector to edit its geometry.";
    els.geometryControls.append(geometryPlaceholder);
    els.learnPanel.textContent = "Select a vector to inspect how its coordinates and drawing commands work.";
    return;
  }

  els.fillInput.value = paintToColor(node, "fill", state.lastPaint.fill.get(node) || "#4e7cff");
  els.fillHexInput.value = els.fillInput.value;
  els.fillAlphaInput.value = String(Math.round(paintToAlpha(node, "fill") * 100));
  els.fillAlphaOutput.textContent = `${els.fillAlphaInput.value}%`;
  els.strokeInput.value = paintToColor(node, "stroke", state.lastPaint.stroke.get(node) || "#1d2733");
  els.strokeHexInput.value = els.strokeInput.value;
  els.strokeAlphaInput.value = String(Math.round(paintToAlpha(node, "stroke") * 100));
  els.strokeAlphaOutput.textContent = `${els.strokeAlphaInput.value}%`;
  els.strokeWidthInput.value = node.getAttribute("stroke-width") || "";
  els.strokeLinecapInput.value = node.getAttribute("stroke-linecap") || "";
  els.strokeLinejoinInput.value = node.getAttribute("stroke-linejoin") || "";
  els.strokeDashInput.value = node.getAttribute("stroke-dasharray") || "";
  els.opacityInput.value = node.getAttribute("opacity") || "";

  buildGeometryControls(node);
  buildAttrList(node);
  buildPathControls(node);
  updateLearnPanel(node);
}

function updateDimensionSummary(node = state.selected) {
  if (!node) {
    els.dimensionSummary.textContent = "Select a vector to see local and rendered dimensions.";
    return;
  }
  try {
    const local = node.getBBox();
    const screen = screenRectOf(node);
    const rootScale = Math.max(screenScaleOf(state.svg), 1e-6);
    const renderedWidth = screen ? (screen.right - screen.left) / rootScale : local.width;
    const renderedHeight = screen ? (screen.bottom - screen.top) / rootScale : local.height;
    els.dimensionSummary.innerHTML = `<span><strong>Local</strong> ${round(local.width)} x ${round(local.height)}</span><span><strong>Rendered</strong> ${round(renderedWidth)} x ${round(renderedHeight)}</span>`;
  } catch {
    els.dimensionSummary.textContent = "Dimensions are unavailable for this element.";
  }
}

function safeSetAttribute(node, name, value) {
  if (!guardNodeEditable(node, `change ${name}`)) return false;
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
      note.textContent = "This text contains <tspan> children. Edit its content in the source panel.";
      els.geometryControls.append(note);
    } else {
      const label = document.createElement("label");
      label.textContent = "text";
      label.style.gridColumn = "1 / -1";
      const input = document.createElement("input");
      input.type = "text";
      input.value = node.textContent;
      input.disabled = isNodeLocked(node);
      input.addEventListener("input", () => {
        if (!guardNodeEditable(node, "edit its text")) return;
        node.textContent = input.value;
        afterMutation(false);
        setStatus(`Text updated to "${compact(input.value, 36)}".`);
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
    image: ["x", "y", "width", "height", "href"],
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
    input.disabled = isNodeLocked(node);
    input.addEventListener("input", () => {
      if (!guardNodeEditable(node, `change ${name}`)) return;
      if (input.value === "") {
        node.removeAttribute(name);
      } else if (!safeSetAttribute(node, name, input.value)) {
        return;
      }
      afterMutation(false);
      updateDimensionSummary(node);
      setStatus(`${tag} ${name} ${input.value === "" ? "removed" : `set to ${input.value}`}.`);
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
    input.disabled = isNodeLocked(node);
    input.setAttribute("aria-label", `${attr.name} attribute value`);
    input.addEventListener("input", () => {
      row.classList.remove("blocked");
      row.querySelector(".attr-inline-error")?.remove();
      if (!safeSetAttribute(node, attr.name, input.value)) {
        input.setAttribute("aria-invalid", "true");
        row.classList.add("blocked");
        const error = document.createElement("span");
        error.className = "attr-inline-error";
        error.textContent = "Blocked. The SVG was not changed.";
        row.append(error);
        return;
      }
      input.removeAttribute("aria-invalid");
      afterMutation(false);
      setStatus(`${attr.name} updated.`);
    });
    const remove = document.createElement("button");
    remove.textContent = "x";
    remove.title = `Remove ${attr.name}`;
    remove.setAttribute("aria-label", `Remove ${attr.name} attribute`);
    remove.disabled = isNodeLocked(node);
    remove.addEventListener("click", () => {
      if (!guardNodeEditable(node, `remove ${attr.name}`)) return;
      node.removeAttribute(attr.name);
      afterMutation();
      setStatus(`${attr.name} attribute removed.`);
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

  els.pathInput.disabled = isNodeLocked(node);
  els.pathInput.value = data;
  state.pathCommands = parsePathData(data);
  renderPathTable();
}

function renderPathTable() {
  els.pathTable.replaceChildren();
  state.pathCommands.forEach((command, commandIndex) => {
    const row = document.createElement("div");
    row.className = "path-row";
    row.tabIndex = 0;
    row.setAttribute("role", "row");
    row.setAttribute("aria-label", `${command.code} path command ${commandIndex + 1}`);
    row.classList.toggle("active", commandIndex === state.selectedCommandIndex);
    row.addEventListener("click", () => {
      state.selectedCommandIndex = commandIndex;
      renderPathTable();
    });
    row.addEventListener("keydown", (event) => {
      if (event.target !== row || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      state.selectedCommandIndex = commandIndex;
      renderPathTable();
      els.pathTable.querySelectorAll(".path-row")[commandIndex]?.focus();
    });
    const cmd = document.createElement("strong");
    cmd.textContent = command.code;
    row.append(cmd);

    for (let i = 0; i < 7; i += 1) {
      const input = document.createElement("input");
      input.type = "number";
      input.step = "any";
      input.value = command.values[i] ?? "";
      input.disabled = i >= command.values.length || isNodeLocked(state.selected);
      input.setAttribute("aria-label", `${command.code} parameter ${i + 1}`);
      input.addEventListener("input", () => {
        const value = input.valueAsNumber;
        const currentCommand = state.pathCommands[commandIndex];
        if (!Number.isFinite(value) || !currentCommand || i >= currentCommand.values.length) {
          input.setAttribute("aria-invalid", "true");
          return;
        }
        input.removeAttribute("aria-invalid");
        currentCommand.values[i] = value;
        applyPathCommands();
      });
      input.addEventListener("blur", () => {
        if (input.getAttribute("aria-invalid") !== "true") return;
        const currentValue = state.pathCommands[commandIndex]?.values[i];
        input.value = Number.isFinite(currentValue) ? String(currentValue) : "";
        input.removeAttribute("aria-invalid");
      });
      row.append(input);
    }
    els.pathTable.append(row);
  });
}

function applyPathCommands() {
  const node = state.selected;
  if (!node || !guardNodeEditable(node, "edit its path data")) return false;
  const d = serializePathData(state.pathCommands);
  const tag = node.tagName.toLowerCase();
  if (tag === "path") {
    node.setAttribute("d", d);
  } else if (tag === "polyline" || tag === "polygon") {
    node.setAttribute("points", pathToPoints(state.pathCommands));
  }
  els.pathInput.value = d;
  afterMutation(false);
  updateDimensionSummary(node);
  return true;
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
    image: ["x", "y"],
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
  let local = screenDeltaToLocal(node, screenDx, screenDy);
  if (state.snapEnabled) {
    local = {
      x: Math.round(local.x / state.gridSize) * state.gridSize,
      y: Math.round(local.y / state.gridSize) * state.gridSize
    };
  }
  if (!applyElementTranslation(node, geometry, round(local.x), round(local.y))) {
    const reference = node.parentNode && node.parentNode.getScreenCTM ? node.parentNode : state.svg;
    const parentDelta = screenDeltaToLocal(reference, screenDx, screenDy);
    node.setAttribute("transform", `translate(${round(parentDelta.x)} ${round(parentDelta.y)}) ${transform}`.trim());
  }
}

function startElementDrag(event, vector, suppressClickOnUp = false) {
  if (isNodeLocked(vector)) {
    setStatus("This layer is locked. Unlock it in the Layers panel before editing.", true);
    return false;
  }
  if (!state.selection.includes(vector)) selectElement(vector);
  event.preventDefault();
  state.drag = {
    type: "element",
    clientX: event.clientX,
    clientY: event.clientY,
    moved: false,
    suppressClickOnUp,
    items: topLevelSelection().filter((node) => !isNodeLocked(node)).map((node) => ({
      node,
      geometry: captureElementGeometry(node),
      transform: node.getAttribute("transform") || ""
    }))
  };
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp, { once: true });
  return true;
}

function handlePointerDown(event) {
  state.suppressClick = false;
  if (state.spacePan || state.tool !== "select" || event.button !== 0 || event.shiftKey || event.ctrlKey || event.metaKey) return;
  const target = event.target;
  if (target.closest(".lab-overlay")) return;
  const vector = target.closest(VECTOR_SELECTOR);
  if (!vector || !state.svg.contains(vector)) return;
  startElementDrag(event, vector);
}

function startHandleDrag(event, handle) {
  event.stopPropagation();
  event.preventDefault();
  if (!guardNodeEditable(state.selected, "edit its path nodes")) return;
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
  if (!guardNodeEditable(node, "resize it")) return;
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
  if (!guardNodeEditable(node, "rotate it")) return;
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
    drag.lastDelta = { dx, dy };
    drag.items.forEach((item) => translateNodeBy(item, dx, dy));
    renderOverlay();
    syncSourceThrottled();
    return;
  }

  if (drag.type === "path-handle") {
    drag.moved = true;
    const local = clientPointToLocal(drag.inverse, event.clientX, event.clientY);
    const rawPoint = { x: local.x - drag.handle.offsetX, y: local.y - drag.handle.offsetY };
    let targetPoint = rawPoint;
    state.snapPoint = null;
    if (state.snapEnabled) {
      targetPoint = {
        x: Math.round(rawPoint.x / state.gridSize) * state.gridSize,
        y: Math.round(rawPoint.y / state.gridSize) * state.gridSize
      };
      const gridScreen = transformPoint(drag.matrix, targetPoint);
      const rootMatrix = state.svg.getScreenCTM?.();
      state.snapPoint = rootMatrix ? clientPointToLocal(rootMatrix.inverse(), gridScreen.x, gridScreen.y) : targetPoint;
    }
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
    if ((event.shiftKey || els.objectRatioToggle.checked) && scaleX && scaleY) {
      const uniform = Math.max(Math.abs(sx), Math.abs(sy));
      sx = (sx < 0 ? -1 : 1) * uniform;
      sy = (sy < 0 ? -1 : 1) * uniform;
    }
    drag.node.setAttribute(
      "transform",
      `${drag.base} translate(${round(anchor.x)} ${round(anchor.y)}) scale(${round(sx)} ${round(sy)}) translate(${round(-anchor.x)} ${round(-anchor.y)})`.trim()
    );
    drag.moved = true;
    drag.lastScale = { x: sx, y: sy };
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
    drag.moved = true;
    drag.lastDegrees = degrees;
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
  if (!drag) return;
  if (drag.type === "element" && (drag.moved || drag.suppressClickOnUp)) suppressNextSvgClick();
  if (!drag.moved && drag.type !== "path-handle") return;
  const activePoint = state.activePoint ? { ...state.activePoint } : null;
  afterMutation();
  if (drag.type === "element") {
    const node = drag.items.at(-1)?.node;
    try {
      const box = node?.getBBox?.();
      setStatus(box ? `Moved ${node.tagName.toLowerCase()} to x ${round(box.x)}, y ${round(box.y)}.` : "Selection moved.");
    } catch {
      setStatus("Selection moved.");
    }
  } else if (drag.type === "path-handle" && activePoint) {
    setStatus(`Path node moved to x ${round(activePoint.x)}, y ${round(activePoint.y)}.`);
  } else if (drag.type === "resize") {
    updateDimensionSummary(drag.node);
    setStatus(`Resized ${drag.node.tagName.toLowerCase()}. ${els.dimensionSummary.textContent}`);
  } else if (drag.type === "rotate") {
    setStatus(`Rotated ${drag.node.tagName.toLowerCase()} by ${round(drag.lastDegrees || 0)} degrees.`);
  }
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
  if (!guardNodeEditable(state.selected, "nudge its path node")) return true;
  event.preventDefault();
  const step = event.shiftKey ? 10 : event.altKey ? 0.1 : 1;
  const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
  const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
  const point = { x: handle.x + dx, y: handle.y + dy };
  updateHandlePosition(handle, point);
  updatePrecisionHud(state.activePoint, "nudge");
  applyPathCommands();
  renderOverlay();
  setStatus(`Path node nudged to x ${round(point.x)}, y ${round(point.y)}.`);
  return true;
}

function nudgeSelection(event) {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return false;
  const targets = topLevelSelection().filter((node) => !isNodeLocked(node));
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
  const primary = targets.at(-1);
  const box = primary?.getBBox?.();
  setStatus(box ? `Selection nudged to x ${round(box.x)}, y ${round(box.y)}.` : "Selection nudged.");
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

    if (node === state.selected && !isNodeLocked(node)) {
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
    handle.offsetX = 0;
    handle.offsetY = 0;
    handle.displayX = handle.x;
    handle.displayY = handle.y;
    if (handle.kind === "control") {
      positionHandleAwayFromElement(handle, box, scale);
      const spokeStart = pointToward(handle, { x: handle.displayX, y: handle.displayY }, 5 / scale);
      const spoke = document.createElementNS(SVG_NS, "line");
      spoke.classList.add("lab-handle-spoke");
      spoke.setAttribute("x1", spokeStart.x);
      spoke.setAttribute("y1", spokeStart.y);
      spoke.setAttribute("x2", handle.displayX);
      spoke.setAttribute("y2", handle.displayY);
      group.append(spoke);
    }

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

function insertVector(node) {
  const overlay = state.svg?.querySelector(":scope > .lab-overlay");
  state.svg?.insertBefore(node, overlay || null);
  return node;
}

function finishDrawing(commit = true) {
  const drawing = state.drawing;
  if (!drawing) return;
  state.drawing = null;
  if (!commit || (drawing.points && drawing.points.length < 2)) {
    drawing.node.remove();
    renderOverlay();
    return;
  }
  setSelection([drawing.node]);
  afterMutation();
  setStatus(`${drawing.type === "pen" ? "Pen path" : "Freehand path"} added.`);
}

function startFreehand(event) {
  const point = localPointFromEvent(event);
  if (!point) return;
  event.preventDefault();
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", els.strokeInput.value || "#1d2733");
  path.setAttribute("stroke-width", els.strokeWidthInput.value || "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  insertVector(path);
  state.drawing = { type: "freehand", node: path, points: [point] };
  const onMove = (moveEvent) => {
    const next = localPointFromEvent(moveEvent);
    if (!next) return;
    const previous = state.drawing?.points.at(-1);
    if (!previous || Math.hypot(next.x - previous.x, next.y - previous.y) < 1.5) return;
    state.drawing.points.push(next);
    path.setAttribute("d", `M ${state.drawing.points.map((item) => `${round(item.x)} ${round(item.y)}`).join(" L ")}`);
  };
  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    finishDrawing(true);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

function addPenPoint(event) {
  const point = localPointFromEvent(event);
  if (!point) return;
  event.preventDefault();
  if (!state.drawing || state.drawing.type !== "pen") {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", els.strokeInput.value || "#1d2733");
    path.setAttribute("stroke-width", els.strokeWidthInput.value || "2");
    insertVector(path);
    state.drawing = { type: "pen", node: path, points: [point] };
  } else {
    state.drawing.points.push(point);
  }
  const points = state.drawing.points;
  state.drawing.node.setAttribute("d", `M ${points.map((item) => `${round(item.x)} ${round(item.y)}`).join(" L ")}`);
  renderOverlay();
  setStatus("Pen path active. Click to add nodes, Enter to finish, or Escape to cancel.");
}

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
    suppressNextSvgClick();
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
  let moved = false;
  const onMove = (ev) => {
    if (Math.abs(ev.clientX - start.x) + Math.abs(ev.clientY - start.y) > 2) moved = true;
    els.stage.scrollLeft = start.left - (ev.clientX - start.x);
    els.stage.scrollTop = start.top - (ev.clientY - start.y);
  };
  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    els.stage.classList.remove("panning-active");
    if (moved) suppressNextSvgClick();
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

function setZoom(zoom, { preserveFit = false } = {}) {
  if (!preserveFit) state.fitMode = false;
  state.zoom = Math.min(12, Math.max(0.1, Number(zoom) || 1));
  els.stage.style.setProperty("--grid-size", `${state.gridSize * state.zoom}px`);
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

function fitToView({ announce = true } = {}) {
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
  state.fitMode = true;
  setZoom(zoom, { preserveFit: true });
  requestAnimationFrame(() => {
    els.stage.scrollLeft = Math.max(0, (els.stage.scrollWidth - els.stage.clientWidth) / 2);
    els.stage.scrollTop = Math.max(0, (els.stage.scrollHeight - els.stage.clientHeight) / 2);
  });
  if (announce) setStatus(`Fit to view at ${Math.round(state.zoom * 100)}%.`);
}

/* -------------------------------------------------------- mutation, history */

function afterMutation(full = true) {
  state.dirty = true;
  state.documentDirty = true;
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
      state.dirty = false;
    } catch {
      /* Storage unavailable in private mode or another restricted context. */
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
  loadSvg(state.history[state.historyIndex], { recordHistory: false, fit: false, markClean: false });
  state.restoring = false;
  const vectors = getVectors();
  setSelection(selectedIndices.map((position) => vectors[position]).filter(Boolean));
  updateHistoryButtons();
  state.documentDirty = true;
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
  const targets = editableSelection(`change ${name}`);
  if (!targets.length) return;
  targets.forEach((node) => {
    if (value === "") {
      node.removeAttribute(name);
    } else {
      node.setAttribute(name, value);
    }
    node.style.removeProperty(name);
  });
  afterMutation();
  setStatus(`${name} updated on ${targets.length} element${targets.length === 1 ? "" : "s"}.`);
}

function applyColorPaint(name) {
  const targets = editableSelection(`change ${name}`);
  if (!targets.length) return;
  const colorInput = name === "fill" ? els.fillInput : els.strokeInput;
  const alphaInput = name === "fill" ? els.fillAlphaInput : els.strokeAlphaInput;
  const output = name === "fill" ? els.fillAlphaOutput : els.strokeAlphaOutput;
  const alphaPercent = Number(alphaInput.value || 100);
  output.textContent = `${alphaPercent}%`;
  const value =
    alphaPercent <= 0 ? "none" : alphaPercent >= 100 ? colorInput.value : hexToRgba(colorInput.value, alphaPercent / 100);
  let replacedPaintRefs = 0;
  targets.forEach((node) => {
    if ((node.getAttribute(name) || "").trim().startsWith("url(")) replacedPaintRefs += 1;
    node.setAttribute(name, value);
    if (value !== "none") state.lastPaint[name]?.set(node, colorInput.value);
    node.style.removeProperty(name);
  });
  afterMutation();
  if (replacedPaintRefs) {
    setStatus(`Replaced a url() gradient/pattern ${name} with a solid color on ${replacedPaintRefs} element(s).`);
  } else setStatus(`${name === "fill" ? "Fill" : "Stroke"} updated on ${targets.length} element${targets.length === 1 ? "" : "s"}.`);
}

function togglePaint(name) {
  const targets = editableSelection(`change ${name}`);
  if (!targets.length) return;
  const add = targets.every((node) => paintIsRemoved(node, name));
  const picker = name === "fill" ? els.fillInput : els.strokeInput;
  const alpha = name === "fill" ? els.fillAlphaInput : els.strokeAlphaInput;
  const output = name === "fill" ? els.fillAlphaOutput : els.strokeAlphaOutput;
  targets.forEach((node) => {
    if (add) {
      const restored = state.lastPaint[name].get(node) || picker.value;
      node.setAttribute(name, restored);
      node.style.removeProperty(name);
    } else {
      if (!paintIsRemoved(node, name)) {
        state.lastPaint[name].set(node, paintToColor(node, name, picker.value));
      }
      node.setAttribute(name, "none");
      node.style.removeProperty(name);
    }
  });
  alpha.value = add ? "100" : "0";
  output.textContent = add ? "100%" : "0%";
  if (name === "stroke" && add) {
    targets.forEach((node) => {
      if (!node.hasAttribute("stroke-width")) node.setAttribute("stroke-width", els.strokeWidthInput.value || "2");
    });
  }
  afterMutation();
  setStatus(`${add ? "Restored" : "Removed"} ${name} on ${targets.length} element${targets.length === 1 ? "" : "s"}.`);
}

function applyTransform() {
  const targets = editableSelection("apply a transform");
  if (!targets.length) return;
  const tx = Number(els.translateXInput.value || 0);
  const ty = Number(els.translateYInput.value || 0);
  const scale = Number(els.scaleInput.value || 1);
  const rotate = Number(els.rotateInput.value || 0);
  targets.forEach((node) => {
    const existing = node.getAttribute("transform") || "";
    const transform = `translate(${tx} ${ty}) scale(${scale}) rotate(${rotate}) ${existing}`.trim();
    node.setAttribute("transform", transform);
  });
  els.translateXInput.value = "0";
  els.translateYInput.value = "0";
  els.scaleInput.value = "1";
  els.rotateInput.value = "0";
  afterMutation();
  setStatus(`Transform applied to ${targets.length} element${targets.length === 1 ? "" : "s"}.`);
}

function vectorSiblings(node) {
  return [...node.parentNode.children].filter(
    (sibling) => sibling !== node.parentNode.querySelector(":scope > .lab-overlay") && sibling.matches?.(VECTOR_SELECTOR)
  );
}

function moveLayerForNode(node, direction, announce = true) {
  if (!node?.parentNode) return false;
  if (!guardNodeEditable(node, "change its ordering")) return false;
  const siblings = vectorSiblings(node);
  const index = siblings.indexOf(node);
  const target = siblings[index + direction];
  if (!target) {
    if (announce) setStatus(direction > 0 ? "Layer is already at the front." : "Layer is already at the back.");
    return false;
  }
  if (isNodeLocked(target)) {
    setStatus("A locked adjacent layer prevents this ordering change.", true);
    return "locked";
  }
  if (direction > 0) node.parentNode.insertBefore(node, target.nextSibling);
  else node.parentNode.insertBefore(node, target);
  if (announce) {
    setSelection([node]);
    afterMutation();
    setStatus(direction > 0 ? "Brought layer forward." : "Sent layer backward.");
  }
  return true;
}

function moveLayer(direction) {
  const selected = topLevelSelection().filter((node) => node.parentNode);
  const targets = selected.filter((node) => !isNodeLocked(node));
  if (!targets.length && selected.length) {
    setStatus("Locked layer protected. Unlock it before changing its ordering.", true);
    return;
  }
  if (!targets.length) return;
  const ordered = direction > 0 ? targets.slice().reverse() : targets;
  let moved = 0;
  let blockedByLock = false;
  ordered.forEach((node) => {
    const result = moveLayerForNode(node, direction, false);
    if (result === true) moved += 1;
    if (result === "locked") blockedByLock = true;
  });
  if (blockedByLock && !moved) return;
  if (!moved) {
    setStatus(direction > 0 ? "Selection is already at the front." : "Selection is already at the back.");
    return;
  }
  afterMutation();
  setStatus(`${moved} layer${moved === 1 ? "" : "s"} moved ${direction > 0 ? "forward" : "backward"}.`);
}

function groupSelection() {
  const targets = topLevelSelection().filter((node) => !isNodeLocked(node));
  if (targets.length < 2) {
    setStatus("Select at least two objects to group.", true);
    return;
  }
  const parent = targets[0].parentNode;
  if (!targets.every((node) => node.parentNode === parent)) {
    setStatus("Objects must share the same parent before they can be grouped.", true);
    return;
  }
  const siblings = [...parent.children].filter((node) => node.matches?.(VECTOR_SELECTOR));
  const positions = targets.map((node) => siblings.indexOf(node));
  const firstPosition = Math.min(...positions);
  const lastPosition = Math.max(...positions);
  if (siblings.slice(firstPosition, lastPosition + 1).some((node) => !targets.includes(node) && isNodeLocked(node))) {
    setStatus("A locked layer between the selected objects prevents grouping because their ordering would change.", true);
    return;
  }
  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("id", `group-${Date.now().toString(36)}`);
  parent.insertBefore(group, targets[0]);
  targets.forEach((node) => group.append(node));
  setSelection([group]);
  afterMutation();
  setStatus(`Grouped ${targets.length} objects.`);
}

function ungroupSelection() {
  const groups = topLevelSelection().filter((node) => node.tagName.toLowerCase() === "g" && !node.classList.contains("lab-overlay") && !isNodeLocked(node));
  if (!groups.length) {
    setStatus("Select a group to ungroup.", true);
    return;
  }
  const children = [];
  groups.forEach((group) => {
    const parent = group.parentNode;
    const groupTransform = group.getAttribute("transform") || "";
    [...group.children].forEach((child) => {
      if (groupTransform) child.setAttribute("transform", `${groupTransform} ${child.getAttribute("transform") || ""}`.trim());
      parent.insertBefore(child, group);
      if (child.matches(VECTOR_SELECTOR)) children.push(child);
    });
    group.remove();
  });
  setSelection(children);
  afterMutation();
  setStatus(`Ungrouped ${groups.length} group${groups.length === 1 ? "" : "s"}.`);
}

function alignSelection(kind) {
  const targets = topLevelSelection().filter((node) => !isNodeLocked(node));
  const entries = targets.map((node) => ({ node, rect: screenRectOf(node) })).filter((entry) => entry.rect);
  if (entries.length < 2) {
    setStatus("Select at least two unlocked objects to align.", true);
    return;
  }
  const bounds = {
    left: Math.min(...entries.map(({ rect }) => rect.left)),
    right: Math.max(...entries.map(({ rect }) => rect.right)),
    top: Math.min(...entries.map(({ rect }) => rect.top)),
    bottom: Math.max(...entries.map(({ rect }) => rect.bottom))
  };
  const snapWasEnabled = state.snapEnabled;
  state.snapEnabled = false;
  entries.forEach(({ node, rect }) => {
    let dx = 0;
    let dy = 0;
    if (kind === "left") dx = bounds.left - rect.left;
    if (kind === "center") dx = (bounds.left + bounds.right - rect.left - rect.right) / 2;
    if (kind === "right") dx = bounds.right - rect.right;
    if (kind === "top") dy = bounds.top - rect.top;
    if (kind === "middle") dy = (bounds.top + bounds.bottom - rect.top - rect.bottom) / 2;
    if (kind === "bottom") dy = bounds.bottom - rect.bottom;
    translateNodeBy({ node, geometry: captureElementGeometry(node), transform: node.getAttribute("transform") || "" }, dx, dy);
  });
  state.snapEnabled = snapWasEnabled;
  afterMutation();
  setStatus(`Aligned ${entries.length} objects ${kind}.`);
}

function distributeSelection(axis) {
  const entries = topLevelSelection()
    .filter((node) => !isNodeLocked(node))
    .map((node) => ({ node, rect: screenRectOf(node) }))
    .filter((entry) => entry.rect);
  if (entries.length < 3) {
    setStatus("Select at least three unlocked objects to distribute.", true);
    return;
  }
  const horizontal = axis === "horizontal";
  entries.sort((a, b) => {
    const ac = horizontal ? (a.rect.left + a.rect.right) / 2 : (a.rect.top + a.rect.bottom) / 2;
    const bc = horizontal ? (b.rect.left + b.rect.right) / 2 : (b.rect.top + b.rect.bottom) / 2;
    return ac - bc;
  });
  const center = (entry) => horizontal ? (entry.rect.left + entry.rect.right) / 2 : (entry.rect.top + entry.rect.bottom) / 2;
  const start = center(entries[0]);
  const step = (center(entries.at(-1)) - start) / (entries.length - 1);
  const snapWasEnabled = state.snapEnabled;
  state.snapEnabled = false;
  entries.slice(1, -1).forEach((entry, index) => {
    const delta = start + step * (index + 1) - center(entry);
    translateNodeBy(
      { node: entry.node, geometry: captureElementGeometry(entry.node), transform: entry.node.getAttribute("transform") || "" },
      horizontal ? delta : 0,
      horizontal ? 0 : delta
    );
  });
  state.snapEnabled = snapWasEnabled;
  afterMutation();
  setStatus(`Distributed ${entries.length} objects ${axis}ly.`);
}

function deleteSelected() {
  const targets = editableSelection("delete it");
  if (!targets.length) return;
  const count = targets.length;
  targets.forEach((node) => node.remove());
  setSelection([]);
  afterMutation();
  setStatus(`Deleted ${count} element(s).`);
}

function duplicateSelected() {
  const targets = topLevelSelection().filter((node) => node.parentNode && !isNodeLocked(node));
  if (!targets.length) {
    if (state.selection.length) setStatus("Locked layer protected. Unlock it before duplicating it.", true);
    return;
  }
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
  const targets = editableSelection("convert it to a path");
  if (!targets.length) return;
  const nextSelection = [];
  let converted = 0;
  targets.forEach((node) => {
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

function getCanvasFrame() {
  const values = (state.svg?.getAttribute("viewBox") || "0 0 640 420").split(/[\s,]+/).map(Number);
  return {
    x: Number.isFinite(values[0]) ? values[0] : 0,
    y: Number.isFinite(values[1]) ? values[1] : 0,
    width: values[2] || 640,
    height: values[3] || 420
  };
}

function addBasicShape(kind) {
  if (!state.svg) return;
  const frame = getCanvasFrame();
  const cx = frame.x + frame.width / 2;
  const cy = frame.y + frame.height / 2;
  const node = document.createElementNS(SVG_NS, kind === "star" || kind === "heart" || kind === "check" ? "path" : kind);
  const fill = els.fillInput.value || "#4e7cff";
  const stroke = els.strokeInput.value || "#1d2733";
  if (kind === "rect") {
    node.setAttribute("x", round(cx - 80));
    node.setAttribute("y", round(cy - 55));
    node.setAttribute("width", "160");
    node.setAttribute("height", "110");
    node.setAttribute("rx", "12");
    node.setAttribute("fill", fill);
  } else if (kind === "ellipse") {
    node.setAttribute("cx", round(cx));
    node.setAttribute("cy", round(cy));
    node.setAttribute("rx", "80");
    node.setAttribute("ry", "55");
    node.setAttribute("fill", fill);
  } else if (kind === "line") {
    node.setAttribute("x1", round(cx - 80));
    node.setAttribute("y1", round(cy));
    node.setAttribute("x2", round(cx + 80));
    node.setAttribute("y2", round(cy));
    node.setAttribute("stroke", stroke);
    node.setAttribute("stroke-width", els.strokeWidthInput.value || "3");
  } else if (kind === "polygon") {
    node.setAttribute("points", `${round(cx)},${round(cy - 70)} ${round(cx + 72)},${round(cy + 58)} ${round(cx - 72)},${round(cy + 58)}`);
    node.setAttribute("fill", fill);
  } else if (kind === "text") {
    node.setAttribute("x", round(cx));
    node.setAttribute("y", round(cy));
    node.setAttribute("text-anchor", "middle");
    node.setAttribute("font-size", "32");
    node.setAttribute("font-family", "Arial, sans-serif");
    node.setAttribute("fill", fill);
    node.textContent = "Edit text";
  } else {
    const paths = {
      star: "M 0 -58 L 13 -18 L 55 -18 L 21 7 L 34 48 L 0 23 L -34 48 L -21 7 L -55 -18 L -13 -18 Z",
      heart: "M 0 48 C -62 14 -66 -28 -34 -44 C -13 -54 0 -36 0 -25 C 0 -36 13 -54 34 -44 C 66 -28 62 14 0 48 Z",
      check: "M -54 0 L -18 36 L 58 -42"
    };
    node.setAttribute("d", paths[kind]);
    node.setAttribute("transform", `translate(${round(cx)} ${round(cy)})`);
    node.setAttribute("fill", kind === "check" ? "none" : fill);
    if (kind === "check") {
      node.setAttribute("stroke", stroke);
      node.setAttribute("stroke-width", "12");
      node.setAttribute("stroke-linecap", "round");
      node.setAttribute("stroke-linejoin", "round");
    }
  }
  insertVector(node);
  setSelection([node]);
  afterMutation();
  setStatus(`${kind[0].toUpperCase() + kind.slice(1)} added.`);
}

function applyCanvasSize() {
  if (!state.svg) return;
  const oldSize = getSvgBaseSize(state.svg);
  let width = Math.max(1, Number(els.canvasWidthInput.value) || oldSize.width);
  let height = Math.max(1, Number(els.canvasHeightInput.value) || oldSize.height);
  if (els.canvasRatioToggle.checked) {
    const widthChanged = Math.abs(width - oldSize.width) >= Math.abs(height - oldSize.height);
    if (widthChanged) height = width * (oldSize.height / oldSize.width);
    else width = height * (oldSize.width / oldSize.height);
  }
  width = round(width);
  height = round(height);
  state.svg.setAttribute("width", String(width));
  state.svg.setAttribute("height", String(height));
  state.svg.dataset.baseWidth = String(width);
  state.svg.dataset.baseHeight = String(height);
  els.canvasWidthInput.value = String(width);
  els.canvasHeightInput.value = String(height);
  applySvgZoom(state.svg);
  afterMutation();
  setStatus(`Canvas resized to ${width} x ${height}. The viewBox and artwork proportions were preserved.`);
}

function addGradient() {
  const targets = editableSelection("add a gradient");
  if (!targets.length) return;
  let defs = state.svg.querySelector(":scope > defs");
  if (!defs) {
    defs = document.createElementNS(SVG_NS, "defs");
    state.svg.insertBefore(defs, state.svg.firstChild);
  }
  const id = `gradient-${Date.now().toString(36)}`;
  const gradient = document.createElementNS(SVG_NS, "linearGradient");
  gradient.setAttribute("id", id);
  gradient.setAttribute("x1", "0%");
  gradient.setAttribute("x2", "100%");
  const start = document.createElementNS(SVG_NS, "stop");
  start.setAttribute("offset", "0%");
  start.setAttribute("stop-color", els.fillInput.value || "#4e7cff");
  const end = document.createElementNS(SVG_NS, "stop");
  end.setAttribute("offset", "100%");
  end.setAttribute("stop-color", els.strokeInput.value || "#0aaaa6");
  gradient.append(start, end);
  defs.append(gradient);
  targets.forEach((node) => node.setAttribute("fill", `url(#${id})`));
  afterMutation();
  setStatus("Linear gradient added. Edit its stops in SVG source for precise control.");
}

function pathEndpoint(commandIndex) {
  return buildPathHandles(state.pathCommands).filter((handle) => handle.commandIndex === commandIndex && handle.kind === "end").at(-1) || null;
}

function pathActionIndex() {
  if (state.selectedCommandIndex >= 0) return state.selectedCommandIndex;
  for (let index = state.pathCommands.length - 1; index >= 0; index -= 1) {
    if (!["m", "z"].includes(state.pathCommands[index].code.toLowerCase())) return index;
  }
  return -1;
}

function addPathNode() {
  if (!state.selected || state.selected.tagName.toLowerCase() !== "path") return;
  if (!guardNodeEditable(state.selected, "add a path node")) return;
  const lastIndex = state.pathCommands.length - 1;
  const endpoint = pathEndpoint(lastIndex) || buildPathHandles(state.pathCommands).filter((handle) => handle.kind === "end").at(-1);
  if (!endpoint) return;
  const closed = state.pathCommands.at(-1)?.code.toLowerCase() === "z";
  const command = { code: "L", values: [round(endpoint.x + state.gridSize), round(endpoint.y + state.gridSize)] };
  state.pathCommands.splice(closed ? lastIndex : state.pathCommands.length, 0, command);
  state.selectedCommandIndex = closed ? lastIndex : state.pathCommands.length - 1;
  applyPathCommands();
  renderPathTable();
  setStatus("Path node added.");
}

function removePathNode() {
  if (!guardNodeEditable(state.selected, "remove a path node")) return;
  const index = pathActionIndex();
  if (index < 0 || state.pathCommands.length <= 2) {
    setStatus("Select a removable path node.", true);
    return;
  }
  state.pathCommands.splice(index, 1);
  state.selectedCommandIndex = Math.min(index, state.pathCommands.length - 1);
  applyPathCommands();
  renderPathTable();
  setStatus("Path node removed.");
}

function convertPathNode(curved) {
  if (!guardNodeEditable(state.selected, "change a path node")) return;
  const index = pathActionIndex();
  const endpoint = pathEndpoint(index);
  if (index < 0 || !endpoint || state.pathCommands[index].code.toLowerCase() === "m") {
    setStatus("Select a drawable path node first.", true);
    return;
  }
  if (!curved) {
    state.pathCommands[index] = { code: "L", values: [round(endpoint.x), round(endpoint.y)] };
  } else {
    const base = endpoint.base || { x: endpoint.x - 20, y: endpoint.y };
    const dx = endpoint.x - base.x;
    const dy = endpoint.y - base.y;
    state.pathCommands[index] = {
      code: "C",
      values: [round(base.x + dx / 3), round(base.y + dy / 3), round(base.x + dx * 2 / 3), round(base.y + dy * 2 / 3), round(endpoint.x), round(endpoint.y)]
    };
  }
  applyPathCommands();
  renderPathTable();
  setStatus(curved ? "Node converted to a curved cubic segment." : "Node converted to a straight segment.");
}

function closeSelectedPath() {
  if (!state.selected || state.selected.tagName.toLowerCase() !== "path") return;
  if (!guardNodeEditable(state.selected, "close its path")) return;
  if (state.pathCommands.at(-1)?.code.toLowerCase() !== "z") state.pathCommands.push({ code: "Z", values: [] });
  applyPathCommands();
  renderPathTable();
  setStatus("Path closed.");
}

function joinSelectedPaths() {
  const paths = topLevelSelection().filter((node) => node.tagName.toLowerCase() === "path" && node.parentNode && !isNodeLocked(node));
  if (paths.length < 2 || !paths.every((node) => node.parentNode === paths[0].parentNode)) {
    setStatus("Select at least two sibling paths to join.", true);
    return;
  }
  const transforms = new Set(paths.map((node) => node.getAttribute("transform") || ""));
  if (transforms.size > 1) {
    setStatus("Joined paths must use the same transform. Apply matching transforms first.", true);
    return;
  }
  const first = paths[0];
  first.setAttribute("d", paths.map((node) => node.getAttribute("d") || "").filter(Boolean).join(" "));
  paths.slice(1).forEach((node) => node.remove());
  setSelection([first]);
  afterMutation();
  setStatus(`Joined ${paths.length} paths.`);
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

function saveLocal() {
  if (!state.svg) return;
  try {
    const snapshot = serializeCurrentSvg();
    const savedAt = new Date().toISOString();
    localStorage.setItem(LOCAL_SAVE_KEY, snapshot);
    localStorage.setItem(LOCAL_SAVE_TIME_KEY, savedAt);
    localStorage.setItem(AUTOSAVE_KEY, snapshot);
    state.lastManualSave = snapshot;
    state.dirty = false;
    state.documentDirty = false;
    els.checkpointMeta.textContent = `Saved ${new Date(savedAt).toLocaleString()}`;
    els.restoreLocalBtn.disabled = false;
    setStatus(`Checkpoint saved in this browser at ${new Date(savedAt).toLocaleTimeString()}.`);
  } catch {
    setStatus("Local save is unavailable in this browser session. Download the SVG to keep a copy.", true);
  }
}

function restoreLocal() {
  let snapshot = "";
  try {
    snapshot = localStorage.getItem(LOCAL_SAVE_KEY) || "";
  } catch {
    setStatus("The saved checkpoint is unavailable in this browser session.", true);
    return;
  }
  if (!/<svg[\s>]/i.test(snapshot)) {
    setStatus("No saved checkpoint is available yet.", true);
    return;
  }
  if (!confirmReplaceCurrent()) return;
  if (loadSvg(snapshot)) setStatus("Saved checkpoint restored and made the active document.");
}

async function copySelection() {
  const targets = topLevelSelection();
  if (!targets.length) return false;
  const wrapper = document.createElementNS(SVG_NS, "svg");
  wrapper.setAttribute("xmlns", SVG_NS);
  wrapper.setAttribute("data-vector-lab-clipboard", "true");
  targets.forEach((node) => wrapper.append(node.cloneNode(true)));
  state.clipboardMarkup = new XMLSerializer().serializeToString(wrapper);
  await copyText(state.clipboardMarkup);
  setStatus(`Copied ${targets.length} object${targets.length === 1 ? "" : "s"}.`);
  return true;
}

function pasteObjects(markup = state.clipboardMarkup) {
  if (!state.svg || !markup) return false;
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  const source = doc.documentElement;
  if (doc.querySelector("parsererror") || source.tagName.toLowerCase() !== "svg") return false;
  sanitizeSvg(source);
  const nodes = [...source.children]
    .filter((node) => node.matches?.(VECTOR_SELECTOR))
    .map((node) => document.importNode(node, true));
  if (!nodes.length) return false;
  nodes.forEach((node) => {
    const existing = node.getAttribute("transform") || "";
    node.setAttribute("transform", `translate(18 18) ${existing}`.trim());
    insertVector(node);
  });
  setSelection(nodes);
  afterMutation();
  setStatus(`Pasted ${nodes.length} object${nodes.length === 1 ? "" : "s"}.`);
  return true;
}

function showPasteChoices(markup) {
  state.pendingPasteMarkup = markup;
  if (typeof els.pasteDialog.showModal === "function") {
    els.pasteDialog.showModal();
    return;
  }
  if (window.confirm("Paste the SVG as objects? Choose Cancel to replace the current document instead.")) {
    pasteObjects(markup);
  } else if (confirmReplaceCurrent() && loadSvg(markup)) {
    setStatus("Clipboard SVG replaced the current document.");
  }
}

async function insertImageFile(file) {
  if (!state.svg || !file) return;
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  if (!/^data:image\/(png|jpeg|webp|gif);base64,/i.test(dataUrl)) {
    setStatus("Only PNG, JPEG, WebP, and GIF images can be inserted.", true);
    return;
  }
  const imageSize = await new Promise((resolve) => {
    const probe = new Image();
    probe.onload = () => resolve({ width: probe.naturalWidth || 200, height: probe.naturalHeight || 200 });
    probe.onerror = () => resolve({ width: 200, height: 200 });
    probe.src = dataUrl;
  });
  const frame = getCanvasFrame();
  const scale = Math.min(1, (frame.width * 0.5) / imageSize.width, (frame.height * 0.5) / imageSize.height);
  const width = Math.max(1, round(imageSize.width * scale));
  const height = Math.max(1, round(imageSize.height * scale));
  const node = document.createElementNS(SVG_NS, "image");
  node.setAttribute("href", dataUrl);
  node.setAttribute("x", round(frame.x + (frame.width - width) / 2));
  node.setAttribute("y", round(frame.y + (frame.height - height) / 2));
  node.setAttribute("width", String(width));
  node.setAttribute("height", String(height));
  node.setAttribute("preserveAspectRatio", "xMidYMid meet");
  insertVector(node);
  setSelection([node]);
  afterMutation();
  setStatus(`Inserted ${file.name} as an embedded local image.`);
}

async function downloadPng() {
  if (!state.svg) return;
  const svgText = serializeCurrentSvg();
  const size = getSvgBaseSize(state.svg);
  const scale = Math.max(1, Number(state.pngScale || 1));
  const canvas = document.createElement("canvas");
  const customWidth = Number(els.pngWidthInput.value || 0);
  const customHeight = Number(els.pngHeightInput.value || 0);
  if (customWidth || customHeight) {
    canvas.width = Math.round(customWidth || customHeight * (size.width / size.height));
    canvas.height = Math.round(customHeight || customWidth * (size.height / size.width));
  } else {
    canvas.width = Math.round(size.width * scale);
    canvas.height = Math.round(size.height * scale);
  }
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
    [els.saveLocalBtn, "save"],
    [els.copySvgBtn, "copy"],
    [els.downloadSvgBtn, "download"],
    [els.downloadPngBtn, "download"],
    [els.loadInputBtn, "load"],
    [els.refreshLayersBtn, "refresh"],
    [els.fitBtn, "fit"],
    [els.handToolBtn, "hand"],
    [els.toggleSourceBtn, "panelLeft"],
    [els.toggleInspectorBtn, "panelRight"],
    [els.undoBtn, "undo"],
    [els.redoBtn, "redo"],
    [els.convertPathBtn, "path"],
    [els.deleteBtn, "trash"],
    [els.duplicateBtn, "duplicate"],
    [els.fillNoneBtn, "fillOff"],
    [els.strokeNoneBtn, "strokeOff"],
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
  els.handToolBtn,
  els.toggleSourceBtn,
  els.toggleInspectorBtn,
  els.undoBtn,
  els.redoBtn,
  els.deleteBtn,
  els.duplicateBtn
].forEach(iconOnly);

function confirmReplaceCurrent() {
  return !state.documentDirty || window.confirm("Replace the current SVG? The current design has changes that are not in your saved checkpoint or downloaded file.");
}

els.loadInputBtn.addEventListener("click", () => {
  if (confirmReplaceCurrent()) loadSvg(els.svgInput.value);
});
els.loadSampleBtn.addEventListener("click", () => {
  if (confirmReplaceCurrent()) loadSvg(SAMPLE_SVG);
});
els.saveLocalBtn.addEventListener("click", saveLocal);
els.restoreLocalBtn.addEventListener("click", restoreLocal);
els.applyCanvasSizeBtn.addEventListener("click", applyCanvasSize);
els.refreshLayersBtn.addEventListener("click", refreshLayers);
els.fileInput.addEventListener("change", async () => {
  const file = els.fileInput.files[0];
  if (!file) return;
  if (confirmReplaceCurrent()) loadSvg(await file.text());
  els.fileInput.value = "";
});
els.imageInput.addEventListener("change", async () => {
  const file = els.imageInput.files[0];
  if (file) await insertImageFile(file);
  els.imageInput.value = "";
});
document.querySelectorAll("[data-add-shape]").forEach((button) => {
  button.addEventListener("click", () => addBasicShape(button.dataset.addShape));
});
els.handToolBtn.addEventListener("click", () => setTool(state.tool === "hand" ? "select" : "hand"));
els.freehandToolBtn.addEventListener("click", () => setTool(state.tool === "freehand" ? "select" : "freehand"));
els.penToolBtn.addEventListener("click", () => setTool(state.tool === "pen" ? "select" : "pen"));
els.groupBtn.addEventListener("click", groupSelection);
els.ungroupBtn.addEventListener("click", ungroupSelection);
document.querySelectorAll("[data-align]").forEach((button) => button.addEventListener("click", () => alignSelection(button.dataset.align)));
document.querySelectorAll("[data-distribute]").forEach((button) => button.addEventListener("click", () => distributeSelection(button.dataset.distribute)));
els.copySvgBtn.addEventListener("click", async () => {
  if (!state.svg) return;
  const copied = await copyText(serializeCurrentSvg());
  setStatus(copied ? "SVG copied." : "Copy failed. Copy the source panel text manually.", !copied);
});
els.downloadSvgBtn.addEventListener("click", () => {
  if (!state.svg) return;
  const blob = new Blob([serializeCurrentSvg()], { type: "image/svg+xml" });
  downloadBlob(blob, "vector-lab-export.svg");
  state.documentDirty = false;
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

function normalizeHexColor(value) {
  const raw = String(value || "").trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw.split("").map((character) => character.repeat(2)).join("")}`.toLowerCase();
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toLowerCase()}`;
  return null;
}

function normalizeCssColor(value) {
  const hex = normalizeHexColor(value);
  if (hex) return hex;
  const probe = document.createElement("span");
  probe.style.color = "";
  probe.style.color = String(value || "").trim();
  if (!probe.style.color) return null;
  document.body.append(probe);
  const normalized = toColor(getComputedStyle(probe).color, null);
  probe.remove();
  return normalized;
}

function bindColorPicker(colorInput, hexInput, applyColor) {
  colorInput.addEventListener("input", () => {
    hexInput.value = colorInput.value.toLowerCase();
    applyColor(colorInput.value);
  });
  hexInput.addEventListener("input", () => {
    const normalized = normalizeCssColor(hexInput.value);
    if (!normalized) return;
    colorInput.value = normalized;
    applyColor(normalized);
  });
  hexInput.addEventListener("blur", () => {
    const normalized = normalizeCssColor(hexInput.value);
    hexInput.value = normalized || colorInput.value.toLowerCase();
  });
}

bindColorPicker(els.backgroundInput, els.backgroundHexInput, (color) => {
  state.backgroundColor = color;
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
function syncPanelToggles() {
  const sourceVisible = !els.appShell.classList.contains("hide-source");
  const inspectorVisible = !els.appShell.classList.contains("hide-inspector");
  [els.toggleSourceBtn, els.mobileSourceBtn].forEach((button) => {
    button.classList.toggle("active", sourceVisible);
    button.setAttribute("aria-pressed", String(sourceVisible));
  });
  [els.toggleInspectorBtn, els.mobileInspectorBtn].forEach((button) => {
    button.classList.toggle("active", inspectorVisible);
    button.setAttribute("aria-pressed", String(inspectorVisible));
  });
}

function setPanelVisible(panel, visible) {
  const className = panel === "source" ? "hide-source" : "hide-inspector";
  if (visible && window.matchMedia("(max-width: 760px)").matches) {
    els.appShell.classList.add(panel === "source" ? "hide-inspector" : "hide-source");
  }
  els.appShell.classList.toggle(className, !visible);
  syncPanelToggles();
  if (state.fitMode) requestAnimationFrame(() => fitToView({ announce: false }));
}

function togglePanel(panel) {
  const className = panel === "source" ? "hide-source" : "hide-inspector";
  setPanelVisible(panel, els.appShell.classList.contains(className));
}

els.toggleSourceBtn.addEventListener("click", () => togglePanel("source"));
els.mobileSourceBtn.addEventListener("click", () => togglePanel("source"));
els.toggleInspectorBtn.addEventListener("click", () => togglePanel("inspector"));
els.mobileInspectorBtn.addEventListener("click", () => togglePanel("inspector"));
document.querySelectorAll("[data-close-panel]").forEach((button) => {
  button.addEventListener("click", () => setPanelVisible(button.dataset.closePanel, false));
});
if (window.matchMedia("(max-width: 760px)").matches) {
  els.appShell.classList.add("hide-source", "hide-inspector");
}
syncPanelToggles();

const stageResizeObserver = typeof ResizeObserver === "function"
  ? new ResizeObserver(() => {
      if (state.fitMode) requestAnimationFrame(() => fitToView({ announce: false }));
    })
  : null;
stageResizeObserver?.observe(els.stage);
window.addEventListener("resize", () => {
  if (state.fitMode) requestAnimationFrame(() => fitToView({ announce: false }));
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
els.gridToggle.addEventListener("change", () => {
  state.gridEnabled = els.gridToggle.checked;
  els.stage.classList.toggle("grid-hidden", !state.gridEnabled);
  setStatus(state.gridEnabled ? "Grid shown." : "Grid hidden.");
});
els.gridSizeInput.addEventListener("change", () => {
  state.gridSize = Math.min(256, Math.max(2, Number(els.gridSizeInput.value) || 16));
  els.gridSizeInput.value = String(state.gridSize);
  els.stage.style.setProperty("--grid-size", `${state.gridSize * state.zoom}px`);
  setStatus(`Grid spacing set to ${state.gridSize} SVG units.`);
});
els.stage.addEventListener("pointermove", (event) => {
  if (state.tool === "hand" || state.spacePan) updatePanCursor(true, event);
});
els.stage.addEventListener("pointerleave", () => updatePanCursor(false));
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
  if (state.spacePan || state.tool === "hand" || event.button === 1) {
    startPan(event);
    return;
  }
  if (event.button !== 0 || state.drag || !state.svg) return;
  if (state.tool === "freehand") {
    startFreehand(event);
    return;
  }
  if (state.tool === "pen") {
    addPenPoint(event);
    return;
  }
  const target = event.target;
  if (target.closest(".lab-overlay")) return;
  if (target.closest(VECTOR_SELECTOR) && state.svg.contains(target)) return;
  const boundingVector = vectorAtBoundingPoint(event.clientX, event.clientY);
  if (boundingVector) {
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      selectElement(boundingVector, true);
      window.addEventListener("pointerup", suppressNextSvgClick, { once: true });
      event.preventDefault();
      return;
    }
    startElementDrag(event, boundingVector, true);
    return;
  }
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
    if (confirmReplaceCurrent() && loadSvg(await file.text())) setStatus(`Loaded ${file.name}.`);
    return;
  }
  const text = event.dataTransfer.getData("text/plain") || "";
  if (/<svg[\s>]/i.test(text)) {
    if (confirmReplaceCurrent()) loadSvg(text);
    return;
  }
  setStatus("Drop an .svg file or SVG markup onto the canvas.", true);
});
els.deleteBtn.addEventListener("click", deleteSelected);
els.duplicateBtn.addEventListener("click", duplicateSelected);
els.convertPathBtn.addEventListener("click", convertSelectedToPath);
bindColorPicker(els.fillInput, els.fillHexInput, () => applyColorPaint("fill"));
els.fillAlphaInput.addEventListener("input", () => applyColorPaint("fill"));
bindColorPicker(els.strokeInput, els.strokeHexInput, () => applyColorPaint("stroke"));
els.strokeAlphaInput.addEventListener("input", () => applyColorPaint("stroke"));
els.strokeWidthInput.addEventListener("input", () => applyPaint("stroke-width", els.strokeWidthInput.value));
els.strokeLinecapInput.addEventListener("change", () => applyPaint("stroke-linecap", els.strokeLinecapInput.value));
els.strokeLinejoinInput.addEventListener("change", () => applyPaint("stroke-linejoin", els.strokeLinejoinInput.value));
els.strokeDashInput.addEventListener("input", () => applyPaint("stroke-dasharray", els.strokeDashInput.value));
els.opacityInput.addEventListener("input", () => applyPaint("opacity", els.opacityInput.value));
els.fillNoneBtn.addEventListener("click", () => {
  togglePaint("fill");
});
els.strokeNoneBtn.addEventListener("click", () => {
  togglePaint("stroke");
});
els.gradientBtn.addEventListener("click", addGradient);
els.bringForwardBtn.addEventListener("click", () => moveLayer(1));
els.sendBackwardBtn.addEventListener("click", () => moveLayer(-1));
els.applyTransformBtn.addEventListener("click", applyTransform);
els.pathInput.addEventListener("input", () => {
  const node = state.selected;
  if (!node) return;
  if (!guardNodeEditable(node, "edit its path data")) {
    buildPathControls(node);
    return;
  }
  const tag = node.tagName.toLowerCase();
  const commands = parsePathData(els.pathInput.value);
  if (tag === "path") {
    node.setAttribute("d", els.pathInput.value);
  } else if (tag === "polyline" || tag === "polygon") {
    const dropped = commands.filter((command) => !["m", "l", "z"].includes(command.code.toLowerCase())).length;
    node.setAttribute("points", pathToPoints(commands));
    if (dropped) {
      setStatus(
        `<${tag}> keeps straight M/L points only. ${dropped} curve/arc command(s) dropped. Convert to path to keep curves.`,
        true
      );
    }
  }
  state.pathCommands = commands;
  renderPathTable();
  afterMutation(false);
  updateDimensionSummary(node);
  setStatus(`Path data updated with ${commands.length} command${commands.length === 1 ? "" : "s"}.`);
});
els.normalizePathBtn.addEventListener("click", () => {
  if (!state.selected) return;
  if (!guardNodeEditable(state.selected, "normalize its path")) return;
  state.pathCommands = parsePathData(els.pathInput.value);
  applyPathCommands();
  renderPathTable();
  setStatus(`Path normalized to ${state.pathCommands.length} command${state.pathCommands.length === 1 ? "" : "s"}.`);
});
els.addNodeBtn.addEventListener("click", addPathNode);
els.removeNodeBtn.addEventListener("click", removePathNode);
els.straightNodeBtn.addEventListener("click", () => convertPathNode(false));
els.curveNodeBtn.addEventListener("click", () => convertPathNode(true));
els.closePathBtn.addEventListener("click", closeSelectedPath);
els.joinPathsBtn.addEventListener("click", joinSelectedPaths);
els.setAttrBtn.addEventListener("click", () => {
  const name = els.attrNameInput.value.trim();
  if (!state.selection.length || !name) return;
  let applied = 0;
  state.selection.forEach((node) => {
    if (safeSetAttribute(node, name, els.attrValueInput.value)) applied += 1;
  });
  if (!applied) {
    els.attrNameInput.value = "";
    els.attrValueInput.value = "";
    els.attrNameInput.setAttribute("aria-invalid", "true");
    els.attrValueInput.setAttribute("aria-invalid", "true");
    return;
  }
  els.attrNameInput.removeAttribute("aria-invalid");
  els.attrValueInput.removeAttribute("aria-invalid");
  els.attrNameInput.value = "";
  els.attrValueInput.value = "";
  afterMutation();
  setStatus(`Set ${name} on ${applied} element(s).`);
});

document.addEventListener("paste", (event) => {
  if (event.target.matches?.("input,textarea")) return;
  const text = event.clipboardData?.getData("text/plain") || "";
  if (/data-vector-lab-clipboard/i.test(text) || (!text && state.clipboardMarkup)) {
    event.preventDefault();
    pasteObjects(text || state.clipboardMarkup);
    return;
  }
  if (/<svg[\s>]/i.test(text)) {
    event.preventDefault();
    showPasteChoices(text);
  }
});

els.pasteAsObjectsBtn.addEventListener("click", () => {
  const markup = state.pendingPasteMarkup;
  els.pasteDialog.close("objects");
  state.pendingPasteMarkup = "";
  if (!pasteObjects(markup)) setStatus("This SVG does not contain pasteable vector objects.", true);
});
els.replaceFromPasteBtn.addEventListener("click", () => {
  const markup = state.pendingPasteMarkup;
  if (!confirmReplaceCurrent()) return;
  els.pasteDialog.close("replace");
  state.pendingPasteMarkup = "";
  if (loadSvg(markup)) setStatus("Clipboard SVG replaced the current document.");
});
els.pasteDialog.addEventListener("close", () => {
  state.pendingPasteMarkup = "";
});

document.addEventListener("keydown", (event) => {
  // Never hijack shortcuts while the user is typing. Native undo in the
  // source textarea and inputs must keep working.
  if (event.target.matches?.("input,textarea,select")) return;
  const mod = event.ctrlKey || event.metaKey;
  if (state.drawing?.type === "pen" && event.key === "Enter") {
    event.preventDefault();
    finishDrawing(true);
    setTool("select");
    return;
  }
  if (state.drawing && event.key === "Escape") {
    event.preventDefault();
    finishDrawing(false);
    setTool("select");
    setStatus("Drawing cancelled.");
    return;
  }
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
  if (mod && event.key.toLowerCase() === "c" && state.selection.length) {
    event.preventDefault();
    copySelection();
    return;
  }
  if (mod && event.key.toLowerCase() === "g") {
    event.preventDefault();
    if (event.shiftKey) ungroupSelection();
    else groupSelection();
    return;
  }
  if (!mod && event.key.toLowerCase() === "h") {
    event.preventDefault();
    setTool(state.tool === "hand" ? "select" : "hand");
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
      els.stage.classList.add("hand-tool");
      updatePanCursor(true);
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
    els.stage.classList.toggle("hand-tool", state.tool === "hand");
    if (state.tool !== "hand") updatePanCursor(false);
  }
});
window.addEventListener("blur", () => {
  state.spacePan = false;
  els.stage.classList.remove("pan-ready");
  els.stage.classList.toggle("hand-tool", state.tool === "hand");
  if (state.tool !== "hand") updatePanCursor(false);
});
window.addEventListener("beforeunload", (event) => {
  try {
    if (state.svg) {
      localStorage.setItem(AUTOSAVE_KEY, serializeCurrentSvg());
      state.dirty = false;
    }
  } catch {
    /* storage unavailable */
  }
  if (state.dirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});

const starterName = new URLSearchParams(window.location.search).get("starter");
const starterSvg = Object.hasOwn(STARTER_SVGS, starterName) ? STARTER_SVGS[starterName] : null;
let autosaved = null;
let manualSaved = null;
let manualSavedAt = null;
try {
  autosaved = localStorage.getItem(AUTOSAVE_KEY);
  manualSaved = localStorage.getItem(LOCAL_SAVE_KEY);
  manualSavedAt = localStorage.getItem(LOCAL_SAVE_TIME_KEY);
  state.lastManualSave = manualSaved || "";
} catch {
  autosaved = null;
  manualSaved = null;
  manualSavedAt = null;
}
els.restoreLocalBtn.disabled = !manualSaved;
els.checkpointMeta.textContent = manualSavedAt ? `Saved ${new Date(manualSavedAt).toLocaleString()}` : "No saved checkpoint";
if (starterSvg) {
  loadSvg(starterSvg);
  setStatus(`Loaded the ${starterName} starter. It is now your current autosaved canvas.`);
} else if (autosaved && /<svg[\s>]/i.test(autosaved)) {
  loadSvg(autosaved);
  setStatus(manualSaved ? "Restored your latest autosave. A saved checkpoint is available in Options." : "Restored your latest autosave. Create a checkpoint or download the SVG for a deliberate save.");
} else if (manualSaved && /<svg[\s>]/i.test(manualSaved)) {
  loadSvg(manualSaved);
  setStatus("Restored your locally saved SVG. Your file never left this browser.");
} else {
  loadSvg(SAMPLE_SVG);
}
