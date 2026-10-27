/* Theme toggle + persistence. */
(function () {
  "use strict";

  const KEY = "htx-theme";
  const root = document.documentElement;
  const toggle = document.getElementById("themeToggle");
  const icon = document.getElementById("themeIcon");

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    icon.className = theme === "dark" ? "ri-sun-line" : "ri-moon-line";
    toggle.title = theme === "dark" ? "Light mode" : "Dark mode";
    toggle.setAttribute("aria-label", toggle.title);
  }

  function initial() {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  apply(initial());

  toggle.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    apply(next);
    localStorage.setItem(KEY, next);
  });

  // follow OS changes only if user hasn't picked a theme
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!localStorage.getItem(KEY)) apply(e.matches ? "dark" : "light");
  });
})();