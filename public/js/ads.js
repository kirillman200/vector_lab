// Initialize responsive AdSense units only when their tab is visible.
// Hidden panels have no measurable width, so requesting them early can fail.
(function initializeAds() {
  function requestAdsIn(root = document) {
    root.querySelectorAll("ins.adsbygoogle:not([data-ad-requested])").forEach((unit) => {
      if (unit.offsetWidth <= 0 || unit.closest("[hidden]")) return;

      unit.dataset.adRequested = "true";
      unit.closest(".ad-slot")?.classList.add("ad-slot-active");
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        unit.removeAttribute("data-ad-requested");
        unit.closest(".ad-slot")?.classList.remove("ad-slot-active");
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
