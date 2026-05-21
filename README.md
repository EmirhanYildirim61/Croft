# Croft

A free, open-source, server-less desktop budget tracker. Track accounts, transactions, and budgets entirely on your own machine — no accounts, no subscriptions, no cloud.

> **Downloads:** [v0.1.1 pre-release](https://github.com/EmirhanYildirim61/Croft/releases/tag/v0.1.1) — early preview, expect rough edges

---

## Features

- **Multi-account tracking** — bank, credit, cash, savings accounts with per-account currencies
- **Multi-currency support** — store exchange rates locally, view all balances in a chosen display currency
- **Categorised transactions** — full-text search, multi-category filter, custom date ranges
- **Monthly budgets** — budgeted vs. spent per category with colour-coded status indicators
- **Recurring items & subscriptions** — dedicated subscription panel, annual cost summary, due-date reminders, mark-as-paid / skip
- **Reports** — spending by category (donut chart), net worth over time (line + bar charts), side-by-side month comparison
- **CSV import** — generic bank exports plus YNAB and GnuCash QIF formats; debit/credit column merging; category auto-suggest
- **Export** — full data export to CSV or JSON
- **Net worth screen** — account breakdown with month-over-month delta
- **Automatic backup reminder** — prompts every 30 days to back up the SQLite file

## No Network Connections

This app makes **zero outbound network connections**. There is no telemetry, no analytics, no update checks, and no sync server. Your financial data stays on your device. The SQLite database is a single file you control — back it up with Dropbox, iCloud, Syncthing, or anything else.

## Tech Stack

- [Tauri 2.0](https://tauri.app/) — native shell, IPC bridge
- React + TypeScript — UI
- Tailwind CSS v4 — styling
- SQLx + SQLite — local database (WAL mode, integer-cent storage)

## Building from Source

```sh
# Prerequisites: Rust (stable toolchain), Node.js 18+
npm install
npm run tauri dev       # development (hot-reload)
npm run tauri build     # production bundle
```

## Support the Project

*(donation link coming soon)*

---

MIT License — see [LICENSE](LICENSE)
