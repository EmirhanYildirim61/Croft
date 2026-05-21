# Contributing to Croft

Thanks for wanting to help! Here's how to get set up and what to work on.

## Setup

**Prerequisites**

- Rust (stable toolchain) — install via [rustup](https://rustup.rs/)
- Node.js 18+ and npm
- On Linux: `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`

**Run locally**

```sh
git clone https://github.com/your-username/croft
cd croft
npm install
npm run tauri dev
```

The app window will open automatically. Hot-reload works for the React frontend; Rust changes require a rebuild (Tauri handles this automatically in dev mode).

## Project Layout

```
src/                     React + TypeScript frontend (Vite, Tailwind CSS v4)
src/screens/             One file per navigation screen
src/components/          Sidebar, TopBar, Modal (shared shell components)
src/lib/                 tauri.ts (all IPC calls), format.ts (currency helpers)
src-tauri/src/           Rust backend
src-tauri/src/commands/  One module per domain (accounts, transactions, budgets, …)
src-tauri/migrations/    SQLx migration files (append-only, versioned SQL)
.github/workflows/       CI (ci.yml) and release (release.yml) pipelines
```

## Key Rules

- **Money is always integers.** Store cents/kuruş as `INTEGER` in the DB. Never use floats for amounts.
- **No network calls.** The app must work fully offline. Do not add any HTTP requests, telemetry, or external API calls.
- **Migrations are append-only.** Never edit an existing migration file — add a new numbered file instead.
- **IPC goes through `src/lib/tauri.ts`.** Never call `invoke()` directly from screens.

## Good First Issues

- Add a new default category to the seed list (`src-tauri/src/db.rs`)
- Improve an empty-state message in the UI (`src/screens/`)
- Fix a typo in README or docs

## Pull Requests

1. Fork the repo and create a branch from `main`
2. Make your change, keeping commits focused
3. Run `cargo test --manifest-path src-tauri/Cargo.toml` and `npm run build` to verify
4. Open a PR with a brief description of what and why
