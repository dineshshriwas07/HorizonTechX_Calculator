/* Calculator core — safe parser, keypad, keyboard, memory, mobile sheet. */
(function () {
  "use strict";

  /* ---------- Toasts ---------- */
  const toastStack = document.getElementById("toastStack");

  function toast(message, type = "success") {
    if (!toastStack) return;
    const icons = {
      success: "ri-checkbox-circle-fill",
      error: "ri-error-warning-fill",
      warning: "ri-alert-fill"
    };
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.setAttribute("role", "status");
    el.innerHTML = `<i class="${icons[type]}" aria-hidden="true"></i><span></span>`;
    el.querySelector("span").textContent = message;
    toastStack.appendChild(el);
    setTimeout(() => {
      el.classList.add("leaving");
      el.addEventListener("animationend", () => el.remove(), { once: true });
    }, 2400);
  }

  window.HTXToast = {
    success: (m) => toast(m, "success"),
    error:   (m) => toast(m, "error"),
    warning: (m) => toast(m, "warning")
  };

  /* ---------- Parser: + - * / with precedence, no eval ---------- */
  function tokenize(expr) {
    const tokens = [];
    let i = 0;
    while (i < expr.length) {
      const ch = expr[i];
      if (ch === " ") { i++; continue; }
      if ("+-*/".includes(ch)) { tokens.push({ type: "op", value: ch }); i++; continue; }
      if (/[0-9.]/.test(ch)) {
        let n = "";
        while (i < expr.length && /[0-9.]/.test(expr[i])) n += expr[i++];
        tokens.push({ type: "num", value: n });
        continue;
      }
      throw new Error("Invalid character");
    }
    return tokens;
  }

  function parse(tokens) {
    let pos = 0;
    const peek = () => tokens[pos];
    const next = () => tokens[pos++];

    function primary() {
      const t = peek();
      if (!t) throw new Error("Unexpected end");
      if (t.type === "op" && (t.value === "-" || t.value === "+")) {
        next();
        const v = primary();
        return t.value === "-" ? -v : v;
      }
      if (t.type === "num") {
        next();
        if ((t.value.match(/\./g) || []).length > 1 || t.value === ".") {
          throw new Error("Bad number");
        }
        const n = Number(t.value);
        if (!isFinite(n)) throw new Error("Out of range");
        return n;
      }
      throw new Error("Unexpected token");
    }

    function term() {
      let left = primary();
      while (peek() && peek().type === "op" && (peek().value === "*" || peek().value === "/")) {
        const op = next().value;
        const right = primary();
        if (op === "/") {
          if (right === 0) throw new Error("Division by zero");
          left /= right;
        } else {
          left *= right;
        }
      }
      return left;
    }

    let value = term();
    while (peek() && peek().type === "op" && (peek().value === "+" || peek().value === "-")) {
      const op = next().value;
      const right = term();
      value = op === "+" ? value + right : value - right;
    }
    if (pos < tokens.length) throw new Error("Invalid expression");
    return value;
  }

  function evaluate(expr) {
    const result = parse(tokenize(expr));
    if (!isFinite(result)) throw new Error("Not finite");
    return result;
  }

  // trim floating-point noise (e.g. 0.1 + 0.2) without losing real digits
  function clean(n) {
    if (!isFinite(n)) return "Error";
    return String(Number(n.toPrecision(12)));
  }

  /* ---------- State ---------- */
  const state = {
    expression: "",
    lastResult: null,
    freshEntry: true,
    memory: null
  };

  const exprDisplay = document.getElementById("expressionDisplay");
  const resultDisplay = document.getElementById("resultDisplay");
  const memoryIndicator = document.getElementById("memoryIndicator");
  const calculatorCard = document.getElementById("calculatorCard");

  const OP_SYMBOLS = { "*": "×", "/": "÷", "-": "−" };
  const pretty = (s) => s.replace(/[*/]/g, (m) => OP_SYMBOLS[m] || m);

  function render() {
    exprDisplay.textContent = pretty(state.expression);
    if (state.lastResult !== null) {
      resultDisplay.textContent = state.lastResult;
      resultDisplay.classList.remove("is-error");
    }
  }

  function showError(msg) {
    resultDisplay.textContent = msg;
    resultDisplay.classList.add("is-error");
  }

  /* ---------- Input ---------- */
  function inputNumber(ch) {
    const seg = (state.expression.match(/(\d*\.?\d*)$/) || [""])[1];

    if (ch === ".") {
      if (seg.includes(".")) return;
      if (seg === "") ch = "0.";
    }

    if (state.freshEntry) {
      state.expression = "";
      state.freshEntry = false;
    }

    state.expression += ch;
    state.lastResult = null;
    render();
  }

  function inputOperator(op) {
    if (!state.expression && state.lastResult === null) return;

    if (state.lastResult !== null && state.freshEntry) {
      state.expression = state.lastResult;
      state.freshEntry = false;
      state.lastResult = null;
    }

    if (/[+\-*/]$/.test(state.expression)) {
      state.expression = state.expression.slice(0, -1);
    }
    state.expression += op;
    render();
  }

  function backspace() {
    if (state.freshEntry && state.lastResult !== null) {
      state.expression = "";
      state.lastResult = null;
      state.freshEntry = false;
      render();
      resultDisplay.textContent = "0";
      return;
    }
    state.expression = state.expression.slice(0, -1);
    state.lastResult = null;
    render();
    if (!state.expression) resultDisplay.textContent = "0";
  }

  function clearAll() {
    state.expression = "";
    state.lastResult = null;
    state.freshEntry = true;
    exprDisplay.textContent = "";
    resultDisplay.textContent = "0";
    resultDisplay.classList.remove("is-error");
  }

  function toggleSign() {
    if (!state.expression && state.lastResult === null) return;

    if (state.freshEntry && state.lastResult !== null) {
      state.expression = String(-evaluate(state.lastResult));
      state.lastResult = null;
      state.freshEntry = false;
      render();
      return;
    }

    const m = state.expression.match(/(\d*\.?\d+)$/);
    if (!m) return;
    const num = m[1];
    const before = state.expression.slice(0, -num.length);

    // if the last number already has a unary minus directly before it, strip it
    if (before.endsWith("-") && (before.length === 1 || /[+\-*/]$/.test(before.slice(0, -1)))) {
      state.expression = before.slice(0, -1) + num;
    } else {
      state.expression = before + "-" + num;
    }
    render();
  }

  function applyPercent() {
    if (!state.expression && state.lastResult !== null) {
      state.lastResult = clean(evaluate(state.lastResult) / 100);
      resultDisplay.textContent = state.lastResult;
      return;
    }
    const m = state.expression.match(/(\d*\.?\d+)$/);
    if (!m) return;
    const num = m[1];
    const before = state.expression.slice(0, -num.length);
    state.expression = before + clean(Number(num) / 100);
    render();
  }

  function unaryTarget() {
    if (state.freshEntry && state.lastResult !== null) return evaluate(state.lastResult);
    const m = state.expression.match(/(\d*\.?\d+)$/);
    return m ? Number(m[1]) : null;
  }

  function setUnary(value) {
    const str = clean(value);
    if (state.freshEntry && state.lastResult !== null) {
      state.expression = str;
      state.lastResult = null;
      state.freshEntry = false;
      render();
      resultDisplay.textContent = str;
      return;
    }
    const m = state.expression.match(/(\d*\.?\d+)$/);
    if (!m) return;
    state.expression = state.expression.slice(0, -m[1].length) + str;
    render();
  }

  function applySqrt() {
    const n = unaryTarget();
    if (n === null) return toast("Nothing to square-root", "warning");
    if (n < 0) return showError("√ of negative number");
    setUnary(Math.sqrt(n));
  }

  function applySquare() {
    const n = unaryTarget();
    if (n === null) return toast("Nothing to square", "warning");
    setUnary(n * n);
  }

  function equals() {
    if (!state.expression) return;

    const expr = state.expression.replace(/[+\-*/]$/, "");
    if (!expr) return clearAll();

    try {
      const value = evaluate(expr);
      const result = clean(value);

      if (window.HTXHistory) window.HTXHistory.add(pretty(expr), result);

      exprDisplay.textContent = pretty(expr) + " =";
      resultDisplay.textContent = result;
      resultDisplay.classList.remove("is-error");

      state.lastResult = result;
      state.expression = "";
      state.freshEntry = true;
    } catch (err) {
      showError(err.message === "Division by zero"
        ? "Cannot divide by zero"
        : "Invalid expression");
    }
  }

  /* ---------- Copy / Screenshot ---------- */
  function copyResult() {
    const text = resultDisplay.textContent;
    if (!text) return toast("Nothing to copy", "warning");
    if (window.HTXHistory) window.HTXHistory.copyText(text, "Result copied");
  }

  function takeScreenshot() {
    if (window.HTXScreenshot) window.HTXScreenshot.capture(calculatorCard);
  }

  /* ---------- Memory ---------- */
  function displayedValue() {
    if (state.lastResult !== null) return evaluate(state.lastResult);
    if (!state.expression) return 0;
    try { return evaluate(state.expression.replace(/[+\-*/]$/, "")); }
    catch { return 0; }
  }

  function updateMemoryBadge() {
    memoryIndicator.hidden = state.memory === null;
  }

  function memoryAction(action) {
    const current = displayedValue();

    if (action === "clear") {
      state.memory = null;
      toast("Memory cleared");
      return updateMemoryBadge();
    }

    if (action === "recall") {
      if (state.memory === null) return toast("Memory is empty", "warning");
      state.expression = clean(state.memory);
      state.lastResult = null;
      state.freshEntry = false;
      render();
      resultDisplay.textContent = clean(state.memory);
      return;
    }

    if (action === "add") {
      state.memory = (state.memory || 0) + current;
      toast(`Memory: ${clean(state.memory)}`);
    } else if (action === "subtract") {
      state.memory = (state.memory || 0) - current;
      toast(`Memory: ${clean(state.memory)}`);
    }
    updateMemoryBadge();
  }

  /* ---------- Events ---------- */
  document.querySelector(".keypad").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    if (btn.dataset.num !== undefined) return inputNumber(btn.dataset.num);
    if (btn.dataset.op !== undefined) return inputOperator(btn.dataset.op);

    switch (btn.dataset.action) {
      case "clear": return clearAll();
      case "backspace": return backspace();
      case "sign": return toggleSign();
      case "percent": return applyPercent();
      case "sqrt": return applySqrt();
      case "square": return applySquare();
      case "equals": return equals();
      case "copy": return copyResult();
      case "screenshot": return takeScreenshot();
    }
  });

  document.querySelectorAll(".mem-btn").forEach((btn) => {
    btn.addEventListener("click", () => memoryAction(btn.dataset.mem));
  });

  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    const k = e.key;

    if (/^\d$/.test(k)) { inputNumber(k); e.preventDefault(); return; }
    if (k === ".") { inputNumber("."); e.preventDefault(); return; }
    if (k === "+" || k === "-" || k === "*" || k === "/") {
      inputOperator(k); e.preventDefault(); return;
    }

    switch (k) {
      case "Enter":
      case "=": equals(); e.preventDefault(); break;
      case "Backspace": backspace(); e.preventDefault(); break;
      case "Escape": clearAll(); e.preventDefault(); break;
      case "%": applyPercent(); e.preventDefault(); break;
    }
  });

  /* ---------- Mobile history sheet ---------- */
  const historyPanel = document.getElementById("historyPanel");
  const historyToggle = document.getElementById("historyToggle");
  const historyBackdrop = document.getElementById("historyBackdrop");
  const historyCloseBtn = document.getElementById("historyCloseBtn");

  function openSheet() {
    historyPanel.classList.add("open");
    historyBackdrop.classList.add("visible");
    document.body.classList.add("sheet-open");
    historyToggle.setAttribute("aria-expanded", "true");
    historyCloseBtn.focus();
  }

  function closeSheet() {
    historyPanel.classList.remove("open");
    historyBackdrop.classList.remove("visible");
    document.body.classList.remove("sheet-open");
    historyToggle.setAttribute("aria-expanded", "false");
    historyToggle.focus();
  }

  historyToggle.addEventListener("click", () => {
    historyPanel.classList.contains("open") ? closeSheet() : openSheet();
  });
  historyBackdrop.addEventListener("click", closeSheet);
  historyCloseBtn.addEventListener("click", closeSheet);

  // Esc closes the sheet first, even if it would also trigger AC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && historyPanel.classList.contains("open")) {
      closeSheet();
      e.stopPropagation();
    }
  }, true);

  window.addEventListener("resize", () => {
    if (window.innerWidth > 640 && historyPanel.classList.contains("open")) closeSheet();
  });

  /* ---------- Public API ---------- */
  window.HTXCalculator = {
    useHistoryResult(value) {
      state.expression = value;
      state.lastResult = null;
      state.freshEntry = false;
      render();
      resultDisplay.textContent = value;
      toast("Result loaded from history");
      if (window.innerWidth <= 640) closeSheet();
    }
  };

  clearAll();
})();