(() => {
  "use strict";

  const measurementId = String(window.SVG_VECTOR_LAB_GA_ID || "").trim();
  const productionHost = location.hostname === "svgvectorlab.com" || location.hostname.endsWith(".svgvectorlab.com");
  const configured = productionHost && /^G-[A-Z0-9]{6,20}$/.test(measurementId);
  const consentKey = "svg-vector-lab:analytics-consent";
  const gpcEnabled = navigator.globalPrivacyControl === true;
  let consent = "unset";
  let analyticsStarted = false;

  const clickTargetById = Object.freeze({
    addNodeBtn: "path_add_node",
    applyCanvasSizeBtn: "canvas_apply_size",
    applyTransformBtn: "transform_apply",
    backgroundAlphaInput: "canvas_background_opacity",
    backgroundHexInput: "canvas_background_color",
    backgroundInput: "canvas_background_color",
    bringForwardBtn: "layer_forward",
    canvasRatioToggle: "canvas_ratio",
    closePathBtn: "path_close",
    convertPathBtn: "convert_to_path",
    copySvgBtn: "export_copy_svg",
    curveNodeBtn: "path_make_curved",
    deleteBtn: "selection_delete",
    downloadPngBtn: "export_download_png",
    downloadSvgBtn: "export_download_svg",
    duplicateBtn: "selection_duplicate",
    fillAlphaInput: "fill_opacity",
    fillHexInput: "fill_color",
    fillInput: "fill_color",
    fillNoneBtn: "fill_toggle",
    fitBtn: "canvas_fit",
    freehandToolBtn: "tool_freehand",
    gradientBtn: "fill_gradient",
    gridSizeInput: "grid_size",
    gridToggle: "grid_toggle",
    groupBtn: "selection_group",
    handToolBtn: "tool_hand",
    joinPathsBtn: "path_join",
    leftAddTab: "tab_add",
    leftLayersTab: "tab_layers",
    leftSourceTab: "tab_source",
    loadInputBtn: "source_apply",
    loadSampleBtn: "document_sample",
    mobileInspectorBtn: "panel_inspector",
    mobileSourceBtn: "panel_source",
    normalizePathBtn: "path_normalize",
    objectRatioToggle: "object_ratio",
    opacityInput: "element_opacity",
    pathInput: "path_data",
    pasteAsObjectsBtn: "paste_as_objects",
    penToolBtn: "tool_pen",
    pngHeightInput: "png_height",
    pngScaleInput: "png_scale",
    pngWidthInput: "png_width",
    redoBtn: "history_redo",
    refreshLayersBtn: "layers_refresh",
    removeNodeBtn: "path_remove_node",
    replaceFromPasteBtn: "paste_replace_document",
    restoreLocalBtn: "checkpoint_restore",
    rightDesignTab: "tab_design",
    rightNotesTab: "tab_notes",
    rightPathTab: "tab_path",
    saveLocalBtn: "checkpoint_save",
    sendBackwardBtn: "layer_backward",
    setAttrBtn: "attribute_set",
    snapToggle: "snap_toggle",
    straightNodeBtn: "path_make_straight",
    strokeNoneBtn: "stroke_toggle",
    strokeAlphaInput: "stroke_opacity",
    strokeDashInput: "stroke_dash",
    strokeHexInput: "stroke_color",
    strokeInput: "stroke_color",
    strokeLinecapInput: "stroke_linecap",
    strokeLinejoinInput: "stroke_linejoin",
    strokeWidthInput: "stroke_width",
    toggleInspectorBtn: "panel_inspector",
    toggleSourceBtn: "panel_source",
    translateXInput: "transform_translate_x",
    translateYInput: "transform_translate_y",
    rotateInput: "transform_rotate",
    scaleInput: "transform_scale",
    undoBtn: "history_undo",
    ungroupBtn: "selection_ungroup",
    zoomInput: "zoom_custom"
  });
  const clickTargets = new Set([
    ...Object.values(clickTargetById),
    "analytics_allow", "analytics_decline", "analytics_preferences", "dialog_cancel",
    "menu_arrange", "menu_edit", "menu_export", "menu_navigation", "menu_options",
    "menu_shortcuts", "menu_view", "menu_zoom", "navigation_link", "panel_close",
    "geometry_value", "path_command_value",
    "shape_check", "shape_ellipse", "shape_heart", "shape_line", "shape_polygon",
    "shape_rect", "shape_star", "shape_text", "zoom_50", "zoom_100", "zoom_150",
    "zoom_200", "zoom_300", "zoom_400", "align_bottom", "align_center",
    "align_left", "align_middle", "align_right", "align_top",
    "distribute_horizontal", "distribute_vertical"
  ]);
  const allowedEvents = new Set([
    "ad_slot_status",
    "ad_slot_view",
    "control_change",
    "editor_action",
    "editor_document_load",
    "editor_export",
    "editor_session_start",
    "site_click"
  ]);
  const allowedValues = {
    action: new Set([
      "add_gradient", "add_image", "add_shape", "align", "apply_transform", "canvas_resize",
      "convert_to_path", "copy_objects", "distribute", "draw_path", "duplicate", "group",
      "join_paths", "move_element", "move_layer", "move_path_node", "normalize_path", "paste_objects",
      "redo", "remove_element", "resize_element", "restore_checkpoint", "rotate_element",
      "save_checkpoint", "select_tool", "set_attribute", "toggle_fill", "toggle_stroke", "undo", "ungroup"
    ]),
    action_surface: new Set(["canvas", "dialog", "inspector", "keyboard", "menu", "source", "startup", "toolbar"]),
    ad_placement: new Set([
      "article_primary", "article_secondary", "editor_header", "left_layers",
      "left_source", "right_design", "right_notes", "right_path", "unknown"
    ]),
    ad_status: new Set(["filled", "request_error", "unfilled"]),
    click_area: new Set([
      "canvas_toolbar", "consent", "content", "dialog", "editor_topbar",
      "inspector_panel", "site_footer", "site_header", "source_panel"
    ]),
    click_target: clickTargets,
    navigation_target: new Set([
      "about", "bezier_calculator", "contact", "cookies", "coordinate_calculator", "edit_svg",
      "editor", "email_share", "external", "features", "github", "guide_article",
      "guides", "editorial_policy", "path_editor", "png_converter", "privacy", "shape_converter",
      "social_share", "terms"
    ]),
    document_source: new Set([
      "autosave", "checkpoint", "clipboard", "drag_drop", "file_picker", "sample",
      "source", "starter_blank", "starter_path", "starter_png", "starter_shapes"
    ]),
    element_type: new Set([
      "circle", "ellipse", "g", "image", "line", "mixed", "none", "other",
      "path", "polygon", "polyline", "rect", "text", "use"
    ]),
    export_format: new Set(["clipboard", "png", "svg"]),
    outcome: new Set(["blocked", "cancelled", "error", "success"]),
    selection_size: new Set(["multiple", "none", "one"]),
    tool: new Set(["freehand", "hand", "pen", "select"])
  };

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }

  function readConsent() {
    if (gpcEnabled) return "denied";
    try {
      const saved = localStorage.getItem(consentKey);
      return saved === "granted" || saved === "denied" ? saved : "unset";
    } catch {
      return "unset";
    }
  }

  function writeConsent(value) {
    try {
      localStorage.setItem(consentKey, value);
    } catch {
      /* Consent remains valid for this page when storage is unavailable. */
    }
  }

  function consentState(analyticsStorage) {
    return {
      ad_personalization: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      analytics_storage: analyticsStorage
    };
  }

  function startAnalytics() {
    if (!configured || analyticsStarted) return;
    analyticsStarted = true;
    track("editor_session_start", {
      action_surface: location.pathname === "/" ? "startup" : "menu",
      outcome: "success"
    });
  }

  function cleanParameters(parameters) {
    const clean = {};
    for (const [name, value] of Object.entries(parameters || {})) {
      if (!Object.hasOwn(allowedValues, name)) continue;
      const normalized = String(value || "").toLowerCase();
      if (allowedValues[name].has(normalized)) clean[name] = normalized;
    }
    return clean;
  }

  function track(eventName, parameters = {}) {
    if (!configured || consent !== "granted" || !allowedEvents.has(eventName)) return false;
    gtag("event", eventName, cleanParameters(parameters));
    return true;
  }

  function clickArea(element) {
    if (element.closest("[data-analytics-consent], .analytics-preferences")) return "consent";
    if (element.closest("dialog")) return "dialog";
    if (element.closest(".topbar")) return "editor_topbar";
    if (element.closest(".source-panel")) return "source_panel";
    if (element.closest(".canvas-toolbar, .center-panel")) return "canvas_toolbar";
    if (element.closest(".inspector-panel")) return "inspector_panel";
    if (element.closest(".content-header")) return "site_header";
    if (element.closest(".page-footer")) return "site_footer";
    return "content";
  }

  function navigationTarget(anchor) {
    const rawHref = anchor.getAttribute("href") || "";
    if (rawHref.startsWith("mailto:")) return "email_share";
    let url;
    try {
      url = new URL(rawHref, location.origin);
    } catch {
      return "external";
    }
    if (url.origin !== location.origin) {
      if (url.hostname === "github.com") return "github";
      if (["twitter.com", "www.linkedin.com", "www.reddit.com", "www.facebook.com"].includes(url.hostname)) {
        return "social_share";
      }
      return "external";
    }
    const path = url.pathname.replace(/\/index\.html$/, "/");
    const routes = {
      "/": "editor",
      "/about/": "about",
      "/cubic-bezier-calculator/": "bezier_calculator",
      "/contact/": "contact",
      "/cookies/": "cookies",
      "/convert-shapes-to-paths/": "shape_converter",
      "/edit-svg-online/": "edit_svg",
      "/editorial-policy/": "editorial_policy",
      "/free-svg-editor/": "features",
      "/guides/": "guides",
      "/privacy/": "privacy",
      "/svg-coordinate-calculator/": "coordinate_calculator",
      "/svg-path-editor/": "path_editor",
      "/svg-to-png/": "png_converter",
      "/terms/": "terms"
    };
    if (Object.hasOwn(routes, path)) return routes[path];
    if (path.startsWith("/guides/")) return "guide_article";
    return "external";
  }

  function classifyClick(control) {
    if (control.matches("a[href]")) {
      return { click_target: "navigation_link", navigation_target: navigationTarget(control) };
    }
    if (control.matches("[data-consent-accept]")) return { click_target: "analytics_allow" };
    if (control.matches("[data-consent-decline]")) return { click_target: "analytics_decline" };
    if (control.matches(".analytics-preferences")) return { click_target: "analytics_preferences" };
    if (control.matches("[data-close-panel]")) return { click_target: "panel_close" };
    if (control.matches('[type="submit"][value="cancel"]')) return { click_target: "dialog_cancel" };

    const normalizedId = control.id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (Object.hasOwn(clickTargetById, normalizedId)) {
      return { click_target: clickTargetById[normalizedId] };
    }
    if (control.dataset.addShape) return { click_target: `shape_${control.dataset.addShape}` };
    if (control.dataset.align) return { click_target: `align_${control.dataset.align}` };
    if (control.dataset.distribute) return { click_target: `distribute_${control.dataset.distribute}` };
    if (control.dataset.zoom) return { click_target: `zoom_${Math.round(Number(control.dataset.zoom) * 100)}` };
    if (control.matches("summary")) {
      if (control.matches(".site-menu-label")) return { click_target: "menu_navigation" };
      const label = control.textContent.trim().toLowerCase();
      const menus = {
        arrange: "menu_arrange",
        edit: "menu_edit",
        export: "menu_export",
        options: "menu_options",
        shortcuts: "menu_shortcuts",
        view: "menu_view",
        zoom: "menu_zoom"
      };
      if (Object.hasOwn(menus, label)) return { click_target: menus[label] };
    }
    return null;
  }

  function installClickTracking() {
    document.addEventListener("click", (event) => {
      const control = event.target.closest?.('a[href], button, summary, [role="tab"]');
      if (!control || control.closest(".ad-slot, ins.adsbygoogle")) return;
      const classified = classifyClick(control);
      if (!classified) return;
      track("site_click", {
        click_area: clickArea(control),
        ...classified
      });
    });
    document.addEventListener("change", (event) => {
      const control = event.target;
      if (!control?.matches?.("input, select, textarea") || control.closest(".ad-slot")) return;
      let classified = classifyClick(control);
      if (!classified && control.closest("#geometryControls")) {
        classified = { click_target: "geometry_value" };
      }
      if (!classified && control.closest("#pathTable")) {
        classified = { click_target: "path_command_value" };
      }
      if (!classified) return;
      track("control_change", {
        click_area: clickArea(control),
        ...classified
      });
    });
  }

  function syncConsentUi() {
    const panel = document.querySelector("[data-analytics-consent]");
    const status = document.querySelector("[data-analytics-consent-status]");
    if (status) {
      status.textContent = gpcEnabled
        ? "Analytics is off because Global Privacy Control is enabled."
        : consent === "granted"
          ? "Analytics is on."
          : consent === "denied"
            ? "Analytics is off."
            : "Choose whether to allow analytics.";
    }
    panel?.querySelector("[data-consent-accept]")?.toggleAttribute("disabled", gpcEnabled);
  }

  function closeConsentUi() {
    document.querySelector("[data-analytics-consent]")?.removeAttribute("data-open");
  }

  function openConsentUi() {
    const panel = document.querySelector("[data-analytics-consent]");
    if (!panel) return;
    panel.setAttribute("data-open", "");
    syncConsentUi();
    panel.querySelector("button:not([disabled])")?.focus();
  }

  function updateConsent(nextConsent) {
    consent = gpcEnabled ? "denied" : nextConsent;
    writeConsent(consent);
    gtag("consent", "update", consentState(consent));
    if (consent === "granted") startAnalytics();
    syncConsentUi();
    closeConsentUi();
  }

  function mountConsentUi() {
    if (!configured || document.querySelector("[data-analytics-consent]")) return;
    const panel = document.createElement("section");
    panel.className = "analytics-consent";
    panel.dataset.analyticsConsent = "";
    panel.setAttribute("aria-label", "Analytics choices");
    panel.innerHTML = `
      <div class="analytics-consent__card">
        <p class="analytics-consent__eyebrow">Privacy choice</p>
        <h2>Help improve SVG Vector Lab?</h2>
        <p>The Google tag sends cookieless page-view and consent-state signals with analytics storage off by default. If you allow analytics, it can also record broad editor actions such as imports, tools, and exports. It never receives SVG contents, typed values, filenames, clipboard data, or pointer coordinates.</p>
        <p class="analytics-consent__status" data-analytics-consent-status></p>
        <div class="analytics-consent__actions">
          <button type="button" data-consent-accept>Allow analytics</button>
          <button type="button" data-consent-decline>Keep analytics off</button>
          <a href="/privacy/">Privacy policy</a>
        </div>
      </div>`;
    document.body.append(panel);

    const preferences = document.createElement("button");
    preferences.type = "button";
    preferences.className = "analytics-preferences";
    preferences.textContent = "Analytics choices";
    preferences.addEventListener("click", openConsentUi);
    document.body.append(preferences);

    panel.querySelector("[data-consent-accept]").addEventListener("click", () => updateConsent("granted"));
    panel.querySelector("[data-consent-decline]").addEventListener("click", () => updateConsent("denied"));
    panel.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && consent !== "unset") closeConsentUi();
    });
    syncConsentUi();
    if (consent === "unset") openConsentUi();
  }

  window.svgAnalytics = Object.freeze({
    get consent() {
      return consent;
    },
    openPreferences: openConsentUi,
    track
  });

  if (!configured) return;
  consent = readConsent();
  if (consent === "granted") {
    gtag("consent", "update", consentState("granted"));
    startAnalytics();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      mountConsentUi();
      installClickTracking();
    }, { once: true });
  } else {
    mountConsentUi();
    installClickTracking();
  }
})();
