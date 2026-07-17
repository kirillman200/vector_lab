// Initialize responsive AdSense units only when their tab is visible.
// Hidden panels have no measurable width, so requesting them early can fail.
(function initializeAds() {
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
