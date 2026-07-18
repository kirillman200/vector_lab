import test from "node:test";
import assert from "node:assert/strict";

import worker, { acceptsMarkdown, htmlToMarkdown } from "../src/worker.mjs";

const homepage = `<!doctype html>
<html>
  <head>
    <title>Example &amp; Test</title>
    <meta name="description" content="A compact test page.">
    <script>throw new Error("must not be included")</script>
  </head>
  <body><main><h1>Editor</h1><p>Open the <a href="/guides/">guides</a>.</p></main></body>
</html>`;

test("markdown Accept negotiation respects media ranges and quality", () => {
  assert.equal(acceptsMarkdown("text/markdown"), true);
  assert.equal(acceptsMarkdown("text/html, text/markdown; q=0.8"), true);
  assert.equal(acceptsMarkdown("text/markdown;q=0"), false);
  assert.equal(acceptsMarkdown("text/html"), false);
});

test("HTML conversion preserves useful structure and removes scripts", () => {
  const markdown = htmlToMarkdown(homepage);
  assert.match(markdown, /^# Example & Test$/m);
  assert.match(markdown, /^> A compact test page\.$/m);
  assert.match(markdown, /^# Editor$/m);
  assert.match(markdown, /\[guides\]\(\/guides\/\)/);
  assert.doesNotMatch(markdown, /must not be included/);
});

test("homepage markdown responses include discovery and variant headers", async () => {
  const env = {
    ASSETS: {
      fetch: async () => new Response(homepage, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ETag: '"homepage"',
        },
      }),
    },
  };
  const response = await worker.fetch(
    new Request("https://svgvectorlab.com/", { headers: { Accept: "text/markdown" } }),
    env,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "text/markdown; charset=utf-8");
  assert.equal(response.headers.get("Vary"), "Accept");
  assert.equal(response.headers.get("ETag"), null);
  assert.match(response.headers.get("Link"), /rel="service-doc"/);
  assert.match(response.headers.get("Link"), /\.well-known\/agent-skills\/index\.json/);
  assert.equal(response.headers.get("Content-Signal"), "ai-train=no, search=yes, ai-input=yes");
  assert.match(response.headers.get("x-markdown-tokens"), /^\d+$/);
  assert.match(await response.text(), /^# Example & Test$/m);
});

test("shared layout partials are composed before markdown conversion", async () => {
  const page = `<!doctype html><html><head><title>Layout test</title></head><body><site-header></site-header><main><h1>Page</h1></main><site-footer></site-footer></body></html>`;
  const env = {
    ASSETS: {
      fetch: async (request) => {
        const pathname = new URL(request.url).pathname;
        if (pathname === "/partials/site-header.html") {
          return new Response('<header><a href="/">Open editor</a></header>', { headers: { "Content-Type": "text/html" } });
        }
        if (pathname === "/partials/site-footer.html") {
          return new Response('<footer><a href="/contact/">Contact</a></footer>', { headers: { "Content-Type": "text/html" } });
        }
        return new Response(page, { headers: { "Content-Type": "text/html" } });
      },
    },
  };

  const response = await worker.fetch(
    new Request("https://svgvectorlab.com/about/", { headers: { Accept: "text/markdown" } }),
    env,
  );
  const markdown = await response.text();
  assert.match(markdown, /\[Open editor\]\(\/\)/);
  assert.match(markdown, /\[Contact\]\(\/contact\/\)/);
  assert.doesNotMatch(markdown, /site-header|site-footer/);
});
