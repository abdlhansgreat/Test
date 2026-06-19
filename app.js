/* Pomodoro Timer — themeable, multi-style, drift-corrected countdown. */
(function () {
  "use strict";

  // ---- Static config ----------------------------------------------------
  var DEFAULTS = {
    focus: 25, short: 5, long: 15, interval: 4,
    autoStartBreaks: false, autoStartPomodoros: false,
    sound: true, notify: false,
    theme: "midnight", timerStyle: "ring"
  };

  var MODES = {
    focus: { label: "Focus", phase: "Time to focus", tag: "Stay focused. One pomodoro at a time.", index: 0 },
    short: { label: "Short Break", phase: "Take a breather", tag: "Step away. You earned a short break.", index: 1 },
    long:  { label: "Long Break", phase: "Recharge fully", tag: "Great work — enjoy a longer rest.", index: 2 }
  };

  // Theme metadata for the picker (palettes themselves live in styles.css).
  var THEMES = [
    { id: "midnight",  name: "Midnight",  bg: "linear-gradient(150deg,#0f0c29,#302b63)", dots: ["#7c5cff","#00e0ff","#ff5fa2"] },
    { id: "aurora",    name: "Aurora",    bg: "linear-gradient(150deg,#021b1a,#0b5d4e)", dots: ["#2dd4bf","#a3e635","#38bdf8"] },
    { id: "synthwave", name: "Synthwave", bg: "linear-gradient(150deg,#160427,#491261)", dots: ["#ff2e97","#00f0ff","#b967ff"] },
    { id: "obsidian",  name: "Obsidian",  bg: "#0b0d10", dots: ["#10b981","#34d399","#22d3ee"] },
    { id: "amber",     name: "Amber",     bg: "#100d08", dots: ["#f59e0b","#fbbf24","#fb923c"] },
    { id: "dracula",   name: "Dracula",   bg: "#282a36", dots: ["#bd93f9","#50fa7b","#ff79c6"] },
    { id: "nord",      name: "Nord",      bg: "#2e3440", dots: ["#88c0d0","#a3be8c","#b48ead"] },
    { id: "forest",    name: "Forest",    bg: "linear-gradient(150deg,#0c1f15,#0a2a1c)", dots: ["#4ade80","#facc15","#2dd4bf"] },
    { id: "daylight",  name: "Daylight",  bg: "#e9ebf4", light: true, dots: ["#ff6b6b","#16b8a6","#4f7cff"] },
    { id: "paper",     name: "Paper",     bg: "#f2ece2", light: true, dots: ["#6366f1","#0ea5e9","#f43f5e"] },
    { id: "rose",      name: "Rosé",      bg: "#fbe9f1", light: true, dots: ["#e8568c","#14b8a6","#8b5cf6"] },
    { id: "mono",      name: "Mono",      bg: "#ffffff", light: true, dots: ["#111111","#52525b","#9ca3af"] },
    { id: "sunset",    name: "Sunset",    bg: "linear-gradient(125deg,#ff5f6d,#ffc371,#845ec2)", dots: ["#ffffff","#fff4d6","#ffe1ef"] },
    { id: "ocean",     name: "Ocean",     bg: "linear-gradient(125deg,#2193b0,#43cea2,#185a9d)", dots: ["#ffffff","#d6fff6","#d9efff"] }
  ];

  var STYLES = [
    { id: "ring",    name: "Ring",    icon: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" opacity=".3"/><path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' },
    { id: "dial",    name: "Dial",    icon: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" opacity=".3"/><path d="M12 12V3a9 9 0 0 1 7.8 13.5z" fill="currentColor"/>' },
    { id: "dashes",  name: "Dashes",  icon: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2.5v3"/><path d="M12 18.5v3"/><path d="M2.5 12h3"/><path d="M18.5 12h3"/><path d="M5.2 5.2l2.1 2.1"/><path d="M16.7 16.7l2.1 2.1"/><path d="M18.8 5.2l-2.1 2.1"/><path d="M7.3 16.7l-2.1 2.1"/></g>' },
    { id: "wave",    name: "Liquid",  icon: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" opacity=".3"/><path d="M3.6 13c1.4 0 1.4-1.6 2.8-1.6S7.8 13 9.2 13s1.4-1.6 2.8-1.6S13.4 13 14.8 13s1.4-1.6 2.8-1.6S19 13 20.4 13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' },
    { id: "bar",     name: "Bar",     icon: '<rect x="3" y="9.5" width="18" height="5" rx="2.5" fill="none" stroke="currentColor" stroke-width="2" opacity=".4"/><rect x="3" y="9.5" width="11" height="5" rx="2.5" fill="currentColor"/>' },
    { id: "minimal", name: "Minimal", icon: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 9v6"/><path d="M8.5 9v6"/><path d="M15.5 9v6"/><path d="M19 9v6"/></g><circle cx="12" cy="10" r=".9" fill="currentColor"/><circle cx="12" cy="14" r=".9" fill="currentColor"/>' }
  ];

  var STORAGE_KEY = "pomodoro.settings.v2";
  var TICKS = 60; // dash count

  // ---- State ------------------------------------------------------------
  var settings = loadSettings();
  var state = {
    mode: "focus",
    remaining: settings.focus * 60,
    total: settings.focus * 60,
    running: false, endsAt: 0,
    completed: 0, roundInCycle: 0
  };
  var ticker = null;
  var dashTicks = [];

  // ---- Element refs -----------------------------------------------------
  var root = document.documentElement;
  var el = {
    body: document.body,
    stage: document.querySelector(".stage"),
    modes: document.querySelector(".modes"),
    time: byId("timeDisplay"), phase: byId("phaseLabel"), tagline: byId("tagline"),
    startPause: byId("startPauseBtn"), skip: byId("skipBtn"), reset: byId("resetBtn"),
    rounds: byId("roundCount"), cycle: byId("cycleDots"),
    dashes: byId("dashes"),
    modeBtns: toArray(document.querySelectorAll(".mode-btn")),
    // appearance
    appearanceBtn: byId("appearanceBtn"), appearanceOverlay: byId("appearanceOverlay"),
    themeGrid: byId("themeGrid"), styleGrid: byId("styleGrid"),
    // settings
    settingsBtn: byId("settingsBtn"), settingsOverlay: byId("settingsOverlay"),
    closeSettings: byId("closeSettings"), saveSettings: byId("saveSettings"), resetDefaults: byId("resetDefaults"),
    focusInput: byId("focusInput"), shortInput: byId("shortInput"), longInput: byId("longInput"),
    intervalInput: byId("intervalInput"),
    autoStartBreaks: byId("autoStartBreaks"), autoStartPomodoros: byId("autoStartPomodoros"),
    soundEnabled: byId("soundEnabled"), notifyEnabled: byId("notifyEnabled")
  };

  // ---- Timer engine -----------------------------------------------------
  function start() {
    if (state.running) return;
    state.running = true;
    state.endsAt = Date.now() + state.remaining * 1000;
    ticker = setInterval(tick, 250);
    primeAudio();
    render();
  }
  function pause() {
    if (!state.running) return;
    state.running = false;
    state.remaining = Math.max(0, Math.round((state.endsAt - Date.now()) / 1000));
    clearInterval(ticker); ticker = null;
    render();
  }
  function toggle() { state.running ? pause() : start(); }

  function tick() {
    var remaining = Math.max(0, Math.round((state.endsAt - Date.now()) / 1000));
    state.remaining = remaining;
    if (remaining <= 0) {
      clearInterval(ticker); ticker = null; state.running = false;
      complete(); return;
    }
    render();
  }

  function reset() {
    pause();
    state.remaining = durationFor(state.mode);
    state.total = state.remaining;
    render();
  }

  function complete() {
    notifyEnd(state.mode);
    var next;
    if (state.mode === "focus") {
      state.completed += 1; state.roundInCycle += 1;
      next = (state.roundInCycle % settings.interval === 0) ? "long" : "short";
    } else { next = "focus"; }
    switchMode(next);
    var auto = next === "focus" ? settings.autoStartPomodoros : settings.autoStartBreaks;
    if (auto) start(); else render();
  }

  function skip() {
    pause();
    var next;
    if (state.mode === "focus") next = (state.roundInCycle + 1) % settings.interval === 0 ? "long" : "short";
    else next = "focus";
    switchMode(next);
    render();
  }

  function switchMode(mode) {
    pause();
    state.mode = mode;
    state.remaining = durationFor(mode);
    state.total = state.remaining;
    render();
  }

  function durationFor(mode) { return settings[mode] * 60; }

  // ---- Rendering --------------------------------------------------------
  function render() {
    var mins = Math.floor(state.remaining / 60), secs = state.remaining % 60;
    var timeStr = pad(mins) + ":" + pad(secs);
    var fraction = state.total > 0 ? state.remaining / state.total : 0;

    el.time.textContent = timeStr;
    el.phase.textContent = MODES[state.mode].phase;
    el.tagline.textContent = MODES[state.mode].tag;
    el.body.setAttribute("data-mode", state.mode);

    el.stage.style.setProperty("--frac", String(fraction));
    el.modes.style.setProperty("--mi", String(MODES[state.mode].index));

    if (root.getAttribute("data-timer") === "dashes") updateDashes(fraction);

    el.startPause.textContent = state.running ? "Pause" : "Start";

    el.modeBtns.forEach(function (btn) {
      var active = btn.dataset.mode === state.mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });

    el.rounds.textContent = String(state.completed);
    el.cycle.textContent = "#" + (state.roundInCycle % settings.interval + 1);

    document.title = (state.running ? timeStr + " · " : "") + MODES[state.mode].label + " — Pomodoro";
  }

  // ---- Appearance: themes + timer styles --------------------------------
  function applyTheme(id) { root.setAttribute("data-theme", id); }
  function applyTimerStyle(id) { root.setAttribute("data-timer", id); if (id === "dashes") updateDashes(state.total > 0 ? state.remaining / state.total : 0); }

  function buildThemeGrid() {
    el.themeGrid.innerHTML = "";
    THEMES.forEach(function (t) {
      var b = document.createElement("button");
      b.className = "swatch" + (t.id === settings.theme ? " is-active" : "");
      b.type = "button";
      b.dataset.theme = t.id;
      b.style.background = t.bg;
      b.setAttribute("aria-label", t.name + " theme");
      b.innerHTML =
        '<span class="sw-name" style="color:' + (t.light ? "#1a1a22" : "#fff") + '">' + t.name + '</span>' +
        '<span class="sw-check">✓</span>' +
        '<span class="sw-dots">' + t.dots.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join("") + '</span>';
      b.addEventListener("click", function () {
        settings.theme = t.id; applyTheme(t.id); persistSettings();
        markActive(el.themeGrid, "[data-theme]", "data-theme", t.id);
      });
      el.themeGrid.appendChild(b);
    });
  }

  function buildStyleGrid() {
    el.styleGrid.innerHTML = "";
    STYLES.forEach(function (s) {
      var b = document.createElement("button");
      b.className = "style-btn" + (s.id === settings.timerStyle ? " is-active" : "");
      b.type = "button";
      b.dataset.style = s.id;
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + s.icon + "</svg><span>" + s.name + "</span>";
      b.addEventListener("click", function () {
        settings.timerStyle = s.id; applyTimerStyle(s.id); persistSettings();
        markActive(el.styleGrid, "[data-style]", "data-style", s.id);
      });
      el.styleGrid.appendChild(b);
    });
  }

  function markActive(container, sel, attr, value) {
    toArray(container.querySelectorAll(sel)).forEach(function (node) {
      node.classList.toggle("is-active", node.getAttribute(attr) === value);
    });
  }

  function buildDashes() {
    var NS = "http://www.w3.org/2000/svg";
    for (var i = 0; i < TICKS; i++) {
      var line = document.createElementNS(NS, "line");
      line.setAttribute("x1", "110"); line.setAttribute("y1", "12");
      line.setAttribute("x2", "110"); line.setAttribute("y2", "28");
      line.setAttribute("transform", "rotate(" + (i * (360 / TICKS)) + " 110 110)");
      line.setAttribute("class", "tick");
      el.dashes.appendChild(line);
      dashTicks.push(line);
    }
  }

  function updateDashes(fraction) {
    var on = Math.ceil(fraction * TICKS);
    for (var i = 0; i < dashTicks.length; i++) {
      dashTicks[i].classList.toggle("is-on", i < on);
    }
  }

  // ---- Settings persistence --------------------------------------------
  function loadSettings() {
    var merged = Object.assign({}, DEFAULTS);
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        Object.keys(DEFAULTS).forEach(function (k) { if (saved[k] !== undefined) merged[k] = saved[k]; });
      }
    } catch (e) { /* ignore */ }
    return merged;
  }
  function persistSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
  }

  // ---- Settings dialog --------------------------------------------------
  function openSettings() {
    el.focusInput.value = settings.focus; el.shortInput.value = settings.short;
    el.longInput.value = settings.long; el.intervalInput.value = settings.interval;
    el.autoStartBreaks.checked = settings.autoStartBreaks;
    el.autoStartPomodoros.checked = settings.autoStartPomodoros;
    el.soundEnabled.checked = settings.sound; el.notifyEnabled.checked = settings.notify;
    el.settingsOverlay.hidden = false;
  }
  function closeSettings() { el.settingsOverlay.hidden = true; }

  function saveSettings() {
    settings.focus = clampInt(el.focusInput.value, 1, 120, DEFAULTS.focus);
    settings.short = clampInt(el.shortInput.value, 1, 60, DEFAULTS.short);
    settings.long = clampInt(el.longInput.value, 1, 60, DEFAULTS.long);
    settings.interval = clampInt(el.intervalInput.value, 2, 12, DEFAULTS.interval);
    settings.autoStartBreaks = el.autoStartBreaks.checked;
    settings.autoStartPomodoros = el.autoStartPomodoros.checked;
    settings.sound = el.soundEnabled.checked; settings.notify = el.notifyEnabled.checked;
    persistSettings();
    if (settings.notify && "Notification" in window && Notification.permission === "default") Notification.requestPermission();
    if (!state.running) { state.remaining = durationFor(state.mode); state.total = state.remaining; }
    closeSettings(); render();
  }

  function resetDefaults() {
    var keepTheme = settings.theme, keepStyle = settings.timerStyle;
    settings = Object.assign({}, DEFAULTS, { theme: keepTheme, timerStyle: keepStyle });
    persistSettings(); openSettings();
    if (!state.running) { state.remaining = durationFor(state.mode); state.total = state.remaining; render(); }
  }

  // ---- Notifications: sound + desktop -----------------------------------
  var audioCtx = null;
  function primeAudio() {
    if (!settings.sound) return;
    try {
      if (!audioCtx) { var C = window.AudioContext || window.webkitAudioContext; if (C) audioCtx = new C(); }
      if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    } catch (e) { /* ignore */ }
  }
  function playChime() {
    if (!settings.sound || !audioCtx) return;
    var now = audioCtx.currentTime;
    [[880, 0], [1318.5, 0.18]].forEach(function (p) {
      var osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.type = "sine"; osc.frequency.value = p[0];
      var t0 = now + p[1];
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0); osc.stop(t0 + 0.55);
    });
  }
  function notifyEnd(mode) {
    playChime();
    if (!settings.notify || !("Notification" in window) || Notification.permission !== "granted") return;
    var msg = mode === "focus" ? "Focus session complete — time for a break!" : "Break's over — ready to focus?";
    try { new Notification("Pomodoro", { body: msg }); } catch (e) { /* ignore */ }
  }

  // ---- Helpers ----------------------------------------------------------
  function byId(id) { return document.getElementById(id); }
  function toArray(nl) { return Array.prototype.slice.call(nl); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function clampInt(v, min, max, fb) { var n = parseInt(v, 10); if (isNaN(n)) return fb; return Math.min(max, Math.max(min, n)); }
  function openOverlay(o) { o.hidden = false; }
  function closeOverlay(o) { o.hidden = true; }

  // ---- Wiring -----------------------------------------------------------
  el.startPause.addEventListener("click", toggle);
  el.reset.addEventListener("click", reset);
  el.skip.addEventListener("click", skip);
  el.modeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (btn.dataset.mode === state.mode && !state.running) return;
      switchMode(btn.dataset.mode);
    });
  });

  el.appearanceBtn.addEventListener("click", function () { openOverlay(el.appearanceOverlay); });
  toArray(document.querySelectorAll("[data-close-appearance]")).forEach(function (b) {
    b.addEventListener("click", function () { closeOverlay(el.appearanceOverlay); });
  });
  el.appearanceOverlay.addEventListener("click", function (e) { if (e.target === el.appearanceOverlay) closeOverlay(el.appearanceOverlay); });

  el.settingsBtn.addEventListener("click", openSettings);
  el.closeSettings.addEventListener("click", closeSettings);
  el.saveSettings.addEventListener("click", saveSettings);
  el.resetDefaults.addEventListener("click", resetDefaults);
  el.settingsOverlay.addEventListener("click", function (e) { if (e.target === el.settingsOverlay) closeSettings(); });

  document.addEventListener("keydown", function (e) {
    if (!el.appearanceOverlay.hidden) { if (e.key === "Escape") closeOverlay(el.appearanceOverlay); return; }
    if (!el.settingsOverlay.hidden) { if (e.key === "Escape") closeSettings(); return; }
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;
    if (e.code === "Space" || e.key === " ") { e.preventDefault(); toggle(); }
  });

  document.addEventListener("visibilitychange", function () { if (!document.hidden && state.running) tick(); });

  // ---- Boot -------------------------------------------------------------
  buildDashes();          // build ticks before applying a saved "dashes" style
  applyTheme(settings.theme);
  applyTimerStyle(settings.timerStyle);
  buildThemeGrid();
  buildStyleGrid();
  render();
})();
