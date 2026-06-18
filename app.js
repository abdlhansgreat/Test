/* Pomodoro Timer — dependency-free, drift-corrected countdown. */
(function () {
  "use strict";

  // ---- Configuration ----------------------------------------------------
  var DEFAULTS = {
    focus: 25,
    short: 5,
    long: 15,
    interval: 4, // focus rounds before a long break
    autoStartBreaks: false,
    autoStartPomodoros: false,
    sound: true,
    notify: false
  };

  var MODES = {
    focus: { label: "Focus", phase: "Time to focus", tag: "Stay focused. One pomodoro at a time." },
    short: { label: "Short Break", phase: "Take a breather", tag: "Step away. You earned a short break." },
    long:  { label: "Long Break", phase: "Recharge fully", tag: "Great work — enjoy a longer rest." }
  };

  var RING_CIRCUMFERENCE = 2 * Math.PI * 100; // r = 100 in the SVG
  var STORAGE_KEY = "pomodoro.settings.v1";

  // ---- State ------------------------------------------------------------
  var settings = loadSettings();
  var state = {
    mode: "focus",
    remaining: settings.focus * 60, // seconds
    total: settings.focus * 60,
    running: false,
    endsAt: 0,        // timestamp (ms) the current run finishes
    completed: 0,     // total focus sessions finished
    roundInCycle: 0   // focus sessions since the last long break
  };
  var ticker = null;

  // ---- Element refs -----------------------------------------------------
  var el = {
    body: document.body,
    time: byId("timeDisplay"),
    phase: byId("phaseLabel"),
    ring: byId("ringProgress"),
    startPause: byId("startPauseBtn"),
    skip: byId("skipBtn"),
    reset: byId("resetBtn"),
    rounds: byId("roundCount"),
    cycle: byId("cycleDots"),
    tagline: byId("tagline"),
    modeBtns: Array.prototype.slice.call(document.querySelectorAll(".mode-btn")),
    // settings
    settingsBtn: byId("settingsBtn"),
    overlay: byId("overlay"),
    closeSettings: byId("closeSettings"),
    saveSettings: byId("saveSettings"),
    resetDefaults: byId("resetDefaults"),
    focusInput: byId("focusInput"),
    shortInput: byId("shortInput"),
    longInput: byId("longInput"),
    intervalInput: byId("intervalInput"),
    autoStartBreaks: byId("autoStartBreaks"),
    autoStartPomodoros: byId("autoStartPomodoros"),
    soundEnabled: byId("soundEnabled"),
    notifyEnabled: byId("notifyEnabled")
  };

  el.ring.style.strokeDasharray = RING_CIRCUMFERENCE.toFixed(1);

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
    clearInterval(ticker);
    ticker = null;
    render();
  }

  function toggle() {
    state.running ? pause() : start();
  }

  function tick() {
    var remaining = Math.max(0, Math.round((state.endsAt - Date.now()) / 1000));
    state.remaining = remaining;
    if (remaining <= 0) {
      clearInterval(ticker);
      ticker = null;
      state.running = false;
      complete();
      return;
    }
    render();
  }

  // Reset the current mode's clock back to full.
  function reset() {
    pause();
    state.remaining = durationFor(state.mode);
    state.total = state.remaining;
    render();
  }

  // Move to the next session, optionally because the timer ran out.
  function complete() {
    notifyEnd(state.mode);

    var next;
    if (state.mode === "focus") {
      state.completed += 1;
      state.roundInCycle += 1;
      next = (state.roundInCycle % settings.interval === 0) ? "long" : "short";
    } else {
      next = "focus";
    }

    switchMode(next);

    var auto = next === "focus" ? settings.autoStartPomodoros : settings.autoStartBreaks;
    if (auto) start();
    else render();
  }

  // Skip the current session without crediting it.
  function skip() {
    pause();
    var next;
    if (state.mode === "focus") {
      next = (state.roundInCycle + 1) % settings.interval === 0 ? "long" : "short";
    } else {
      next = "focus";
    }
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

  function durationFor(mode) {
    return settings[mode] * 60;
  }

  // ---- Rendering --------------------------------------------------------
  function render() {
    var mins = Math.floor(state.remaining / 60);
    var secs = state.remaining % 60;
    var timeStr = pad(mins) + ":" + pad(secs);

    el.time.textContent = timeStr;
    el.phase.textContent = MODES[state.mode].phase;
    el.tagline.textContent = MODES[state.mode].tag;
    el.body.setAttribute("data-mode", state.mode);

    // Progress ring (drains as time passes)
    var fraction = state.total > 0 ? state.remaining / state.total : 0;
    el.ring.style.strokeDashoffset = (RING_CIRCUMFERENCE * (1 - fraction)).toFixed(1);

    // Controls
    el.startPause.textContent = state.running ? "Pause" : "Start";
    el.startPause.classList.toggle("is-running", state.running);

    // Mode tabs
    el.modeBtns.forEach(function (btn) {
      var active = btn.dataset.mode === state.mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });

    // Stats
    el.rounds.textContent = String(state.completed);
    el.cycle.textContent = "#" + (state.roundInCycle % settings.interval + 1);

    // Tab title
    document.title = (state.running ? timeStr + " · " : "") + MODES[state.mode].label + " — Pomodoro";
  }

  // ---- Settings ---------------------------------------------------------
  function loadSettings() {
    var merged = Object.assign({}, DEFAULTS);
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        Object.keys(DEFAULTS).forEach(function (k) {
          if (saved[k] !== undefined) merged[k] = saved[k];
        });
      }
    } catch (e) { /* ignore corrupt storage */ }
    return merged;
  }

  function persistSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (e) { /* quota / privacy mode */ }
  }

  function openSettings() {
    el.focusInput.value = settings.focus;
    el.shortInput.value = settings.short;
    el.longInput.value = settings.long;
    el.intervalInput.value = settings.interval;
    el.autoStartBreaks.checked = settings.autoStartBreaks;
    el.autoStartPomodoros.checked = settings.autoStartPomodoros;
    el.soundEnabled.checked = settings.sound;
    el.notifyEnabled.checked = settings.notify;
    el.overlay.hidden = false;
  }

  function closeSettings() { el.overlay.hidden = true; }

  function saveSettings() {
    settings.focus = clampInt(el.focusInput.value, 1, 120, DEFAULTS.focus);
    settings.short = clampInt(el.shortInput.value, 1, 60, DEFAULTS.short);
    settings.long = clampInt(el.longInput.value, 1, 60, DEFAULTS.long);
    settings.interval = clampInt(el.intervalInput.value, 2, 12, DEFAULTS.interval);
    settings.autoStartBreaks = el.autoStartBreaks.checked;
    settings.autoStartPomodoros = el.autoStartPomodoros.checked;
    settings.sound = el.soundEnabled.checked;
    settings.notify = el.notifyEnabled.checked;

    persistSettings();

    // If notifications were just enabled, ask for permission now.
    if (settings.notify && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Re-sync the current (idle) timer to any new duration.
    if (!state.running) {
      state.remaining = durationFor(state.mode);
      state.total = state.remaining;
    }
    closeSettings();
    render();
  }

  function resetDefaults() {
    settings = Object.assign({}, DEFAULTS);
    persistSettings();
    openSettings(); // repopulate inputs with defaults
  }

  // ---- Notifications: sound + desktop -----------------------------------
  var audioCtx = null;
  function primeAudio() {
    // Create/resume the audio context on a user gesture so the alert can play later.
    if (!settings.sound) return;
    try {
      if (!audioCtx) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) audioCtx = new Ctx();
      }
      if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    } catch (e) { /* audio unavailable */ }
  }

  function playChime() {
    if (!settings.sound || !audioCtx) return;
    // A short, pleasant two-note chime built from oscillators.
    var now = audioCtx.currentTime;
    [ [880, 0], [1318.5, 0.18] ].forEach(function (pair) {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = pair[0];
      var t0 = now + pair[1];
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.55);
    });
  }

  function notifyEnd(finishedMode) {
    playChime();
    if (!settings.notify || !("Notification" in window) || Notification.permission !== "granted") return;
    var msg = finishedMode === "focus"
      ? "Focus session complete — time for a break!"
      : "Break's over — ready to focus?";
    try { new Notification("Pomodoro", { body: msg }); } catch (e) { /* ignore */ }
  }

  // ---- Helpers ----------------------------------------------------------
  function byId(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function clampInt(value, min, max, fallback) {
    var n = parseInt(value, 10);
    if (isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

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

  el.settingsBtn.addEventListener("click", openSettings);
  el.closeSettings.addEventListener("click", closeSettings);
  el.saveSettings.addEventListener("click", saveSettings);
  el.resetDefaults.addEventListener("click", resetDefaults);
  el.overlay.addEventListener("click", function (e) {
    if (e.target === el.overlay) closeSettings();
  });

  // Keyboard shortcuts: Space toggles, Esc closes the dialog.
  document.addEventListener("keydown", function (e) {
    if (!el.overlay.hidden) {
      if (e.key === "Escape") closeSettings();
      return;
    }
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;
    if (e.code === "Space" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  });

  // Keep the countdown honest after the tab was backgrounded/throttled.
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && state.running) tick();
  });

  // ---- Boot -------------------------------------------------------------
  render();
})();
