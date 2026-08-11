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
  ["/edit-svg-online/", "edit-svg-online/index.html"],
  ["/svg-path-editor/", "svg-path-editor/index.html"],
  ["/convert-shapes-to-paths/", "convert-shapes-to-paths/index.html"],
  ["/svg-to-png/", "svg-to-png/index.html"],
  ["/svg-coordinate-calculator/", "svg-coordinate-calculator/index.html"],
  ["/cubic-bezier-calculator/", "cubic-bezier-calculator/index.html"],
  ["/about/", "about/index.html"],
  ["/editorial-policy/", "editorial-policy/index.html"],
  ["/guides/", "guides/index.html"],
  ["/guides/svg-viewbox/", "guides/svg-viewbox/index.html"],
  ["/guides/edit-svg-paths/", "guides/edit-svg-paths/index.html"],
  ["/guides/bezier-curves/", "guides/bezier-curves/index.html"],
  ["/guides/convert-shapes-to-paths/", "guides/convert-shapes-to-paths/index.html"],
  ["/guides/optimize-svg/", "guides/optimize-svg/index.html"],
  ["/guides/path-commands/", "guides/path-commands/index.html"],
  ["/guides/svg-transforms/", "guides/svg-transforms/index.html"],
  ["/guides/svg-strokes/", "guides/svg-strokes/index.html"],
  ["/guides/svg-gradients/", "guides/svg-gradients/index.html"],
  ["/guides/svg-accessibility/", "guides/svg-accessibility/index.html"],
  ["/guides/responsive-svg/", "guides/responsive-svg/index.html"],
  ["/guides/clipping-and-masking/", "guides/clipping-and-masking/index.html"],
  ["/guides/debug-invisible-svg/", "guides/debug-invisible-svg/index.html"],
  ["/privacy/", "privacy/index.html"],
  ["/cookies/", "cookies/index.html"],
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
  const htmlFiles = [
    ...routes.values(),
    "404.html",
    "partials/site-header.html",
    "partials/site-footer.html",
  ];
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

test("every published image has descriptive alternative text", () => {
  const htmlFiles = [
    ...routes.values(),
    "404.html",
    "partials/site-header.html",
    "partials/site-footer.html",
  ];

  for (const file of htmlFiles) {
    const html = read(file);
    for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
      assert.match(match[0], /\salt="[^"]+"/i, `${file} has an image without descriptive alt text`);
    }

    if (/property="og:image"/.test(html)) {
      assert.match(html, /property="og:image:alt"\s+content="[^"]+"/, `${file} is missing Open Graph image alt text`);
    }
    if (/name="twitter:image"/.test(html)) {
      assert.match(html, /name="twitter:image:alt"\s+content="[^"]+"/, `${file} is missing Twitter image alt text`);
    }
  }
});

test("landing page previews use the current editor screenshot dimensions", () => {
  for (const file of [
    "free-svg-editor/index.html",
    "edit-svg-online/index.html",
    "svg-path-editor/index.html",
    "convert-shapes-to-paths/index.html",
    "svg-to-png/index.html",
  ]) {
    assert.match(
      read(file),
      /<img\s+src="\/docs\/screenshot\.webp"\s+width="1270"\s+height="714"\s+alt="[^"]+"/,
      `${file} is not using the current editor screenshot metadata`,
    );
  }
});

test("every HTML page links to the free editor landing page", () => {
  for (const file of [...routes.values(), "404.html"]) {
    assert.match(
      read(file),
      /<site-header><\/site-header>|href="\/free-svg-editor\/"/,
      `${file} is missing the shared header`,
    );
  }
  assert.match(read("partials/site-header.html"), /href="\/free-svg-editor\/">Features<\/a>/);
  assert.match(read("partials/site-footer.html"), /href="\/free-svg-editor\/">Features<\/a>/);
});

test("the mobile header uses a native burger menu with working navigation", () => {
  const header = read("partials/site-header.html");
  const editor = read("index.html");
  const contentCss = read("content.css");
  const editorCss = read("styles.css");
  assert.match(header, /<details class="site-menu">/);
  assert.match(header, /<summary class="site-menu-label">/);
  assert.equal((header.match(/<span><\/span>/g) || []).length, 3);
  assert.match(header, /site-menu-open-text">Menu<\/span>/);
  assert.match(header, /site-menu-close-text">Close<\/span>/);
  assert.doesNotMatch(header, /site-menu-toggle|type="checkbox"/);
  assert.match(contentCss, /\.site-menu-label \{[\s\S]*?display: none;/);
  assert.match(contentCss, /\.site-menu\[open\] \.site-menu-icon > span:nth-child\(1\)[\s\S]*?rotate\(45deg\)/);
  assert.match(contentCss, /\.site-menu\[open\] \.site-menu-icon > span:nth-child\(3\)[\s\S]*?rotate\(-45deg\)/);
  assert.match(contentCss, /\.site-menu:not\(\[open\]\) \+ \.content-nav \{[\s\S]*?display: none;/);
  assert.match(contentCss, /\.content-header \{[\s\S]*?z-index: 100;/);
  assert.match(
    contentCss,
    /@media \(max-width: 900px\) \{[\s\S]*?\.site-menu-label \{[\s\S]*?display: inline-flex;/,
    "content pages must switch to the same compact-header breakpoint as the editor",
  );
  assert.doesNotMatch(
    contentCss.slice(contentCss.indexOf("@media (max-width: 720px)")),
    /\.content-header-inner|\.site-menu-label|\.site-menu \+ \.content-nav/,
    "article and footer mobile rules must not control the header breakpoint",
  );

  const sharedNav = matchOne(header, /<nav class="content-nav"[^>]*>([\s\S]*?)<\/nav>/, "shared primary navigation", "partials/site-header.html");
  const editorNav = matchOne(editor, /<nav class="menu-popover menu-links content-nav"[^>]*>([\s\S]*?)<\/nav>/, "editor primary navigation", "index.html");
  const links = (markup) => [...markup.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(links(editorNav), links(sharedNav), "editor and content headers must expose the same primary links");
  assert.match(header, /<\/details>\s*<nav class="content-nav"/, "desktop navigation must not be hidden inside a closed details element");
  assert.match(editor, /<details class="action-menu page-menu site-menu">[\s\S]*?site-menu-icon[\s\S]*?site-menu-close-text">Close<\/span>/);
  assert.match(editorCss, /\.topbar \.site-menu\[open\] \.site-menu-icon > span:nth-child\(1\)[\s\S]*?rotate\(45deg\)/);
  assert.match(editorCss, /\.topbar \.site-menu:not\(\[open\]\) > \.content-nav \{[\s\S]*?display: none;/);
  assert.match(editorCss, /\.top-actions > \.page-menu > \.content-nav \{[\s\S]*?left: auto;[\s\S]*?100vw - 24px/);
  assert.doesNotMatch(editorCss, /\.page-menu > summary::before/);
});

test("shared layout placeholders have a static-host fallback", () => {
  for (const file of [...routes.values(), "404.html"]) {
    const html = read(file);
    if (/<site-(?:header|footer)>/.test(html)) {
      assert.match(html, /<script src="\/js\/layout\.js" defer><\/script>/, `${file} is missing the layout fallback`);
    }
  }

  const layout = read("js/layout.js");
  const css = read("content.css");
  assert.match(layout, /hydrate\("site-header", "\/partials\/site-header\.html"\)/);
  assert.match(layout, /hydrate\("site-footer", "\/partials\/site-footer\.html"\)/);
  assert.match(layout, /host\.replaceWith\(template\.content\)/);
  assert.match(css, /site-header \{[\s\S]*?min-height: 70px;/);
  assert.match(css, /site-footer \{[\s\S]*?min-height: 230px;/);
});

test("content pages avoid loading editor-only dependencies", () => {
  const contentCss = read("content.css");
  const editorCss = read("styles.css");
  const contentStylesheets = new Set();
  assert.ok(contentCss.length < editorCss.length * 0.5, "content CSS should stay less than half the editor bundle");

  for (const file of [...routes.values()].filter((file) => file !== "index.html").concat("404.html")) {
    const html = read(file);
    assert.match(html, /href="\/content\.css(?:\?[^\"]+)?"/, `${file} is missing the content stylesheet`);
    contentStylesheets.add(matchOne(html, /href="(\/content\.css\?v=[^"]+)"/, "a cache-busted content stylesheet", file));
    assert.doesNotMatch(html, /href="\/?styles\.css"/, `${file} loads the editor stylesheet`);
    const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
    const isGuideArticle = file.startsWith("guides/") && file !== "guides/index.html";
    const isCalculator = file === "svg-coordinate-calculator/index.html" || file === "cubic-bezier-calculator/index.html";
    const expectedScripts = isGuideArticle
      ? [
          "/js/layout.js",
          "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7469113252837951",
          "/js/ads.js?v=20260718b",
        ]
      : isCalculator
        ? ["/js/layout.js", "/js/svg-calculators.mjs"]
        : ["/js/layout.js"];
    assert.deepEqual(scripts, expectedScripts, `${file} loads an unexpected script`);
  }

  assert.equal(contentStylesheets.size, 1, "every content route must use the same content stylesheet version");

  assert.match(read("index.html"), /href="styles\.css(?:\?[^\"]+)?"/);
  assert.doesNotMatch(read("index.html"), /href="\/content\.css"/);
});

test("every HTML page exposes raster favicon fallbacks", () => {
  for (const asset of [
    "favicon.ico",
    "favicon-32.png",
    "apple-touch-icon.png",
    "favicon-192.png",
    "favicon-512.png",
  ]) {
    assert.ok(existsSync(join(siteRoot, asset)), `missing favicon asset ${asset}`);
  }

  for (const file of [...routes.values(), "404.html"]) {
    const html = read(file);
    assert.match(html, /rel="icon"[^>]+href="\/?favicon\.ico"/, `${file} is missing the ICO fallback`);
    assert.match(html, /type="image\/png"[^>]+href="\/?favicon-32\.png"/, `${file} is missing the PNG fallback`);
    assert.match(html, /rel="apple-touch-icon"[^>]+href="\/?apple-touch-icon\.png"/, `${file} is missing the Apple touch icon`);
  }

  const manifest = JSON.parse(read("site.webmanifest"));
  assert.ok(manifest.icons.some((icon) => icon.src === "favicon-192.png" && icon.type === "image/png"));
  assert.ok(manifest.icons.some((icon) => icon.src === "favicon-512.png" && icon.type === "image/png"));
});

test("homepage exposes a clean document outline", () => {
  const html = read("index.html");
  const appMarkup = html.slice(html.indexOf('<main class="app-shell">'), html.indexOf("</main>"));
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /<h1>Free Online SVG Editor for Paths, Points &amp; Attributes<\/h1>/);
  const heading = matchOne(html, /<h1>([^<]+)<\/h1>/i, "a direct H1", "index.html");
  assert.ok(heading.length >= 20, `homepage H1 is too short: ${heading.length} characters`);
  assert.doesNotMatch(appMarkup, /<h[1-6]\b/, "editor panel labels must not alter the page heading outline");
});

test("homepage includes useful paragraph content using the editor H1 topic", () => {
  const html = read("index.html");
  const content = matchOne(
    html,
    /<section class="editor-home-copy"[\s\S]*?>([\s\S]*?)<\/section>/,
    "editor homepage copy",
    "index.html",
  );
  const paragraphs = [...content.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((match) => match[1]);
  const plainText = content
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|nbsp);/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = plainText.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g)?.length || 0;

  assert.ok(paragraphs.length >= 3, "homepage needs multiple useful paragraphs");
  assert.ok(wordCount >= 250, `homepage editor copy has only ${wordCount} words`);
  assert.match(plainText, /free online SVG editor/i);
  assert.match(plainText, /paths, points, and attributes/i);
});

test("homepage search metadata stays within snippet-safe lengths", () => {
  const html = read("index.html");
  const title = matchOne(html, /<title>([^<]+)<\/title>/i, "a title", "index.html");
  const description = matchOne(
    html,
    /<meta\s+name="description"\s+content="([^"]+)"/i,
    "a meta description",
    "index.html",
  );
  assert.ok(title.length <= 60, `homepage title is too long: ${title.length} characters`);
  assert.ok(description.length <= 155, `homepage description is too long: ${description.length} characters`);
});

test("homepage provides lightweight social sharing links", () => {
  const html = read("partials/site-footer.html");
  assert.match(html, /aria-label="Share SVG Vector Lab"/);
  for (const host of ["twitter.com", "linkedin.com", "reddit.com", "facebook.com"]) {
    assert.match(html, new RegExp(host.replace(".", "\\.")), `missing share option for ${host}`);
  }
  assert.match(html, /href="mailto:/);
});

test("homepage anchor text is unique and descriptive", () => {
  for (const html of [read("index.html"), read("partials/site-footer.html")]) {
    const labels = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)]
      .map((match) => match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const duplicates = labels.filter((label, index) => labels.indexOf(label) !== index);
    assert.deepEqual(duplicates, [], `duplicate homepage anchor text: ${[...new Set(duplicates)].join(", ")}`);
  }
});

test("guides expose article dates, social metadata, and breadcrumb JSON-LD", () => {
  const guideFiles = [...routes.entries()]
    .filter(([route]) => route.startsWith("/guides/") && route !== "/guides/")
    .map(([, file]) => file);

  for (const file of guideFiles) {
    const html = read(file);
    assert.match(html, /property="article:published_time"/);
    assert.match(html, /property="article:modified_time"/);
    assert.match(html, /name="twitter:title"/);
    assert.match(html, /name="twitter:description"/);
    const records = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)]
      .map((match) => JSON.parse(match[1]));
    assert.ok(records.some((record) => record["@type"] === "BreadcrumbList"), `${file} is missing breadcrumb data`);
    const article = records.find((record) => Array.isArray(record["@type"]) && record["@type"].includes("Article"));
    assert.ok(article, `${file} is missing article data`);
    assert.match(article.dateModified, /^2026-(?:07|08)-\d{2}$/);
  }
});

test("refreshed guides expose authoritative references and a visible update date", () => {
  const guideFiles = [...routes.entries()]
    .filter(([route]) => route.startsWith("/guides/") && route !== "/guides/")
    .map(([, file]) => file);

  for (const file of guideFiles) {
    const html = read(file);
    assert.match(html, /Updated August 9, 2026/, `${file} is missing its visible refresh date`);
    assert.match(html, /property="article:modified_time" content="2026-08-09"/, `${file} has stale article metadata`);
    assert.match(
      html,
      /href="https:\/\/(?:developer\.mozilla\.org|www\.w3\.org|svgo\.dev|inkscape-manuals\.readthedocs\.io)\//,
      `${file} is missing an authoritative external reference`,
    );
  }
});

test("the guide library links to substantial task-specific articles", () => {
  const guideEntries = [...routes.entries()].filter(([route]) => route.startsWith("/guides/") && route !== "/guides/");
  const guideIndex = read("guides/index.html");
  assert.ok(guideEntries.length >= 13, `only ${guideEntries.length} guide articles are published`);

  for (const [route, file] of guideEntries) {
    assert.match(guideIndex, new RegExp(`href="${route.replaceAll("/", "\\/")}"`), `${route} is missing from the guide library`);
    const html = read(file)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z0-9#]+;/gi, " ");
    const wordCount = html.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g)?.length || 0;
    assert.ok(wordCount >= 550, `${file} has only ${wordCount} visible words`);
  }
});

test("SVG calculators answer coordinate and curve queries without ads near controls", () => {
  const guideIndex = read("guides/index.html");
  const coordinatePage = read("svg-coordinate-calculator/index.html");
  const bezierPage = read("cubic-bezier-calculator/index.html");

  assert.match(guideIndex, /href="\/svg-coordinate-calculator\/"/);
  assert.match(guideIndex, /href="\/cubic-bezier-calculator\/"/);
  assert.match(coordinatePage, /data-calculator="coordinates"/);
  assert.match(coordinatePage, /viewportX = offsetX/);
  assert.match(coordinatePage, /"@type": "FAQPage"/);
  assert.match(bezierPage, /data-calculator="bezier"/);
  assert.match(bezierPage, /B\(t\) = \(1-t\)\^3 P0/);
  assert.match(bezierPage, /"@type": "FAQPage"/);
  for (const html of [coordinatePage, bezierPage]) {
    assert.doesNotMatch(html, /class="adsbygoogle"|pagead2\.googlesyndication\.com/);
    assert.match(html, /type="module" src="\/js\/svg-calculators\.mjs"/);
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
  const publisherId = matchOne(ads, /^google\.com, (pub-\d+), DIRECT,/m, "a publisher ID", "ads.txt");
  for (const file of [...routes.values(), "404.html"]) {
    const html = read(file);
    assert.match(
      html,
      new RegExp(`<meta name="google-adsense-account" content="ca-${publisherId}">`),
      `${file} must expose the same AdSense publisher as ads.txt`,
    );
  }

  const headers = read("_headers");
  assert.match(headers, /Strict-Transport-Security:/);
  assert.match(headers, /X-Frame-Options: DENY/);
  assert.match(headers, /\/content\.css[\s\S]*?Cache-Control: public, max-age=3600/);
  assert.match(headers, /\/\.well-known\/security\.txt[\s\S]*?Content-Type: text\/plain; charset=utf-8/);
  assert.match(headers, /\/docs\/\*[\s\S]*?Cache-Control: public, max-age=86400/);

  const worker = readRoot("src/worker.mjs");
  assert.match(worker, /Content-Security-Policy/);
  assert.match(worker, /composeLayout/);
  assert.match(worker, /\/partials\/site-header\.html/);
  assert.match(worker, /\/partials\/site-footer\.html/);
  assert.match(worker, /'strict-dynamic'/);
  assert.match(worker, /element\.setAttribute\("nonce", nonce\)/);
  assert.match(worker, /injectAnalytics/);
  assert.match(worker, /env\.GA_MEASUREMENT_ID/);
  assert.match(worker, /headers\.set\("Strict-Transport-Security"/);
  assert.match(worker, /headers\.set\("X-Frame-Options", "DENY"\)/);
  assert.match(worker, /\.workers\.dev/);
  assert.match(worker, /X-Robots-Tag/);
  assert.match(worker, /headers\.set\("Link", HOMEPAGE_DISCOVERY_LINKS\)/);
  assert.match(worker, /headers\.set\("Content-Signal", CONTENT_SIGNAL\)/);
  assert.match(worker, /headers\.set\("Content-Type", "text\/html; charset=utf-8"\)/);
  assert.match(worker, /url\.pathname === "\/\.well-known\/security\.txt"/);
  assert.match(worker, /headers\.set\("Content-Type", "text\/plain; charset=utf-8"\)/);
  assert.match(worker, /text\/markdown; charset=utf-8/);
  assert.match(worker, /x-markdown-tokens/);
  assert.ok((worker.match(/appendVary\(headers, "Accept"\)/g) || []).length >= 2);
});

test("Google Analytics uses denied-by-default consent mode and excludes artwork data", () => {
  const analytics = read("js/analytics.js");
  const privacy = read("privacy/index.html");
  const app = read("js/app.js");
  const worker = readFileSync(join(root, "src", "worker.mjs"), "utf8");

  assert.match(analytics, /analytics_storage: analyticsStorage/);
  assert.match(analytics, /ad_storage: "denied"/);
  assert.match(analytics, /ad_user_data: "denied"/);
  assert.match(analytics, /ad_personalization: "denied"/);
  assert.match(analytics, /navigator\.globalPrivacyControl === true/);
  assert.match(worker, /googletagmanager\.com\/gtag\/js\?id=/);
  assert.match(worker, /allow_google_signals:false/);
  assert.match(worker, /allow_ad_personalization_signals:false/);
  assert.match(worker, /page_location:location\.origin\+location\.pathname/);
  assert.doesNotMatch(analytics, /document\.createElement\("script"\)|googletagmanager\.com\/gtag\/js/);
  assert.match(analytics, /allowedEvents/);
  assert.match(analytics, /allowedValues/);
  assert.match(analytics, /"site_click"/);
  assert.match(analytics, /click_target: clickTargets/);
  assert.match(analytics, /navigation_target/);
  assert.match(analytics, /"\/svg-coordinate-calculator\/": "coordinate_calculator"/);
  assert.match(analytics, /"\/cubic-bezier-calculator\/": "bezier_calculator"/);
  assert.match(analytics, /"\/cookies\/": "cookies"/);
  assert.match(analytics, /"\/editorial-policy\/": "editorial_policy"/);
  assert.match(analytics, /control\.closest\("\.ad-slot, ins\.adsbygoogle"\)/);
  assert.doesNotMatch(analytics, /svgInput|file\.name|clipboardMarkup|clientX|clientY/);
  assert.match(app, /editor_document_load/);
  assert.match(app, /editor_action/);
  assert.match(app, /editor_export/);
  assert.match(privacy, /cookieless page-view and consent-state signals/i);
  assert.match(privacy, /Analytics choices/);
  assert.match(privacy, /does not intercept clicks inside ads/i);
});

test("legal and editorial trust surfaces are explicit and connected", () => {
  const privacy = read("privacy/index.html");
  const cookies = read("cookies/index.html");
  const terms = read("terms/index.html");
  const editorial = read("editorial-policy/index.html");
  const about = read("about/index.html");
  const contact = read("contact/index.html");
  const footer = read("partials/site-footer.html");
  const layout = read("js/layout.js");

  assert.match(privacy, /Operator and scope/);
  assert.match(privacy, /Purposes and legal grounds/);
  assert.match(privacy, /Service providers and international processing/);
  assert.match(privacy, /Your privacy choices and rights/);
  assert.match(privacy, /contact@svgvectorlab\.com/);
  assert.match(cookies, /svg-vector-lab:autosave/);
  assert.match(cookies, /svg-vector-lab:analytics-consent/);
  assert.match(cookies, /Google-certified consent management platform/);
  assert.match(terms, /To the maximum extent permitted by applicable law/);
  assert.match(terms, /Nothing in these terms excludes or limits liability/);
  assert.match(editorial, /Ownership and responsibility/);
  assert.match(editorial, /Research and technical review/);
  assert.match(editorial, /Advertising and editorial independence/);
  assert.match(about, /Who maintains SVG Vector Lab/);
  assert.match(contact, /project maintainer/);
  assert.match(footer, /href="\/editorial-policy\/"/);
  assert.match(footer, /href="\/cookies\/"/);
  assert.match(footer, /data-ad-privacy-settings/);
  assert.match(layout, /CONSENT_API_READY/);
  assert.match(layout, /showRevocationMessage/);
});

test("reader-facing pages contain no drafting or internal process residue", () => {
  const prohibited = /\b(?:TODO|TBD|lorem ipsum|internal note|content brief|keyword map|source ledger)\b/i;
  for (const file of [...routes.values(), "404.html", "partials/site-header.html", "partials/site-footer.html", "llms.txt"]) {
    assert.doesNotMatch(read(file), prohibited, `${file} exposes drafting or internal process language`);
  }
});

test("ad diagnostics never intercept or synthesize ad clicks", () => {
  const ads = read("js/ads.js");
  assert.match(ads, /function adPlacement\(unit\)/);
  assert.match(ads, /"ad_slot_status"/);
  assert.match(ads, /"ad_slot_view"/);
  assert.match(ads, /intersectionRatio >= 0\.5/);
  assert.match(ads, /}, 1000\)/);
  assert.doesNotMatch(ads, /addEventListener\(["']click|\.click\(\)/);
});

test("security.txt follows the RFC 9116 publication contract", () => {
  const securityTxt = read(".well-known/security.txt");
  const fields = securityTxt
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split(":", 1)[0]);

  assert.ok(fields.includes("Contact"), "security.txt requires at least one Contact field");
  assert.equal(fields.filter((field) => field === "Expires").length, 1, "security.txt requires exactly one Expires field");
  assert.match(securityTxt, /^Contact: mailto:contact@svgvectorlab\.com\?subject=SVG%20Vector%20Lab%20security%20report$/m);
  assert.match(securityTxt, /^Contact: https:\/\/svgvectorlab\.com\/contact\/$/m);
  assert.match(securityTxt, /^Expires: 2027-07-01T00:00:00Z$/m);
  assert.match(securityTxt, /^Preferred-Languages: en$/m);
  assert.match(securityTxt, /^Canonical: https:\/\/svgvectorlab\.com\/\.well-known\/security\.txt$/m);
  assert.match(securityTxt, /^Policy: https:\/\/github\.com\/kirillman200\/vector_lab\/security\/policy$/m);

  const expires = new Date(matchOne(securityTxt, /^Expires: (.+)$/m, "an expiry timestamp", ".well-known/security.txt"));
  assert.equal(Number.isNaN(expires.valueOf()), false, "security.txt expiry must be a valid RFC 3339 timestamp");
  assert.ok(expires > new Date("2026-07-23T00:00:00Z"), "security.txt must not already be stale");
  assert.ok(expires < new Date("2027-07-23T00:00:00Z"), "security.txt expiry should be less than one year ahead");
});

test("Cloudflare publishes only the public allowlist", () => {
  const wrangler = JSON.parse(readRoot("wrangler.jsonc"));
  assert.equal(wrangler.assets.directory, "./public");
  assert.equal(wrangler.assets.binding, "ASSETS");
  assert.equal(wrangler.assets.run_worker_first, true);
  assert.equal(wrangler.assets.not_found_handling, "404-page");
  assert.equal(wrangler.main, "src/worker.mjs");
  assert.equal(wrangler.vars.GA_MEASUREMENT_ID, "G-XLNFRJLFK4");
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

test("the interactive editor stays free of AdSense units near editing controls", () => {
  const html = read("index.html");
  assert.doesNotMatch(html, /pagead2\.googlesyndication\.com/);
  assert.doesNotMatch(html, /class="adsbygoogle"/);
  assert.doesNotMatch(html, /class="[^"]*ad-slot/);
  assert.doesNotMatch(html, /src="js\/ads\.js/);
});

test("newly loaded artwork is fitted and centered by default", () => {
  const app = read("js/app.js");
  assert.match(app, /requestAnimationFrame\(\(\) => fitToView\(\{ announce: false \}\)\)/);
  assert.match(app, /scrollLeft = Math\.max\(0, \(els\.stage\.scrollWidth - els\.stage\.clientWidth\) \/ 2\)/);
  assert.match(app, /scrollTop = Math\.max\(0, \(els\.stage\.scrollHeight - els\.stage\.clientHeight\) \/ 2\)/);
  assert.match(app, /recordHistory: false, fit: false/, "undo and redo should preserve manual zoom");
});

test("the editor reserves space for startup UI without an advertising offset", () => {
  const html = read("index.html");
  const css = read("styles.css");
  const icons = read("js/icons.js");
  const app = read("js/app.js");

  for (const id of ["loadSampleBtn", "undoBtn", "redoBtn", "fitBtn", "loadInputBtn"]) {
    assert.match(html, new RegExp(`id="${id}"[^>]*class="[^"]*button-icon-pending`), `${id} must reserve its icon width`);
  }
  assert.match(html, /id="geometryControls"[^>]*>[\s\S]*?geometry-placeholder/);
  assert.match(css, /\.button-icon-pending:not\(\.button-icon-ready\)::before/);
  assert.match(css, /--editor-top-ad-height: 0px;/);
  assert.doesNotMatch(css, /\.editor-header-ad|\.tab-ad-slot|\.ad-slot-compact/);
  assert.match(css, /min-height: max\(620px, calc\(100svh - 70px - var\(--editor-top-ad-height\)\)\);/);
  assert.match(css, /\.content-header-inner \{[\s\S]*?min-height: 70px;/);
  assert.match(icons, /classList\.add\("button-icon-ready"\)/);
  assert.match(app, /geometryPlaceholder\.className = "learn-panel geometry-placeholder"/);
});

test("editor panels use slim overflow scrollbars and compact responsive sizing", () => {
  const css = read("styles.css");
  const app = read("js/app.js");
  const icons = read("js/icons.js");

  assert.match(css, /\*::-webkit-scrollbar \{[\s\S]*?width: 7px;[\s\S]*?height: 7px;/);
  assert.match(css, /\* \{[\s\S]*?scrollbar-width: thin;/);
  assert.match(css, /\.inspector-panel > \.tab-panel \{[\s\S]*?flex: 1 1 auto;[\s\S]*?overflow: auto;/);
  assert.match(css, /\.app-shell \{[\s\S]*?height: auto;[\s\S]*?grid-template-rows: minmax\(620px, auto\);/);
  assert.match(css, /@media \(max-width: 1120px\)[\s\S]*?\.app-shell \{[\s\S]*?height: auto;[\s\S]*?grid-template-rows: minmax\(360px, 60svh\) auto;/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*?\.topbar \{[\s\S]*?min-height: 120px;/);
  assert.match(css, /\.control-grid \.color-field \{[\s\S]*?grid-column: 1 \/ -1;/);
  assert.match(css, /\.alpha-color output \{[\s\S]*?min-width: 38px;[\s\S]*?white-space: nowrap;/);
  assert.doesNotMatch(css, /\.tab-panel \{[\s\S]*?scrollbar-gutter: stable;/);
  assert.match(icons, /fillOff:/);
  assert.match(icons, /strokeOff:/);
  assert.match(app, /\[els\.fillNoneBtn, "fillOff"\]/);
  assert.match(app, /\[els\.strokeNoneBtn, "strokeOff"\]/);
});

test("canvas zoom is isolated from serialized SVG source", () => {
  const app = read("js/app.js");
  const ads = read("js/ads.js");
  const css = read("styles.css");
  assert.match(app, /surface\.style\.setProperty\("--canvas-zoom", String\(state\.zoom\)\)/);
  assert.match(app, /zoomSurface\.className = "svg-zoom-surface"/);
  assert.doesNotMatch(app, /svg\.style\.width = .*state\.zoom/);
  assert.doesNotMatch(app, /svg\.style\.height = .*state\.zoom/);
  assert.match(css, /\.svg-zoom-surface > svg \{[\s\S]*?transform: scale\(var\(--canvas-zoom, 1\)\);/);
  assert.match(css, /grid-template-rows: 72svh;/);
  assert.doesNotMatch(css, /grid-template-rows: minmax\(58svh, 1fr\) auto auto;/);
  assert.match(ads, /function protectEditorLayoutSizing\(\)/);
  assert.match(ads, /element\.style\.removeProperty\(property\)/);
  assert.match(ads, /observer\.observe\(document\.body, \{ attributes: true, attributeFilter: \["style"\], subtree: true \}\)/);
});

test("launch-essential editor controls are visible and wired", () => {
  const html = read("index.html");
  const app = read("js/app.js");
  const css = read("styles.css");

  for (const id of [
    "saveLocalBtn",
    "handToolBtn",
    "canvasWidthInput",
    "canvasHeightInput",
    "gridToggle",
    "gridSizeInput",
    "freehandToolBtn",
    "penToolBtn",
    "imageInput",
    "groupBtn",
    "ungroupBtn",
    "objectRatioToggle",
    "gradientBtn",
    "addNodeBtn",
    "removeNodeBtn",
    "closePathBtn",
    "joinPathsBtn",
    "pngWidthInput",
    "pngHeightInput",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`), `${id} is missing`);
  }

  assert.match(html, /Ctrl\+Z[\s\S]*?Undo/);
  assert.match(html, /Create a named checkpoint in this browser[\s\S]*?never leaves this device/);
  assert.match(app, /function moveLayerForNode\(node, direction/);
  assert.match(app, /fillRemoved \? "Add fill" : "Remove fill"/);
  assert.match(app, /strokeRemoved \? "Add stroke" : "Remove stroke"/);
  assert.match(app, /localStorage\.setItem\(LOCAL_SAVE_KEY, snapshot\)/);
  assert.match(app, /event\.returnValue = ""/);
  assert.match(app, /function groupSelection\(actionSurface = "toolbar"\)/);
  assert.match(app, /function alignSelection\(kind\)/);
  assert.match(app, /function startFreehand\(event\)/);
  assert.match(app, /function addPenPoint\(event\)/);
  assert.match(css, /\.pan-cursor \{[\s\S]*?mix-blend-mode: difference;/);
});

test("editor safeguards, compact tabs, and accessible feedback are wired", () => {
  const html = read("index.html");
  const app = read("js/app.js");
  const css = read("styles.css");

  assert.match(html, /id="left-add-tab"[\s\S]*?data-tab-target="left-add-panel"/);
  assert.match(html, /id="statusLine"[\s\S]*?role="status"[\s\S]*?aria-live="polite"/);
  assert.match(html, /id="backgroundAlphaInput"[^>]*aria-label="Canvas background opacity"/);
  assert.match(html, /id="handToolBtn"[^>]*aria-pressed="false"/);
  assert.match(html, /id="restoreLocalBtn"/);
  assert.match(html, /id="pasteDialog"[\s\S]*?Paste as objects[\s\S]*?Replace current document/);
  assert.match(app, /function guardNodeEditable\(node, operation/);
  assert.match(app, /state\.documentDirty = true/);
  assert.match(app, /function restoreLocal\(\)/);
  assert.match(app, /if \(handle\.kind === "control"\) \{[\s\S]*?positionHandleAwayFromElement/);
  assert.doesNotMatch(app, /window\.prompt\(/);
  assert.match(css, /\.inspector-panel,[\s\S]*?\.source-panel \{[\s\S]*?position: fixed;/);
  assert.match(css, /\.status-line\.error \{[\s\S]*?position: fixed;[\s\S]*?z-index: 120;/);
});

test("text bounding-box clicks select objects instead of clearing the canvas", () => {
  const app = read("js/app.js");
  const css = read("styles.css");
  assert.match(app, /function vectorAtBoundingPoint\(clientX, clientY\)/);
  assert.match(app, /const selectedRect = screenRectOf\(state\.selected\)/);
  assert.match(app, /area > 0 && area < rootArea \* 0\.9/);
  assert.match(app, /const boundingVector = vectorAtBoundingPoint\(event\.clientX, event\.clientY\)/);
  assert.match(app, /startElementDrag\(event, boundingVector, true\)/);
  assert.match(app, /drag\.moved \|\| drag\.suppressClickOnUp/);
  assert.match(css, /\.work-area \{[\s\S]*?align-self: start;[\s\S]*?height: max\(620px, calc\(100svh - 70px - var\(--editor-top-ad-height\)\)\);/);
  assert.match(css, /@media \(max-width: 1120px\)[\s\S]*?\.work-area \{[\s\S]*?align-self: stretch;[\s\S]*?height: auto;/);
});

test("guide articles include one stable labeled ad and visible publisher attribution", () => {
  const guideFiles = [...routes.entries()]
    .filter(([route]) => route.startsWith("/guides/") && route !== "/guides/")
    .map(([, file]) => file);

  for (const file of guideFiles) {
    const html = read(file);
    assert.equal((html.match(/class="article-ad ad-slot"/g) || []).length, 1, `${file} must have one article ad`);
    assert.equal((html.match(/class="ad-label">Advertisements<\/span>/g) || []).length, 1, `${file} must label its ad`);
    assert.equal((html.match(/class="adsbygoogle"/g) || []).length, 1, `${file} must have one responsive ad unit`);
    assert.equal((html.match(/style="display:block;width:100%;height:250px"/g) || []).length, 1, `${file} must reserve its ad height`);
    assert.equal((html.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/g) || []).length, 1, `${file} must load AdSense once`);
    assert.match(html, /class="article-byline"/);
    assert.match(html, /href="\/about\/">SVG Vector Lab<\/a>/);
    assert.match(html, /href="\/editorial-policy\/">editorial policy<\/a>/);
    assert.match(html, /"author":\{"@type":"Organization","name":"SVG Vector Lab","url":"https:\/\/svgvectorlab\.com\/about\/"\}/);
  }

  const css = read("content.css");
  assert.match(css, /\.article-ad \{[\s\S]*?min-height: 282px;/);
  assert.match(css, /\.article-ad \.adsbygoogle \{[\s\S]*?height: 250px;/);
  assert.match(css, /\.article-ad:not\(\.ad-slot-active\)::before,[\s\S]*?content: "Reserved ad space";/);
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
