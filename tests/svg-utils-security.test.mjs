import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "public/js/svg-utils.js"), "utf8");
const { isUnsafeAttribute } = vm.runInNewContext(`${source}\n;({ isUnsafeAttribute });`);

test("blocks executable and externally loaded SVG attributes", () => {
  const unsafe = [
    ["onload", "alert(1)"],
    ["href", "javascript:alert(1)"],
    ["xlink:href", "https://example.com/tracker.svg"],
    ["src", "data:text/html,<script>alert(1)</script>"],
    ["style", "fill:url(https://example.com/paint.svg#gradient)"],
    ["style", "@import url(https://example.com/style.css)"],
  ];

  for (const [name, value] of unsafe) {
    assert.equal(isUnsafeAttribute(name, value), true, `${name}=${value} should be blocked`);
  }
});

test("keeps ordinary attributes and local SVG references", () => {
  const safe = [
    ["fill", "#4e7cff"],
    ["fill", "url(#gradient)"],
    ["href", "#shape"],
    ["href", "data:image/png;base64,iVBORw0KGgo="],
    ["stroke-width", "2"],
    ["transform", "translate(10 20)"],
  ];

  for (const [name, value] of safe) {
    assert.equal(isUnsafeAttribute(name, value), false, `${name}=${value} should be allowed`);
  }
});
