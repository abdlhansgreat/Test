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

Open `index.html` in any modern browser. That's it.

Or serve it locally (handy for testing notifications, which some browsers
restrict on `file://`):

```bash
# Python 3
python3 -m http.server 8000
# then visit http://localhost:8000
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
index.html   — markup
styles.css   — styling and per-mode theming
app.js       — timer engine, settings, notifications
```

## License

MIT
