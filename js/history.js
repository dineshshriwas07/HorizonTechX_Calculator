/* History panel + localStorage + per-item delete. */
(function () {
  "use strict";

  const STORAGE_KEY = "htx-history";
  const MAX_ENTRIES = 50;

  const listEl = document.getElementById("historyList");
  const emptyEl = document.getElementById("historyEmpty");
  const clearBtn = document.getElementById("clearHistoryBtn");

  let entries = [];

  /* ---------- Storage ---------- */
  function load() {
    try {
      entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").slice(0, MAX_ENTRIES);
    } catch {
      entries = [];
    }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleString(undefined, {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  /* ---------- Render ---------- */
  function render() {
    listEl.innerHTML = "";

    if (!entries.length) {
      emptyEl.classList.add("visible");
      return;
    }
    emptyEl.classList.remove("visible");

    entries.forEach((entry, i) => {
      const li = document.createElement("li");
      li.className = "history-item";
      li.dataset.index = i;

      li.innerHTML = `
        <span class="history-expr"></span>
        <span class="history-result"></span>
        <span class="history-time"></span>
        <div class="history-actions">
          <button type="button" class="history-action-btn copy" aria-label="Copy result" title="Copy result">
            <i class="ri-file-copy-line" aria-hidden="true"></i>
          </button>
          <button type="button" class="history-action-btn del" aria-label="Delete entry" title="Delete">
            <i class="ri-delete-bin-6-line" aria-hidden="true"></i>
          </button>
        </div>
      `;

      li.querySelector(".history-expr").textContent = entry.expression;
      li.querySelector(".history-result").textContent = entry.result;
      li.querySelector(".history-time").textContent = formatTime(entry.timestamp);

      // Copy button
      li.querySelector(".copy").addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        copyText(entry.result, "History result copied");
      });

      // Delete button — direct, no menu, no bubbling issues
      li.querySelector(".del").addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        removeAt(i);
      });

      // Tap on item body → reuse result
      li.addEventListener("click", (e) => {
        // ignore clicks on action buttons
        if (e.target.closest(".history-action-btn")) return;
        window.HTXCalculator.useHistoryResult(entry.result);
      });

      listEl.appendChild(li);
    });
  }

  /* ---------- Clipboard ---------- */
  async function copyText(text, okMsg) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;opacity:0;";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        if (!ok) throw new Error("copy failed");
      }
      window.HTXToast.success(okMsg);
    } catch {
      window.HTXToast.error("Could not copy");
    }
  }

  /* ---------- CRUD ---------- */
  function add(expression, result) {
    entries.unshift({ expression, result, timestamp: Date.now() });
    if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
    save();
    render();
  }

  function removeAt(index) {
    if (index < 0 || index >= entries.length) return;
    entries.splice(index, 1);
    save();
    render();
    window.HTXToast.success("Entry deleted");
  }

  function clear() {
    if (!entries.length) return window.HTXToast.warning("History is already empty");
    if (!window.confirm("Clear all calculation history?")) return;
    entries = [];
    save();
    render();
    window.HTXToast.success("History cleared");
  }

  clearBtn.addEventListener("click", clear);

  /* ---------- Init ---------- */
  load();
  render();

  window.HTXHistory = { add, clear, copyText };
})();