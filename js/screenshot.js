/* PNG export via html2canvas. */
(function () {
  "use strict";

  async function capture(target) {
    if (!target || typeof window.html2canvas !== "function") {
      return window.HTXToast.error("Screenshot not available");
    }

    document.body.classList.add("capture-mode");

    try {
      await new Promise((r) => setTimeout(r, 60));

      const bg = getComputedStyle(document.documentElement)
        .getPropertyValue("--surface").trim() || "#fff";

      const canvas = await window.html2canvas(target, {
        backgroundColor: bg,
        scale: Math.min(window.devicePixelRatio || 1, 2),
        useCORS: true,
        logging: false
      });

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "calculator-result.png";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.HTXToast.success("Screenshot downloaded");
    } catch {
      window.HTXToast.error("Screenshot failed");
    } finally {
      document.body.classList.remove("capture-mode");
    }
  }

  window.HTXScreenshot = { capture };
})();