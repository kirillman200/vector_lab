import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const key = "5faea639e3354710b502ca7777d1449a";

test("IndexNow ownership key is published from the site root", () => {
  assert.match(key, /^[A-Za-z0-9-]{8,128}$/);
  assert.equal(readFileSync(join(root, "public", `${key}.txt`), "utf8").trim(), key);
});

test("IndexNow request is safe by default and covers the sitemap", () => {
  const result = spawnSync(process.execPath, ["scripts/submit-indexnow.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Prepared IndexNow request \(not sent\)/);

  const jsonStart = result.stdout.indexOf("{");
  const jsonEnd = result.stdout.lastIndexOf("}") + 1;
  const request = JSON.parse(result.stdout.slice(jsonStart, jsonEnd));
  const sitemap = readFileSync(join(root, "public", "sitemap.xml"), "utf8");
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  assert.equal(request.host, "svgvectorlab.com");
  assert.equal(request.key, key);
  assert.equal(request.keyLocation, `https://svgvectorlab.com/${key}.txt`);
  assert.deepEqual(request.urlList, sitemapUrls);
});
