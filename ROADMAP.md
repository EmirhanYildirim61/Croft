# Local-First Personal Finance App — Roadmap & To-Do List

> A free, open-source, server-less desktop budget tracker built with Tauri + React + SQLite.
> Work through each task one at a time. Check off items as you go.

---

## 🏗️ Phase 0 — Project Bootstrap (Claude Code)

> Start here. Get the skeleton up and running before writing any feature code.

- [x] Initialize Tauri 2.0 project (`cargo create-tauri-app`)
- [x] Set up React + TypeScript frontend inside the Tauri project
- [x] Configure Tailwind CSS (core utilities only)
- [x] Install and configure `sqlx` (Rust, async, compile-time checked queries)
- [x] Create the initial SQLite database file on first launch (store in user-chosen path)
- [x] Set up GitHub Actions CI: build for Windows, macOS, and Linux on every push
- [x] Add `README.md` with: project description, download link placeholder, "No network connections" section, donation link placeholder
- [x] Add `CONTRIBUTING.md` with setup instructions and "good first issue" guidance
- [x] Add `LICENSE` (MIT)

---

## 🗄️ Phase 1A — Database Schema

- [x] Create `accounts` table: `id`, `name`, `type` (bank/credit/cash/savings), `currency`, `initial_balance`, `created_at`
- [x] Create `transactions` table: `id`, `account_id`, `date`, `amount_cents` (integer, never float), `payee`, `category_id`, `note`, `is_recurring`, `created_at`
- [x] Create `categories` table: `id`, `name`, `parent_id` (nullable, for sub-categories), `color`
- [x] Create `budgets` table: `id`, `category_id`, `month` (YYYY-MM), `amount_cents`
- [x] Create `recurring_items` table: `id`, `account_id`, `category_id`, `amount_cents`, `frequency`, `next_due_date`, `label`
- [x] Write SQLx migration files for each table (versioned, e.g. `0001_init.sql`)
- [x] Seed default categories on first launch (Food, Transport, Housing, Health, Entertainment, etc.)

> ⚠️ **Critical:** Store ALL monetary values as integers in cents/kuruş. Never use floats for money. Only convert to decimal on display.

---

## 🦀 Phase 1B — Rust Backend Commands (Tauri IPC)

- [x] `create_account(name, type, currency, initial_balance)`
- [x] `list_accounts()` → returns all accounts with current balance
- [x] `delete_account(id)`
- [x] `add_transaction(account_id, date, amount_cents, payee, category_id, note)`
- [x] `list_transactions(account_id?, month?, category_id?)` → filterable
- [x] `update_transaction(id, fields...)`
- [x] `delete_transaction(id)`
- [x] `list_categories()`
- [x] `add_category(name, parent_id?, color)`
- [x] `set_budget(category_id, month, amount_cents)`
- [x] `get_budget_summary(month)` → budgeted vs. spent per category
- [x] `add_recurring_item(label, account_id, category_id, amount_cents, frequency, next_due_date)`
- [x] `list_recurring_items()`
- [x] `generate_due_recurring_transactions()` → call on app start
- [x] `get_net_worth_history()` → total balance across all accounts over time
- [x] `export_to_csv(path)` → all transactions
- [x] `export_to_json(path)` → all data
- [x] `import_csv(path)` → parse bank export, return preview rows
- [x] `confirm_csv_import(rows_with_categories)` → save after user maps categories

---

## 🎨 Phase 1C — Frontend UI (React + TypeScript)

### App Shell
- [x] Sidebar navigation: Accounts, Transactions, Budget, Reports, CSV Import, Settings
- [x] Top bar: current month selector, net worth display
- [x] Empty state screens for first-time users (no accounts yet)

### Accounts Screen
- [x] List all accounts with current balance
- [x] "Add Account" modal: name, type, currency, starting balance
- [x] Click account → filtered transaction list

### Transactions Screen
- [x] Transaction list with date, payee, category, amount
- [x] "Add Transaction" form: date picker, amount, payee, category dropdown, note
- [x] Inline edit and delete
- [x] Filter bar: by account, month, category, search text

### Budget Screen
- [x] Monthly budget grid: category | budgeted | spent | remaining
- [x] Click category amount to edit budget inline
- [x] Color indicator: green (under budget), amber (>80%), red (over budget)

### Reports Screen
- [x] Pie/donut chart: spending by category for selected month (use Recharts)
- [x] Line chart: net worth over the last 12 months
- [x] Bar chart: net worth trend over last 6 months

### CSV Import Screen
- [x] File picker for CSV upload
- [x] Preview table showing parsed rows
- [x] Category mapping UI: auto-suggest + user override per row
- [x] Confirm import button

### Settings Screen
- [x] Manage categories: add, with color picker and optional parent
- [x] Manage recurring items: list, add
- [x] Export all data (CSV / JSON)
- [x] Database file location: show current path, "Move…" button (Phase 1D)
- [x] Currency display format (Phase 1D)

---

## ✅ Phase 1D — Quality & Polish

- [x] All currency display uses locale-aware formatter (never raw float)
- [x] Form validation: required fields, positive amounts, valid dates
- [x] Keyboard shortcuts: `N` = new transaction, `Esc` = close modal
- [x] Loading states for all async Tauri commands
- [x] Error toast notifications for failed operations
- [x] Confirm dialog for all destructive actions (delete transaction, delete account)
- [x] Responsive layout (minimum 900px wide desktop)
- [x] Unit tests for all financial calculation functions (sum, budget diff, net worth)
- [x] Integration tests for CSV import parser edge cases

---

## 🚀 Phase 2 — Community Feedback Iteration (Weeks 7–12)

- [x] **Data migration tools**
  - [x] Import YNAB export CSV format
  - [x] Import GnuCash QIF format
- [x] **Recurring items UI improvements**
  - [x] Reminder notification when a recurring item is due
  - [x] Mark as paid / skip for this month
- [x] **Advanced filtering & search**
  - [x] Full-text search across payee and notes
  - [x] Multi-category filter
  - [x] Custom date range picker
- [x] **Net worth screen**
  - [x] Dedicated screen with account breakdown
  - [x] Month-over-month delta
- [x] **Customizable reports**
  - [x] User-defined date ranges
  - [x] Side-by-side month comparison

---

## 🌍 Phase 3 — Maturity & Growth (Week 13+)

- [x] **Multi-currency support**
  - [x] Store exchange rates locally (manual entry, no live API required)
  - [x] Display all amounts in a chosen base currency
- [x] **Subscription tracker module**
  - [x] Dedicated panel listing all recurring subscriptions
  - [x] Annual cost summary ("you're spending X/year on subscriptions")
- [ ] **Plugin / theme system** (if community demand warrants it)
- [ ] **Mobile app** (Tauri 2.0 iOS/Android — post-MVP)
- [x] **Automatic backup reminder** (prompt every 30 days to back up SQLite file)

---

## 📣 Launch Checklist

- [ ] GitHub Releases with signed binaries for Windows (`.msi`), macOS (`.dmg`), Linux (`.AppImage`)
- [ ] Screenshots in `README.md` (at least: Budget screen, Transactions screen, Reports screen)
- [ ] Donation link live (Buy Me a Coffee or Patreon) — visible in README header
- [ ] "Show HN" post drafted (include: problem, screenshot, download link, open source link)
- [ ] Reddit posts ready for: r/personalfinance, r/ynab, r/opensource, r/selfhosted
- [ ] Product Hunt listing prepared

---

## 🔑 Key Technical Constraints (never forget)

| Rule | Detail |
|------|--------|
| **Integer money** | Store cents/kuruş as `INTEGER`, never `REAL`. `0.1 + 0.2 ≠ 0.3` in floats. |
| **Zero network** | No outbound connections. No telemetry. Document this in README. |
| **Single SQLite file** | User controls where it lives. Works with any sync tool (Dropbox, iCloud, Syncthing). |
| **MIT license** | Users can fork if the project is ever abandoned. |
| **No server, ever** | If it requires a server to function, it's out of scope. |

---

*Derived from the project research report dated 17 May 2026.*
