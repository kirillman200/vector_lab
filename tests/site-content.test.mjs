import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const origin = "https://svgvectorlab.com";
const routes = new Map([
  ["/", "index.html"],
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
      assert.ok(existsSync(join(root, relativeTarget)), `${file} links to missing ${urlPath}`);
    }
  }
});

test("sitemap and robots expose every indexable route", () => {
  const sitemap = read("sitemap.xml");
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(locations, [...routes.keys()].map((route) => `${origin}${route}`));
  assert.match(read("robots.txt"), new RegExp(`Sitemap: ${origin.replaceAll(".", "\\.")}\/sitemap\\.xml`));
});

test("hosting and advertising files are safe", () => {
  assert.ok(existsSync(join(root, "_headers")));
  const manifest = JSON.parse(read("site.webmanifest"));
  assert.equal(manifest.name, "SVG Vector Lab");
  assert.equal(manifest.short_name, "SVG Vector Lab");
  assert.equal(manifest.id, "/");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  const ads = read("ads.txt").trim();
  assert.match(ads, /^google\.com, pub-\d+, DIRECT, f08c47fec0942fa0$/);
  assert.doesNotMatch(ads, /pub-0{8,}/, "placeholder publisher IDs must not be published");
});
