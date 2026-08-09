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

  const mountAdPrivacySettings = () => {
    const buttons = [...document.querySelectorAll("[data-ad-privacy-settings]")];
    if (!buttons.length) return;

    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    window.googlefc.callbackQueue.push({
      CONSENT_API_READY: () => {
        if (typeof window.__tcfapi !== "function") return;
        window.__tcfapi("addEventListener", 0, (tcData, success) => {
          buttons.forEach((button) => {
            button.hidden = !(success && tcData?.gdprApplies);
          });
        });
      },
    });

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        window.googlefc?.showRevocationMessage?.();
      });
    });
  };

  void Promise.all([
    hydrate("site-header", "/partials/site-header.html"),
    hydrate("site-footer", "/partials/site-footer.html"),
  ]).then(mountAdPrivacySettings);
})();
