# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See [ROADMAP.md](ROADMAP.md) for the full feature plan and current phase status. Phases 1A–2, the Phase 3 features that are in scope (multi-currency, subscriptions tracker, backup reminder, localisation / first-run onboarding), and the Phase 2.5 QoL pass are complete. The only remaining items are out-of-scope Phase 3 ones (plugin/theme system, mobile) and the launch checklist.

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
  App.tsx                    Root: shared state (accounts, categories), screen routing,
                             first-run onboarding gate
  main.tsx                   ReactDOM bootstrap; imports `./lib/i18n` for side-effects
  types.ts                   Shared TypeScript interfaces mirroring Rust models
  lib/tauri.ts               Single API object — all invoke() calls live here
  lib/format.ts              Currency formatting and YYYY-MM date helpers
  lib/i18n.ts                i18next + react-i18next init; bundles all locales
  lib/languages.ts           Language registry (code, label, flag path, dir)
  locales/                   Translation JSON per locale (en, tr, es, fr, br, pt, de, ru,
                             ar, hi, ja, zh-CN, zh-TW)
  context/toast.tsx          useToast() hook for error/success notifications
  components/                Sidebar, TopBar, Modal (reusable shell components)
  screens/                   One file per navigation screen — includes OnboardingScreen
                             (first launch only)

public/flags/                Flag SVGs referenced by `lib/languages.ts`

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

### Localisation (i18n)

`src/lib/i18n.ts` initialises `i18next` + `react-i18next` with every locale JSON statically imported from `src/locales/`. Resources are bundled at build time — no runtime fetch. The active language is read from `localStorage.language` on init and falls back to `en`.

`src/lib/languages.ts` is the single source of truth for the language list (code, display label, flag path under `public/flags/`, optional `dir: 'rtl'`). Adding a language means: (1) drop `src/locales/<code>.json`, (2) drop `public/flags/<code>.svg`, (3) register it in `LANGUAGES`, (4) import + map it in `i18n.ts`. Document direction is auto-applied via the `languageChanged` listener in `i18n.ts`.

### First-run onboarding

`App.tsx` checks `localStorage.onboarding_complete` and renders `OnboardingScreen` until set. The onboarding screen lets the user pick a language, then calls the `rename_default_categories` Tauri command (exposed as `api.renameDefaultCategories` in `src/lib/tauri.ts`) to translate the seeded categories. After that it writes `onboarding_complete=1` and the main app mounts.

## Key constraints

- **Zero network connections** — no `fetch`, no HTTP client, no telemetry.
- **Single SQLite file** — the user owns this file and can move it with any sync tool.
- **Migrations are append-only** — add `000N_description.sql`, never modify existing files.
- **Integer money everywhere in Rust/SQL** — floats for money are a bug.
- **All invoke() calls go through `src/lib/tauri.ts`** — keeps the IPC surface in one place.

## Subagent delegation policy

This project's coding work is split between two systems: Claude Code
(this session) and a set of specialized OpenCode agents, reached
through the `opencode-bridge` subagent.

**Delegate to `opencode-bridge` — mandatory — for anything that adds or
changes meaningful functionality:**
- A new or modified Tauri command, migration, or `financial.rs` logic
- A new or modified screen, component, or piece of UI state
- A new or modified IPC bridge entry (`tauri.ts` / `types.ts` /
  `capabilities/default.json`)
- A new or changed i18n key, or any locale/language work
- A version bump, release, or CI/CD change

Do not implement these directly in this session, even if the change
looks small in isolation (e.g. "just one new command") — route it
through `opencode-bridge`, which will pick the matching OpenCode agent
(`rust-backend`, `react-frontend`, `ipc-bridge`, `i18n-locales`,
`release-manager`).

**Handle directly in this session — no delegation required — for
small, contained fixes:**
- Single-line bug fixes, typo corrections, comment/doc tweaks
- Anything that doesn't add a new command, screen, locale key, or
  change behavior — just corrects something already there

When unsure which bucket a task falls into, treat it as meaningful and
delegate. Under-delegating risks bypassing the project's "never
violate" rules (integer money, zero network, append-only migrations,
single IPC entry point, i18n completeness) that the OpenCode agents and
`code-reviewer` are specifically built to enforce.

**Mandatory review:** any work that went through `opencode-bridge` must
be followed by a `code-reviewer` pass (via `opencode-bridge`, agent
`code-reviewer`) before it's considered done or shown to the user as
finished — this is not optional and not left to judgment per task.
Work handled directly in this session under the "small fix" bucket
above does not require a `code-reviewer` pass.