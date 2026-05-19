# SoundPad

A desktop soundboard app for Windows. Play sounds through your speakers and microphone simultaneously — perfect for Discord, TeamSpeak, and in-game voice chat.

Built with **Tauri v2**, **React**, **TypeScript**, and **Rust**.

---

## Features

- **Play sounds to speakers and/or mic** — three modes: Both, Speakers only, Mic only
- **Playback seek bar** — click anywhere on the bar to jump to that position in the sound
- **Per-sound hotkeys** — bind any key combo to a sound and trigger it while in-game or in another app
- **Master volume + per-sound volume** — adjust independently
- **Download sounds** — paste a YouTube or direct audio URL and download straight into your library
- **Categories & sidebar** — organise sounds into colour-coded categories
- **Grid and list view** — switch between tile grid and compact list layout
- **Search** — instant filter by sound name
- **Auto-updater** — notified and updated in-app when a new release is available
- **Mic routing via VB-Audio Virtual Cable** — one-click driver install built in

---

## Requirements

- Windows 10 or 11
- For mic routing: [VB-Audio Virtual Cable](https://vb-audio.com/Cable/) (free — the app will offer to install it automatically on first launch)

---

## Installation

Download the latest installer from the [Releases](https://github.com/MStefa003/sound-board/releases) page and run it.

---

## Development Setup

**Prerequisites:** [Node.js](https://nodejs.org), [Rust](https://rustup.rs), [Tauri CLI](https://tauri.app/start/prerequisites/)

```bash
# Install dependencies
npm install

# Run in dev mode (hot reload)
npm run tauri dev

# Build a release installer
npm run tauri build
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 18 + TypeScript + Tailwind CSS |
| Desktop shell | Tauri v2 |
| Audio engine | Rust — rodio 0.19 + cpal 0.15 |
| Build tool | Vite |

---

## License

MIT
