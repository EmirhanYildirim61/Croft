# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See [ROADMAP.md](ROADMAP.md) for the full feature plan and current phase status. Phases 1A–2, the Phase 3 features that are in scope (multi-currency, subscriptions tracker, backup reminder), and the Phase 2.5 QoL pass are complete. The only remaining items are out-of-scope Phase 3 ones (plugin/theme system, mobile) and the launch checklist.

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

# Run Rust unit tests (financial.rs has tests; more will be added)
cargo test --manifest-path src-tauri/Cargo.toml
```

## Architecture

This is a **local-first, server-less** desktop app: no backend server, no network calls ever.

```
src/                         React + TypeScript UI (Vite, Tailwind CSS v4)
  App.tsx                    Root: shared state (accounts, categories), screen routing
  types.ts                   Shared TypeScript interfaces mirroring Rust models
  lib/tauri.ts               Single API object — all invoke() calls live here
  lib/format.ts              Currency formatting and YYYY-MM date helpers
  context/toast.tsx          useToast() hook for error/success notifications
  components/                Sidebar, TopBar, Modal (reusable shell components)
  screens/                   One file per navigation screen

src-tauri/
  src/lib.rs                 Tauri setup, DB init, command registration
  src/models.rs              Rust structs (sqlx::FromRow + serde) mirroring DB tables
  src/db.rs                  AppState, init_db (WAL mode, FK enforcement, migrations)
  src/financial.rs           Pure financial math — no Tauri deps, fully unit-tested
  src/commands/              One module per domain (accounts, transactions, budgets, …)
  migrations/                SQLx versioned SQL migration files (append-only)
  capabilities/default.json  Tauri permission manifests
```

### IPC pattern

All data access goes through **Tauri commands** (Rust functions tagged `#[tauri::command]`), registered in `lib.rs` via `tauri::generate_handler![]`. The frontend calls them exclusively through the `api` object in `src/lib/tauri.ts` — never call `invoke()` directly from screens. There is no REST API, no WebSocket.

### Frontend state

`App.tsx` owns shared data (accounts + categories) and exposes it as props to screens that need it. Screens that mutate data call `loadShared()` (passed as `onRefresh` or triggered via navigation) to keep the top-bar net worth in sync. Screen-local state stays inside each screen. The top-bar net worth is **currency-aware**: balances are converted into the user's display currency (stored in `localStorage` under `display_currency`) using exchange rates fetched alongside accounts.

### Rust command modules

`src-tauri/src/commands/` has one file per domain. Each command receives `State<'_, AppState>` to access the pool. Adding a new command requires: (1) writing it in the appropriate module, (2) exporting it from `mod.rs` if it's a new module, and (3) adding it to `tauri::generate_handler![]` in `lib.rs`. Bulk write operations (e.g. CSV imports) must be wrapped in a sqlx transaction (`pool.begin()` / `tx.commit()`) so they are atomic.

### Database

- **Driver:** `sqlx 0.8` with `runtime-tokio` and the `sqlite` feature; WAL journal mode; `foreign_keys = ON`.
- **Migrations:** run automatically at startup via `sqlx::migrate!("./migrations")`. Name new files `000N_description.sql`; never edit existing ones.
- **DB location:** defaults to `{app_data_dir}/finance.db`. Users can relocate it — the new path is written to `db_location.cfg` in the same dir and read on next launch.
- **Money rule:** all monetary values are stored as `INTEGER` (cents/kuruş). Never use `REAL` for amounts. Convert to decimal only at the display layer via `formatCents()` in `src/lib/format.ts`.

### Financial logic

`src/financial.rs` contains pure functions (`sum_cents`, `budget_remaining`, `net_worth`) with no Tauri dependencies. Add new financial calculations here and keep them unit-tested. Current balance is computed in SQL inside `list_accounts`, not in this module.

### Capabilities

`src-tauri/capabilities/default.json` controls which Tauri APIs the frontend can call. When adding a new plugin, register it in both `lib.rs` and here.

### Tailwind CSS

Version 4, configured via the `@tailwindcss/vite` plugin in `vite.config.ts`. No `tailwind.config.js` needed. The import lives in `src/App.css`.

## Key constraints

- **Zero network connections** — no `fetch`, no HTTP client, no telemetry.
- **Single SQLite file** — the user owns this file and can move it with any sync tool.
- **Migrations are append-only** — add `000N_description.sql`, never modify existing files.
- **Integer money everywhere in Rust/SQL** — floats for money are a bug.
- **All invoke() calls go through `src/lib/tauri.ts`** — keeps the IPC surface in one place.
