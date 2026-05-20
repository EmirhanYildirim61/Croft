# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See [ROADMAP.md](ROADMAP.md) for the full feature plan and current phase status.

## Commands

```sh
# Run the full app in development (hot-reloads React, recompiles Rust on change)
npm run tauri dev

# Type-check + build the React frontend only
npm run build

# Build a production Tauri bundle (all platforms)
npm run tauri build

# Compile and type-check Rust only (fast iteration, no Tauri window)
cargo build --manifest-path src-tauri/Cargo.toml
```

There is no test runner configured yet. When tests are added (Phase 1D), run them with `cargo test --manifest-path src-tauri/Cargo.toml` (Rust) and `npm test` (frontend).

## Architecture

This is a **local-first, server-less** desktop app: no backend server, no network calls ever.

```
src/                 React + TypeScript UI (Vite, Tailwind CSS v4)
src-tauri/
  src/lib.rs         Rust entry point — Tauri setup, DB init, command registration
  src/main.rs        Binary entry (thin wrapper around lib.rs::run)
  migrations/        SQLx versioned SQL migration files (append-only)
  capabilities/      Tauri permission manifests (what the frontend can call)
  tauri.conf.json    App metadata, window config, bundle targets
```

### IPC pattern

All data access goes through **Tauri commands** (Rust functions tagged `#[tauri::command]`), registered in `lib.rs` via `tauri::generate_handler![]`. The frontend calls them with `invoke()` from `@tauri-apps/api/core`. There is no REST API, no WebSocket — only this IPC bridge.

### State

`AppState` (defined in `lib.rs`) holds the `SqlitePool` and is registered with `.manage()` on startup. Commands receive it via `State<'_, AppState>`.

### Database

- **Driver:** `sqlx 0.8` with `runtime-tokio` and the `sqlite` feature.
- **Migrations:** files in `src-tauri/migrations/` are applied automatically at startup via `sqlx::migrate!("./migrations")`. Always add new migrations as new numbered files; never edit existing ones.
- **DB location:** defaults to the OS app-data directory (`tauri::Manager::path().app_data_dir()`). Phase 1D settings will expose a "Move…" button to let users relocate it.
- **Money rule:** all monetary values are stored as `INTEGER` (cents/kuruş). Never use `REAL` for amounts. Convert to decimal only at the display layer.

### Capabilities

`src-tauri/capabilities/default.json` controls which Tauri APIs the frontend can call. When adding a new plugin (e.g., `tauri-plugin-dialog`), add its permission string here in addition to registering it in `lib.rs`.

### Tailwind CSS

Version 4, configured via the `@tailwindcss/vite` plugin in `vite.config.ts`. No `tailwind.config.js` file is needed. The import lives in `src/App.css` (`@import "tailwindcss"`), which is imported in `src/main.tsx`.

## Key constraints

- **Zero network connections** — no `fetch`, no HTTP client, no telemetry.
- **Single SQLite file** — the user owns this file and can move it with any sync tool.
- **Migrations are append-only** — add `000N_description.sql`, never modify existing files.
- **Integer money everywhere in Rust/SQL** — floats for money are a bug.
