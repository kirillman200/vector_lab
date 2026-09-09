import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../public/js/analytics.js", import.meta.url), "utf8");
const consentKey = "svg-vector-lab:analytics-consent:v2";

function visit({ saved, legacy, gpc = false, hostname = "svgvectorlab.com", pathname = "/guides/", search = "", hash = "", privateTool = false, storageBlocked = false } = {}) {
  const storage = new Map([[consentKey, saved], ["svg-vector-lab:analytics-consent", legacy]]);
  const scripts = [];
  const listeners = new Map();
  const controls = new Map();
  let panel;
  let reloads = 0;
  function element() {
    return {
      dataset: {},
      handlers: new Map(),
      setAttribute() {}, removeAttribute() {}, toggleAttribute() {}, focus() {},
      addEventListener(name, callback) { this.handlers.set(name, callback); },
      querySelector(selector) {
        if (!controls.has(selector)) controls.set(selector, element());
        return controls.get(selector);
      }
    };
  }
  const document = {
    readyState: "loading",
    head: { append(script) { scripts.push(script); } },
    body: { append(node) { if (node.className === "analytics-consent") panel = node; } },
    createElement: element,
    addEventListener(name, callback) { listeners.set(name, callback); },
    querySelector(selector) {
      if (selector === "[data-analytics-consent]") return panel;
      if (selector === ".app-shell, [data-calculator]") return privateTool ? {} : null;
      return null;
    }
  };
  const window = { SVG_VECTOR_LAB_GA_ID: "G-XLNFRJLFK4" };
  const location = { hostname, pathname, search, hash, reload() { reloads++; } };
  vm.runInNewContext(source, {
    window, document, location, navigator: { globalPrivacyControl: gpc }, URL,
    localStorage: {
      getItem(key) { if (storageBlocked) throw new Error("Storage blocked"); return storage.get(key) ?? null; },
      setItem(key, value) { if (storageBlocked) throw new Error("Storage blocked"); storage.set(key, value); }
    }
  });
  return {
    window, scripts, storage,
    get reloads() { return reloads; },
    ready() { document.readyState = "complete"; listeners.get("DOMContentLoaded")?.(); },
    choose(accept) { controls.get(accept ? "[data-consent-accept]" : "[data-consent-decline]").handlers.get("click")(); },
    clarityCalls() { return Array.from(window.clarity?.q || [], (args) => JSON.parse(JSON.stringify(Array.from(args)))); }
  };
}

test("Clarity waits for a new opt-in, then loads the supplied project once", () => {
  const page = visit({ legacy: "granted" });
  page.ready();
  assert.equal(page.scripts.length, 0);
  page.choose(true);
  page.choose(true);
  assert.equal(page.scripts.length, 1);
  assert.equal(page.scripts[0].src, "https://www.clarity.ms/tag/yfcj2q2je6?ref=bwt");
  assert.equal(page.scripts[0].async, true);
  assert.deepEqual(page.clarityCalls(), [["consentv2", { analytics_Storage: "granted", ad_Storage: "denied" }]]);
});

test("saved consent starts Clarity only after the page DOM is available", () => {
  const page = visit({ saved: "granted" });
  assert.equal(page.scripts.length, 0);
  page.ready();
  assert.equal(page.scripts.length, 1);
});

test("denial, GPC, preview hosts, private tools, and URL inputs prevent Clarity loading", () => {
  for (const options of [
    { saved: "denied" }, { gpc: true }, { hostname: "localhost" },
    { hostname: "vector-lab.workers.dev" }, { pathname: "/" },
    { pathname: "/index.html" }, { privateTool: true },
    { search: "?source=private" }, { hash: "#private" }
  ]) {
    const page = visit({ saved: "granted", ...options });
    page.ready();
    assert.equal(page.scripts.length, 0, JSON.stringify(options));
  }
  const page = visit({ gpc: true });
  page.ready();
  page.choose(true);
  assert.equal(page.scripts.length, 0);
});

test("withdrawal revokes Clarity storage and unloads even a pending recorder", () => {
  const page = visit({ saved: "granted" });
  page.ready();
  page.choose(false);
  assert.equal(page.storage.get(consentKey), "denied");
  assert.deepEqual(page.clarityCalls().slice(-2), [
    ["consentv2", { analytics_Storage: "denied", ad_Storage: "denied" }], ["stop"]
  ]);
  assert.equal(page.reloads, 1);
  const nextPage = visit({ saved: page.storage.get(consentKey) });
  nextPage.ready();
  assert.equal(nextPage.scripts.length, 0);
});

test("blocked storage keeps Clarity off until a page-local opt-in", () => {
  const page = visit({ storageBlocked: true });
  page.ready();
  assert.equal(page.scripts.length, 0);
  page.choose(true);
  assert.equal(page.scripts.length, 1);
});
