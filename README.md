# Finance App

A free, open-source, server-less desktop budget tracker. Track accounts, transactions, and budgets entirely on your own machine — no accounts, no subscriptions, no cloud.

> **Downloads:** *(coming soon — check [Releases](../../releases) once v1.0 ships)*

---

## Features

- Track multiple accounts (bank, credit, cash, savings)
- Categorised transactions with monthly budgets
- Reports: spending by category, net worth over time
- CSV import from your bank export
- Recurring items tracking

## No Network Connections

This app makes **zero outbound network connections**. There is no telemetry, no analytics, no update checks, and no sync server. Your financial data stays on your device. The SQLite database is a single file you control — back it up with Dropbox, iCloud, Syncthing, or anything else.

## Tech Stack

- [Tauri 2.0](https://tauri.app/) — native shell, IPC bridge
- React + TypeScript — UI
- Tailwind CSS — styling
- SQLx + SQLite — local database

## Building from Source

```sh
# Prerequisites: Rust (stable), Node.js 18+
npm install
npm run tauri dev       # development
npm run tauri build     # production bundle
```

## Support the Project

*(donation link coming soon)*

---

MIT License — see [LICENSE](LICENSE)
