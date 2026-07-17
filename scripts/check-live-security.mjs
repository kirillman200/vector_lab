const origin = new URL(process.argv[2] || "https://svgvectorlab.com");

const publicPaths = ["/", "/free-svg-editor/", "/robots.txt", "/sitemap.xml", "/llms.txt", "/ads.txt"];
const privatePaths = [
  "/.git/config",
  "/.git/HEAD",
  "/.env",
  "/wrangler.jsonc",
  "/README.md",
  "/LICENSE",
  "/SECURITY.md",
  "/LAUNCH_CHECKLIST.md",
  "/tests/site-content.test.mjs",
  "/.github/workflows/test.yml",
];

let failed = false;

async function checkStatus(path, expected) {
  const response = await fetch(new URL(path, origin), { redirect: "manual" });
  if (response.status !== expected) {
    failed = true;
    console.error(`FAIL ${path}: expected ${expected}, received ${response.status}`);
  } else {
    console.log(`PASS ${path}: ${response.status}`);
  }
  return response;
}

const home = await checkStatus("/", 200);
for (const path of publicPaths.slice(1)) await checkStatus(path, 200);
for (const path of privatePaths) await checkStatus(path, 404);

const requiredHeaders = [
  "content-security-policy",
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
];
for (const name of requiredHeaders) {
  if (!home.headers.has(name)) {
    failed = true;
    console.error(`FAIL /: missing ${name} response header`);
  } else {
    console.log(`PASS /: ${name} is present`);
  }
}

if (home.headers.get("x-frame-options") !== "DENY") {
  failed = true;
  console.error("FAIL /: x-frame-options must be DENY");
}

if (failed) process.exitCode = 1;
