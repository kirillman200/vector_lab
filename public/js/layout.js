(() => {
  const routeFor = (pathname) => {
    if (pathname.startsWith("/guides/")) return "/guides/";
    const route = pathname.endsWith("/index.html")
      ? pathname.slice(0, -"index.html".length)
      : pathname;
    return route !== "/" && !route.endsWith("/") && !route.split("/").pop().includes(".")
      ? `${route}/`
      : route;
  };

  const hydrate = async (selector, url) => {
    const host = document.querySelector(selector);
    if (!host) return;

    try {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) throw new Error(`Layout request failed: ${response.status}`);

      const template = document.createElement("template");
      template.innerHTML = await response.text();
      const route = routeFor(window.location.pathname);
      template.content.querySelectorAll("a[href]").forEach((link) => {
        if (link.getAttribute("href") === route) link.setAttribute("aria-current", "page");
      });
      host.replaceWith(template.content);
    } catch {
      host.dataset.layoutError = "true";
      if (selector === "site-header") {
        host.innerHTML = '<a class="layout-fallback-link" href="/">Open SVG Vector Lab</a>';
      }
    }
  };

  void Promise.all([
    hydrate("site-header", "/partials/site-header.html"),
    hydrate("site-footer", "/partials/site-footer.html"),
  ]);
})();
