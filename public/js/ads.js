// Initialize responsive AdSense units only when their tab is visible.
// Hidden panels have no measurable width, so requesting them early can fail.
(function initializeAds() {
  const adViewObservers = new WeakMap();

  function adPlacement(unit) {
    if (unit.closest(".editor-header-ad")) return "editor_header";
    const panelPlacements = {
      "left-layers-panel": "left_layers",
      "left-source-panel": "left_source",
      "right-design-panel": "right_design",
      "right-notes-panel": "right_notes",
      "right-path-panel": "right_path"
    };
    const panel = unit.closest(".tab-panel");
    if (panel && panelPlacements[panel.id]) return panelPlacements[panel.id];
    const articleUnits = [...document.querySelectorAll(".article-ad ins.adsbygoogle")];
    const articleIndex = articleUnits.indexOf(unit);
    if (articleIndex === 0) return "article_primary";
    if (articleIndex === 1) return "article_secondary";
    return "unknown";
  }

  function trackAdStatus(unit, status) {
    if (unit.dataset.analyticsAdStatus === status) return;
    unit.dataset.analyticsAdStatus = status;
    window.svgAnalytics?.track("ad_slot_status", {
      ad_placement: adPlacement(unit),
      ad_status: status
    });
  }

  function observeAdView(unit) {
    if (adViewObservers.has(unit) || typeof IntersectionObserver !== "function") return;
    let visibleSince = 0;
    let viewTimer = 0;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      const viewable = entry?.isIntersecting && entry.intersectionRatio >= 0.5 && unit.dataset.adStatus === "filled";
      if (!viewable) {
        visibleSince = 0;
        window.clearTimeout(viewTimer);
        viewTimer = 0;
        return;
      }
      if (unit.dataset.analyticsAdViewed) return;
      if (!visibleSince) visibleSince = Date.now();
      window.clearTimeout(viewTimer);
      viewTimer = window.setTimeout(() => {
        if (!visibleSince || unit.dataset.analyticsAdViewed || unit.dataset.adStatus !== "filled") return;
        unit.dataset.analyticsAdViewed = "true";
        window.svgAnalytics?.track("ad_slot_view", {
          ad_placement: adPlacement(unit),
          ad_status: "filled"
        });
        observer.disconnect();
      }, 1000);
    }, { threshold: [0, 0.5, 1] });
    observer.observe(unit);
    adViewObservers.set(unit, observer);
  }

  function protectEditorLayoutSizing() {
    const shell = document.querySelector(".app-shell");

    // AdSense may add inline !important sizing to every ancestor of an ad.
    // In the editor those overrides can make the grid follow the zoomed canvas
    // height, stretching the SVG source textarea. Ad placements also reserve
    // their own dimensions in CSS to avoid layout shift, so keep inline sizing
    // off the slots and editor layout ancestors while leaving the ad unit itself
    // available for AdSense to size.
    const protectedElements = new Set(shell ? [shell] : []);
    document.querySelectorAll(".ad-slot").forEach((slot) => {
      protectedElements.add(slot);
      let element = slot;
      while (shell && element && shell.contains(element)) {
        protectedElements.add(element);
        element = element.parentElement;
      }
    });

    function clearInjectedSizing(element) {
      if (!protectedElements.has(element)) return;
      let changed = false;
      for (const property of ["height", "min-height"]) {
        if (!element.style.getPropertyValue(property)) continue;
        element.style.removeProperty(property);
        changed = true;
      }
      if (changed && !element.getAttribute("style")) element.removeAttribute("style");
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => clearInjectedSizing(mutation.target));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"], subtree: true });
    protectedElements.forEach(clearInjectedSizing);
  }

  protectEditorLayoutSizing();

  function syncAdStatus(unit) {
    const slot = unit.closest(".ad-slot");
    if (!slot) return;
    slot.classList.toggle("ad-slot-unfilled", unit.dataset.adStatus === "unfilled");
    if (unit.dataset.adStatus === "filled" || unit.dataset.adStatus === "unfilled") {
      trackAdStatus(unit, unit.dataset.adStatus);
    }
  }

  function observeAdStatus(unit) {
    if (unit.dataset.adStatusObserved) return;
    unit.dataset.adStatusObserved = "true";
    const observer = new MutationObserver(() => syncAdStatus(unit));
    observer.observe(unit, { attributes: true, attributeFilter: ["data-ad-status"] });
    syncAdStatus(unit);
  }

  function requestAdsIn(root = document) {
    root.querySelectorAll("ins.adsbygoogle:not([data-ad-requested])").forEach((unit) => {
      if (unit.offsetWidth <= 0 || unit.closest("[hidden]")) return;

      observeAdStatus(unit);
      observeAdView(unit);
      unit.dataset.adRequested = "true";
      unit.closest(".ad-slot")?.classList.add("ad-slot-active");
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        unit.removeAttribute("data-ad-requested");
        const slot = unit.closest(".ad-slot");
        slot?.classList.remove("ad-slot-active");
        slot?.classList.add("ad-slot-unfilled");
        trackAdStatus(unit, "request_error");
        console.warn("Advertisement could not be initialized.", error);
      }
    });
  }

  window.requestAdsIn = requestAdsIn;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => requestAdsIn(), { once: true });
  } else {
    requestAdsIn();
  }
})();
