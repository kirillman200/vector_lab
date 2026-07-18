function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function contentSecurityPolicy(nonce) {
  return [
    "default-src 'self'",
    "object-src 'none'",
    `script-src 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval' 'strict-dynamic' https: http:`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https:",
    "frame-src https:",
    "font-src 'self' data: https:",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

const CONTENT_SIGNAL = "ai-train=no, search=yes, ai-input=yes";

const LAYOUT_PARTIALS = {
  "<site-header></site-header>": "/partials/site-header.html",
  "<site-footer></site-footer>": "/partials/site-footer.html",
};

const HOMEPAGE_DISCOVERY_LINKS = [
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</site.webmanifest>; rel="service-desc"; type="application/manifest+json"',
  '</guides/>; rel="service-doc"; type="text/html"',
  '</auth.md>; rel="describedby"; type="text/markdown"',
  '</.well-known/agent-skills/index.json>; rel="describedby"; type="application/json"',
].join(", ");

export function acceptsMarkdown(acceptHeader = "") {
  return acceptHeader
    .split(",")
    .map((range) => range.trim().toLowerCase())
    .some((range) => {
      const [mediaType, ...parameters] = range.split(";").map((value) => value.trim());
      if (mediaType !== "text/markdown") return false;
      const quality = parameters.find((parameter) => parameter.startsWith("q="));
      return !quality || Number.parseFloat(quality.slice(2)) > 0;
    });
}

function decodeHtmlEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code) => {
    if (code[0] !== "#") return named[code.toLowerCase()] ?? entity;
    const radix = code[1].toLowerCase() === "x" ? 16 : 10;
    const digits = radix === 16 ? code.slice(2) : code.slice(1);
    const point = Number.parseInt(digits, radix);
    return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
  });
}

function plainText(fragment) {
  return decodeHtmlEntities(fragment.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim());
}

export function htmlToMarkdown(html) {
  const title = plainText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const description = decodeHtmlEntities(
    html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1] || "",
  );
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html;

  let markdown = body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|template|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
      const text = plainText(label);
      return text ? `[${text}](${href})` : "";
    })
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, text) => `\n${"#".repeat(Number(level))} ${plainText(text)}\n`)
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, text) => `\n- ${plainText(text)}`)
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, text) => `**${plainText(text)}**`)
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, text) => `*${plainText(text)}*`)
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, text) => `\`${plainText(text)}\``)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<hr\b[^>]*>/gi, "\n---\n")
    .replace(/<\/(p|div|section|article|main|nav|aside|header|footer|details|summary|ul|ol|table|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "");

  markdown = decodeHtmlEntities(markdown)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const preamble = [title && `# ${title}`, description && `> ${description}`].filter(Boolean).join("\n\n");
  return `${preamble}${preamble && markdown ? "\n\n" : ""}${markdown}\n`;
}

function appendVary(headers, value) {
  const values = (headers.get("Vary") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!values.some((item) => item.toLowerCase() === value.toLowerCase())) values.push(value);
  headers.set("Vary", values.join(", "));
}

function navigationRoute(pathname) {
  if (pathname.startsWith("/guides/")) return "/guides/";
  return pathname.endsWith("/index.html")
    ? pathname.slice(0, -"index.html".length)
    : pathname;
}

function markCurrentNavigation(fragment, pathname) {
  const route = navigationRoute(pathname);
  if (!route || route === "/404.html") return fragment;
  const escapedRoute = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return fragment.replace(
    new RegExp(`<a href="${escapedRoute}"(?=[ >])`, "g"),
    `<a href="${route}" aria-current="page"`,
  );
}

export async function composeLayout(html, request, env) {
  const entries = Object.entries(LAYOUT_PARTIALS).filter(([placeholder]) => html.includes(placeholder));
  if (!entries.length) return html;

  const fragments = await Promise.all(entries.map(async ([placeholder, path]) => {
    const response = await env.ASSETS.fetch(new Request(new URL(path, request.url)));
    if (!response.ok) return [placeholder, placeholder];
    const fragment = markCurrentNavigation(await response.text(), new URL(request.url).pathname);
    return [placeholder, fragment];
  }));

  const document = fragments.reduce(
    (document, [placeholder, fragment]) => document.replaceAll(placeholder, fragment),
    html,
  );

  if (fragments.some(([placeholder, fragment]) => placeholder === fragment)) return document;

  // Static hosting still gets the client fallback. The Worker already composed
  // the layout, so it can omit that request and its two partial fetches.
  return document.replace(/\s*<script\s+src=["']\/js\/layout\.js["']\s+defer><\/script>/i, "");
}

function markdownResponse(response, headers, html, method) {
  const markdown = htmlToMarkdown(html);
  headers.set("Content-Type", "text/markdown; charset=utf-8");
  headers.set("x-markdown-tokens", String(Math.ceil(markdown.length / 4)));
  headers.set("x-original-tokens", String(Math.ceil(html.length / 4)));
  appendVary(headers, "Accept");
  for (const name of ["Content-Encoding", "Content-Length", "Content-Range", "ETag", "Last-Modified", "Transfer-Encoding"]) {
    headers.delete(name);
  }
  return new Response(method === "HEAD" ? null : markdown, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    headers.set("X-Frame-Options", "DENY");
    headers.set("X-XSS-Protection", "0");
    headers.set("Strict-Transport-Security", "max-age=31536000");
    headers.set("Cross-Origin-Resource-Policy", "same-origin");
    headers.set("Content-Signal", CONTENT_SIGNAL);

    const url = new URL(request.url);
    const hostname = url.hostname;
    if (hostname.endsWith(".workers.dev") || hostname.endsWith(".pages.dev")) {
      headers.set("X-Robots-Tag", "noindex, nofollow");
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      headers.set("Link", HOMEPAGE_DISCOVERY_LINKS);
    }

    const contentType = response.headers.get("content-type") || "";
    if (url.pathname.endsWith(".md")) {
      headers.set("Content-Type", "text/markdown; charset=utf-8");
    }
    if (!contentType.toLowerCase().includes("text/html")) {
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    const html = await composeLayout(await response.text(), request, env);
    headers.set("Content-Type", "text/html; charset=utf-8");
    for (const name of ["Content-Encoding", "Content-Length", "ETag", "Last-Modified", "Transfer-Encoding"]) {
      headers.delete(name);
    }
    appendVary(headers, "Accept");
    if (acceptsMarkdown(request.headers.get("Accept") || "")) {
      return markdownResponse(response, headers, html, request.method);
    }

    const nonce = createNonce();
    headers.set("Content-Security-Policy", contentSecurityPolicy(nonce));

    const securedResponse = new Response(request.method === "HEAD" ? null : html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

    return new HTMLRewriter()
      .on("script", {
        element(element) {
          element.setAttribute("nonce", nonce);
        },
      })
      .transform(securedResponse);
  },
};
