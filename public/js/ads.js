// Initialize responsive AdSense units only when their tab is visible.
// Hidden panels have no measurable width, so requesting them early can fail.
(function initializeAds() {
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
      unit.dataset.adRequested = "true";
      unit.closest(".ad-slot")?.classList.add("ad-slot-active");
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        unit.removeAttribute("data-ad-requested");
        const slot = unit.closest(".ad-slot");
        slot?.classList.remove("ad-slot-active");
        slot?.classList.add("ad-slot-unfilled");
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
