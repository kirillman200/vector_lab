import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = join(root, "public");
const origin = "https://svgvectorlab.com";
const routes = new Map([
  ["/", "index.html"],
  ["/free-svg-editor/", "free-svg-editor/index.html"],
  ["/about/", "about/index.html"],
  ["/guides/", "guides/index.html"],
  ["/guides/edit-svg-paths/", "guides/edit-svg-paths/index.html"],
  ["/guides/bezier-curves/", "guides/bezier-curves/index.html"],
  ["/guides/convert-shapes-to-paths/", "guides/convert-shapes-to-paths/index.html"],
  ["/guides/optimize-svg/", "guides/optimize-svg/index.html"],
  ["/privacy/", "privacy/index.html"],
  ["/terms/", "terms/index.html"],
  ["/contact/", "contact/index.html"],
]);

function read(relativePath) {
  return readFileSync(join(siteRoot, relativePath), "utf8");
}

function readRoot(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function matchOne(html, pattern, label, file) {
  const match = html.match(pattern);
  assert.ok(match, `${file} is missing ${label}`);
  return match[1];
}

test("every public route has unique metadata and valid JSON-LD", () => {
  const titles = new Set();
  const descriptions = new Set();

  for (const [route, file] of routes) {
    const html = read(file);
    const title = matchOne(html, /<title>([^<]+)<\/title>/i, "a title", file);
    const description = matchOne(
      html,
      /<meta\s+name="description"\s+content="([^"]+)"/i,
      "a meta description",
      file,
    );
    const canonical = matchOne(
      html,
      /<link\s+rel="canonical"\s+href="([^"]+)"/i,
      "a canonical URL",
      file,
    );

    assert.equal(canonical, `${origin}${route}`);
    assert.ok(!titles.has(title), `duplicate title: ${title}`);
    assert.ok(!descriptions.has(description), `duplicate description: ${description}`);
    titles.add(title);
    descriptions.add(description);

    for (const script of html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
      assert.doesNotThrow(() => JSON.parse(script[1]), `invalid JSON-LD in ${file}`);
    }
  }
});

test("root-relative internal links resolve to files", () => {
  const htmlFiles = [...routes.values(), "404.html"];
  for (const file of htmlFiles) {
    const html = read(file);
    for (const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)"/g)) {
      const urlPath = match[1];
      const relativeTarget = urlPath === "/"
        ? "index.html"
        : urlPath.endsWith("/")
          ? `${urlPath.slice(1)}index.html`
          : urlPath.slice(1);
      assert.ok(existsSync(join(siteRoot, relativeTarget)), `${file} links to missing ${urlPath}`);
    }
  }
});

test("every HTML page links to the free editor landing page", () => {
  for (const file of [...routes.values(), "404.html"]) {
    assert.match(read(file), /href="\/free-svg-editor\/"/, `${file} is missing the free editor link`);
  }
});

test("sitemap and robots expose every indexable route", () => {
  const sitemap = read("sitemap.xml");
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(locations, [...routes.keys()].map((route) => `${origin}${route}`));
  assert.match(read("robots.txt"), new RegExp(`Sitemap: ${origin.replaceAll(".", "\\.")}\/sitemap\\.xml`));
});

test("llms.txt provides a structured map of the public site", () => {
  const llms = read("llms.txt");
  assert.match(llms, /^# SVG Vector Lab$/m);
  assert.match(llms, /^> SVG Vector Lab is a free, open-source SVG editor/m);
  assert.match(llms, /^## Product$/m);
  assert.match(llms, /^## SVG Guides$/m);
  assert.match(llms, /^## Site Information$/m);
  for (const route of routes.keys()) {
    assert.match(llms, new RegExp(`https://svgvectorlab\\.com${route.replaceAll("/", "\\/")}`), `llms.txt is missing ${route}`);
  }
});

test("agent discovery files truthfully describe the public browser app", () => {
  const robots = read("robots.txt");
  assert.match(robots, /^Content-Signal: ai-train=no, search=yes, ai-input=yes$/m);

  const auth = read("auth.md");
  assert.match(auth, /^# .*auth\.md$/m);
  assert.match(auth, /no accounts, protected HTTP APIs, registration flow/i);
  assert.match(auth, /Supported method: anonymous browser access/);

  const skillPath = ".well-known/agent-skills/svg-vector-editor/SKILL.md";
  const skill = read(skillPath);
  const index = JSON.parse(read(".well-known/agent-skills/index.json"));
  assert.equal(index.$schema, "https://schemas.agentskills.io/discovery/0.2.0/schema.json");
  assert.equal(index.skills.length, 1);
  assert.equal(index.skills[0].name, "svg-vector-editor");
  assert.equal(index.skills[0].type, "skill-md");
  assert.equal(index.skills[0].url, `${origin}/${skillPath}`);
  assert.equal(index.skills[0].digest, `sha256:${createHash("sha256").update(skill).digest("hex")}`);
});

test("the editor registers useful WebMCP tools on page load", () => {
  const html = read("index.html");
  const webmcp = read("js/webmcp.js");
  assert.match(html, /<script src="js\/webmcp\.js"><\/script>/);
  assert.match(webmcp, /document\.modelContext \|\| navigator\.modelContext/);
  assert.match(webmcp, /registerTool\(tool, options\)/);
  assert.match(webmcp, /new AbortController\(\)/);
  for (const tool of ["get_current_svg", "set_svg_markup", "load_sample_svg", "fit_svg_to_view"]) {
    assert.match(webmcp, new RegExp(`name: "${tool}"`));
  }
});

test("hosting and advertising files are safe", () => {
  assert.ok(existsSync(join(siteRoot, "_headers")));
  const manifest = JSON.parse(read("site.webmanifest"));
  assert.equal(manifest.name, "SVG Vector Lab");
  assert.equal(manifest.short_name, "SVG Vector Lab");
  assert.equal(manifest.id, "/");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  const ads = read("ads.txt").trim();
  assert.match(ads, /^google\.com, pub-\d+, DIRECT, f08c47fec0942fa0$/);
  assert.doesNotMatch(ads, /pub-0{8,}/, "placeholder publisher IDs must not be published");

  const headers = read("_headers");
  assert.match(headers, /Strict-Transport-Security:/);
  assert.match(headers, /X-Frame-Options: DENY/);

  const worker = readRoot("src/worker.mjs");
  assert.match(worker, /Content-Security-Policy/);
  assert.match(worker, /'strict-dynamic'/);
  assert.match(worker, /element\.setAttribute\("nonce", nonce\)/);
  assert.match(worker, /headers\.set\("Strict-Transport-Security"/);
  assert.match(worker, /headers\.set\("X-Frame-Options", "DENY"\)/);
  assert.match(worker, /\.workers\.dev/);
  assert.match(worker, /X-Robots-Tag/);
  assert.match(worker, /headers\.set\("Link", HOMEPAGE_DISCOVERY_LINKS\)/);
  assert.match(worker, /headers\.set\("Content-Signal", CONTENT_SIGNAL\)/);
  assert.match(worker, /text\/markdown; charset=utf-8/);
  assert.match(worker, /x-markdown-tokens/);
  assert.ok((worker.match(/appendVary\(headers, "Accept"\)/g) || []).length >= 2);
});

test("Cloudflare publishes only the public allowlist", () => {
  const wrangler = JSON.parse(readRoot("wrangler.jsonc"));
  assert.equal(wrangler.assets.directory, "./public");
  assert.equal(wrangler.assets.binding, "ASSETS");
  assert.equal(wrangler.assets.run_worker_first, true);
  assert.equal(wrangler.assets.not_found_handling, "404-page");
  assert.equal(wrangler.main, "src/worker.mjs");
  assert.equal(wrangler.workers_dev, false);
  assert.equal(wrangler.preview_urls, false);

  const forbiddenPublicPaths = [
    ".git",
    ".gitignore",
    ".env",
    "wrangler.jsonc",
    "README.md",
    "LICENSE",
    "SECURITY.md",
    "LAUNCH_CHECKLIST.md",
    "tests",
    ".github",
  ];
  for (const relativePath of forbiddenPublicPaths) {
    assert.equal(
      existsSync(join(siteRoot, relativePath)),
      false,
      `${relativePath} must not be inside the public deployment directory`,
    );
  }

  const assetsIgnore = read(".assetsignore");
  assert.match(assetsIgnore, /^\.git\*/m);
  assert.match(assetsIgnore, /^\.env\*/m);
  assert.match(assetsIgnore, /^\*\.pem$/m);
});

test("every editor tab contains the configured responsive AdSense unit", () => {
  const html = read("index.html");
  const loaderMatches = html.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-7469113252837951/g) || [];
  assert.equal(loaderMatches.length, 1, "the AdSense loader must appear exactly once");

  const units = [...html.matchAll(/<ins class="adsbygoogle"([\s\S]*?)<\/ins>/g)];
  assert.equal(units.length, 5, "one ad unit is required in each editor tab");
  for (const [, attributes] of units) {
    assert.match(attributes, /data-ad-client="ca-pub-7469113252837951"/);
    assert.match(attributes, /data-ad-slot="2173866609"/);
    assert.match(attributes, /data-ad-format="auto"/);
    assert.match(attributes, /data-full-width-responsive="true"/);
  }

  for (const panelId of [
    "left-source-panel",
    "left-layers-panel",
    "right-design-panel",
    "right-path-panel",
    "right-notes-panel",
  ]) {
    const panelStart = html.indexOf(`id="${panelId}"`);
    assert.notEqual(panelStart, -1, `missing panel ${panelId}`);
    const nextPanel = html.indexOf('class="tab-panel"', panelStart + 1);
    const panelMarkup = html.slice(panelStart, nextPanel === -1 ? html.length : nextPanel);
    assert.match(panelMarkup, /class="adsbygoogle"/, `${panelId} is missing its ad unit`);
  }

  assert.doesNotMatch(html, /adsbygoogle\s*=.*\.push/s, "ad initialization must remain in the external script");
});

test("newly loaded artwork is fitted and centered by default", () => {
  const app = read("js/app.js");
  assert.match(app, /requestAnimationFrame\(\(\) => fitToView\(\{ announce: false \}\)\)/);
  assert.match(app, /scrollLeft = Math\.max\(0, \(els\.stage\.scrollWidth - els\.stage\.clientWidth\) \/ 2\)/);
  assert.match(app, /scrollTop = Math\.max\(0, \(els\.stage\.scrollHeight - els\.stage\.clientHeight\) \/ 2\)/);
  assert.match(app, /recordHistory: false, fit: false/, "undo and redo should preserve manual zoom");
});

test("the editor reserves space for startup UI and responsive ads", () => {
  const html = read("index.html");
  const css = read("styles.css");
  const icons = read("js/icons.js");
  const app = read("js/app.js");

  for (const id of ["loadSampleBtn", "undoBtn", "redoBtn", "fitBtn", "loadInputBtn"]) {
    assert.match(html, new RegExp(`id="${id}"[^>]*class="[^"]*button-icon-pending`), `${id} must reserve its icon width`);
  }
  assert.match(html, /id="geometryControls"[^>]*>[\s\S]*?geometry-placeholder/);
  assert.match(css, /\.button-icon-pending:not\(\.button-icon-ready\)::before/);
  assert.match(css, /\.ad-slot \.adsbygoogle \{[\s\S]*?min-height: 250px;/);
  assert.match(css, /height: calc\(100svh - 70px\);/);
  assert.match(icons, /classList\.add\("button-icon-ready"\)/);
  assert.match(app, /geometryPlaceholder\.className = "learn-panel geometry-placeholder"/);
});

test("path command fields update the current command after overlay rerenders", () => {
  const app = read("js/app.js");
  assert.match(app, /forEach\(\(command, commandIndex\) =>/);
  assert.match(app, /const currentCommand = state\.pathCommands\[commandIndex\]/);
  assert.match(app, /currentCommand\.values\[i\] = value/);
  assert.doesNotMatch(app, /command\.values\[i\] = Number\(input\.value/, "inputs must not mutate stale command closures");
  assert.match(app, /input\.valueAsNumber/);
  assert.match(app, /aria-invalid/);
});
