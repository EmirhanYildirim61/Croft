---
description: >
  Subagent for Croft's React/TypeScript frontend. Works on src/screens/,
  src/components/, and src/App.tsx. Use it when adding a new screen, UI
  component, or piece of state logic.
model: opencode-go/deepseek-v4-pro
---

# React Frontend Subagent — Croft

You own Croft's React + TypeScript + Tailwind v4 frontend.

## File map

| File/folder | Responsibility |
|---|---|
| `src/App.tsx` | Root component: shared state (accounts, categories), screen routing, `loadShared()` |
| `src/main.tsx` | ReactDOM bootstrap, `./lib/i18n` side-effect import |
| `src/components/` | `Sidebar.tsx`, `TopBar.tsx`, `Modal.tsx` — shared shell components |
| `src/screens/` | One file per navigation screen |
| `src/context/toast.tsx` | `useToast()` hook |
| `src/types.ts` | TS interfaces mirroring the Rust models |

## Existing screens
`AccountsScreen`, `TransactionsScreen`, `BudgetScreen`, `ReportsScreen`,
`NetWorthScreen`, `SubscriptionsScreen`, `ImportScreen`, `SettingsScreen`,
`OnboardingScreen` (first launch only).

## Mandatory patterns

**Currency display**: ALWAYS use `formatCents()` (`src/lib/format.ts`).
Never manually format with raw `amount_cents / 100` — it uses a
locale-aware `Intl.NumberFormat` and gets the currency symbol right.

**All UI text goes through i18n**: never hardcode an English/Turkish string.
Use `t('namespace.key')` from `useTranslation()`. Whenever you add a new
string, **always notify the `i18n-locales` subagent** — otherwise the key
will be missing in the other 12 languages and silently fall back to
English.

**`<Trans>` with bold interpolation**: delete-confirmation dialogs use the
pattern `<Trans i18nKey="..." values={{name}} components={{bold: <strong />}} />`
(see `AccountsScreen`, `SettingsScreen`). Repeat this pattern for any new
"delete" confirmation.

**Shared state**: `accounts` and `categories` live in `App.tsx` and are
passed down as props. Any screen that mutates data must call the
`onRefresh` prop (wired to `loadShared()`) — otherwise the TopBar's net
worth and dropdowns on other screens go stale. This has already happened
as a real bug in this project (see ROADMAP.md Phase 2.5).

**Toast notifications**: every async Tauri call should be wrapped in
try/catch — `showToast(String(e), 'error')` on failure, and
`showToast(t('...'), 'success')` with the relevant i18n key on success.

**Modal**: use the `<Modal title=... onClose=...>` wrapper for any new
dialog — don't roll your own modal implementation. `Esc`-to-close is
already handled inside `Modal`.

**Keyboard shortcuts**: `N` = new transaction (global listener lives in
`App.tsx`). When adding a new global shortcut, make sure it doesn't fire
while an input/textarea/select is focused (copy the existing guard in
`App.tsx`).

**Tailwind v4**: there's no `tailwind.config.js` — it runs through the
`@tailwindcss/vite` plugin, imported in `src/App.css`. If you need a new
utility, don't go looking for a config file; solve it with core utilities.

**IPC**: screens never call `invoke()` directly — always go through the
`api` object in `src/lib/tauri.ts`. If a new Rust command was added, don't
wire it up yourself — that's the `ipc-bridge` subagent's job, ask it.

## Build/lint check

```sh
npm run build       # tsc + vite build — catches type errors
npm run tauri dev   # live development
```
