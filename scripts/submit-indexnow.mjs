import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ORIGIN = "https://svgvectorlab.com";
const HOST = "svgvectorlab.com";
const KEY = "5faea639e3354710b502ca7777d1449a";
const KEY_LOCATION = `${ORIGIN}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  console.log(`Usage:
  node scripts/submit-indexnow.mjs [URL ...]
  node scripts/submit-indexnow.mjs --send [URL ...]

Without --send, the request is printed but no network request is made.
If no URLs are supplied, every URL in public/sitemap.xml is included.`);
}

function validateUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid URL: ${value}`);
  }
  if (url.protocol !== "https:" || url.host !== HOST) {
    throw new Error(`URL must belong to ${ORIGIN}: ${value}`);
  }
  return url.href;
}

async function sitemapUrls() {
  const sitemap = await readFile(resolve(root, "public", "sitemap.xml"), "utf8");
  return [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    usage();
    return;
  }

  const send = args.includes("--send");
  const unknownOptions = args.filter((arg) => arg.startsWith("-") && arg !== "--send");
  if (unknownOptions.length) throw new Error(`Unknown option: ${unknownOptions[0]}`);

  const suppliedUrls = args.filter((arg) => arg !== "--send");
  const urlList = [...new Set((suppliedUrls.length ? suppliedUrls : await sitemapUrls()).map(validateUrl))];
  if (urlList.length === 0) throw new Error("At least one URL is required.");
  if (urlList.length > 10_000) throw new Error("IndexNow accepts at most 10,000 URLs per request.");

  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  };

  if (!send) {
    console.log("Prepared IndexNow request (not sent):");
    console.log(JSON.stringify(payload, null, 2));
    console.log("\nRun the same command with --send after the deployment is live.");
    return;
  }

  const keyResponse = await fetch(KEY_LOCATION, {
    headers: { "Cache-Control": "no-cache" },
  });
  const publishedKey = (await keyResponse.text()).trim();
  if (!keyResponse.ok || publishedKey !== KEY) {
    throw new Error(
      `IndexNow key prerequisite is not live at ${KEY_LOCATION} (HTTP ${keyResponse.status}).`,
    );
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const responseBody = (await response.text()).trim();
  if (response.status !== 200 && response.status !== 202) {
    throw new Error(
      `IndexNow rejected the request (HTTP ${response.status})${responseBody ? `: ${responseBody}` : "."}`,
    );
  }

  const status = response.status === 202 ? "accepted; key validation is pending" : "submitted successfully";
  console.log(`IndexNow request ${status} (HTTP ${response.status}, ${urlList.length} URL(s)).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
