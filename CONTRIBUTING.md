# Contributing

Thanks for wanting to help! Here's how to get set up and what to work on.

## Setup

**Prerequisites**

- Rust (stable toolchain) — install via [rustup](https://rustup.rs/)
- Node.js 18+ and npm
- On Linux: `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`

**Run locally**

```sh
git clone https://github.com/your-username/finance-app
cd finance-app
npm install
npm run tauri dev
```

The app window will open automatically. Hot-reload works for the React frontend; Rust changes require a rebuild (Tauri handles this automatically in dev mode).

## Project Layout

```
src/             React + TypeScript frontend
src-tauri/       Rust backend (Tauri commands, SQLite via sqlx)
src-tauri/migrations/   SQLx migration files (versioned SQL)
.github/workflows/      CI configuration
```

## Key Rules

- **Money is always integers.** Store cents/kuruş as `INTEGER` in the DB. Never use floats for amounts.
- **No network calls.** The app must work fully offline. Do not add any HTTP requests, telemetry, or external API calls.
- **Migrations are append-only.** Never edit an existing migration file — add a new numbered file instead.

## Good First Issues

- Add a new default category to the seed list (`src-tauri/src/db.rs`)
- Improve an empty-state message in the UI (`src/components/`)
- Add a keyboard shortcut (see Phase 1D in `ROADMAP.md`)
- Fix a typo in README or docs

## Pull Requests

1. Fork the repo and create a branch from `main`
2. Make your change, keeping commits focused
3. Run `npm run tauri build` to confirm it compiles
4. Open a PR with a brief description of what and why
