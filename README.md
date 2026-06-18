# 🍅 Pomodoro Timer

A clean, dependency-free Pomodoro timer to help you focus. No build step, no
frameworks, no tracking — just open it in a browser and start a session.

## What is the Pomodoro Technique?

Work in focused intervals (traditionally **25 minutes**) separated by short
breaks. After every few focus rounds, take a longer break. The structure keeps
you fresh and makes big tasks feel manageable.

## Features

- **Three modes** — Focus, Short Break, and Long Break, each with its own color theme.
- **Automatic cycling** — finishes a focus round → suggests a break; a long break
  arrives after every *N* rounds (configurable).
- **Drift-corrected timing** — the countdown uses real timestamps, so it stays
  accurate even if the browser throttles the tab in the background.
- **Customizable** — set your own durations, rounds-per-cycle, and auto-start behavior.
- **Sound + desktop alerts** — a gentle chime (generated in-browser, no audio
  files) and optional native notifications when a session ends.
- **Session tracking** — counts completed focus rounds and shows your place in the cycle.
- **Persistent settings** — your preferences are saved in `localStorage`.
- **Keyboard friendly** — `Space` starts/pauses, `Esc` closes settings.
- **Responsive** — works on desktop and mobile.

## Usage

The app loads as an ES module, so run it from a local server rather than opening
the file directly (browsers block module scripts on `file://`).

### With npm (dev server + build)

For a hot-reloading dev server via [Vite](https://vitejs.dev):

```bash
npm install      # first time only
npm run dev      # serves at http://localhost:5173 (add -- --open to auto-open)
```

Other scripts:

```bash
npm run build    # bundle to dist/
npm run preview  # serve the production build locally
```

### Without npm

Serve the folder with any static file server:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Controls

| Action            | How                                  |
| ----------------- | ------------------------------------ |
| Start / Pause     | Click **Start** or press `Space`     |
| Skip session      | ⏭ skip button                        |
| Reset current     | ↺ reset button                       |
| Switch mode       | Focus / Short Break / Long Break tabs |
| Settings          | ⚙ gear icon                          |

## Project structure

```
index.html      — markup
styles.css      — styling and per-mode theming
app.js          — timer engine, settings, notifications
package.json    — npm scripts (dev, build, preview)
vite.config.js  — dev-server / build config (optional tooling)
```

## License

MIT
