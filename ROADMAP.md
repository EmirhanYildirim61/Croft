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

- [ ] Create `accounts` table: `id`, `name`, `type` (bank/credit/cash/savings), `currency`, `initial_balance`, `created_at`
- [ ] Create `transactions` table: `id`, `account_id`, `date`, `amount_cents` (integer, never float), `payee`, `category_id`, `note`, `is_recurring`, `created_at`
- [ ] Create `categories` table: `id`, `name`, `parent_id` (nullable, for sub-categories), `color`
- [ ] Create `budgets` table: `id`, `category_id`, `month` (YYYY-MM), `amount_cents`
- [ ] Create `recurring_items` table: `id`, `account_id`, `category_id`, `amount_cents`, `frequency`, `next_due_date`, `label`
- [ ] Write SQLx migration files for each table (versioned, e.g. `0001_init.sql`)
- [ ] Seed default categories on first launch (Food, Transport, Housing, Health, Entertainment, etc.)

> ⚠️ **Critical:** Store ALL monetary values as integers in cents/kuruş. Never use floats for money. Only convert to decimal on display.

---

## 🦀 Phase 1B — Rust Backend Commands (Tauri IPC)

- [ ] `create_account(name, type, currency, initial_balance)`
- [ ] `list_accounts()` → returns all accounts with current balance
- [ ] `delete_account(id)`
- [ ] `add_transaction(account_id, date, amount_cents, payee, category_id, note)`
- [ ] `list_transactions(account_id?, month?, category_id?)` → filterable
- [ ] `update_transaction(id, fields...)`
- [ ] `delete_transaction(id)`
- [ ] `list_categories()`
- [ ] `add_category(name, parent_id?, color)`
- [ ] `set_budget(category_id, month, amount_cents)`
- [ ] `get_budget_summary(month)` → budgeted vs. spent per category
- [ ] `add_recurring_item(label, account_id, category_id, amount_cents, frequency, next_due_date)`
- [ ] `list_recurring_items()`
- [ ] `generate_due_recurring_transactions()` → call on app start
- [ ] `get_net_worth_history()` → total balance across all accounts over time
- [ ] `export_to_csv(path)` → all transactions
- [ ] `export_to_json(path)` → all data
- [ ] `import_csv(path)` → parse bank export, return preview rows
- [ ] `confirm_csv_import(rows_with_categories)` → save after user maps categories

---

## 🎨 Phase 1C — Frontend UI (React + TypeScript)

### App Shell
- [ ] Sidebar navigation: Accounts, Transactions, Budget, Reports, Settings
- [ ] Top bar: current month selector, net worth display
- [ ] Empty state screens for first-time users (no accounts yet)

### Accounts Screen
- [ ] List all accounts with current balance
- [ ] "Add Account" modal: name, type, currency, starting balance
- [ ] Click account → filtered transaction list

### Transactions Screen
- [ ] Transaction list with date, payee, category, amount
- [ ] "Add Transaction" form: date picker, amount, payee, category dropdown, note
- [ ] Inline edit and delete
- [ ] Filter bar: by account, month, category, search text

### Budget Screen
- [ ] Monthly budget grid: category | budgeted | spent | remaining
- [ ] Click category amount to edit budget inline
- [ ] Color indicator: green (under budget), amber (>80%), red (over budget)

### Reports Screen
- [ ] Pie/donut chart: spending by category for selected month (use Recharts)
- [ ] Line chart: total spending over the last 6 months
- [ ] Net worth over time line chart

### CSV Import Screen
- [ ] File picker for CSV upload
- [ ] Preview table showing parsed rows
- [ ] Category mapping UI: auto-suggest + user override per row
- [ ] Confirm import button

### Settings Screen
- [ ] Database file location: show current path, "Move…" button
- [ ] Manage categories: add, rename, reorder, delete
- [ ] Manage recurring items: list, add, edit, delete
- [ ] Export all data (CSV / JSON)
- [ ] Currency display format

---

## ✅ Phase 1D — Quality & Polish

- [ ] All currency display uses locale-aware formatter (never raw float)
- [ ] Form validation: required fields, positive amounts, valid dates
- [ ] Keyboard shortcuts: `N` = new transaction, `Esc` = close modal
- [ ] Loading states for all async Tauri commands
- [ ] Error toast notifications for failed operations
- [ ] Confirm dialog for all destructive actions (delete transaction, delete account)
- [ ] Responsive layout (minimum 900px wide desktop)
- [ ] Unit tests for all financial calculation functions (sum, budget diff, net worth)
- [ ] Integration tests for CSV import parser edge cases

---

## 🚀 Phase 2 — Community Feedback Iteration (Weeks 7–12)

- [ ] **Data migration tools**
  - [ ] Import YNAB export CSV format
  - [ ] Import GnuCash QIF format
- [ ] **Recurring items UI improvements**
  - [ ] Reminder notification when a recurring item is due
  - [ ] Mark as paid / skip for this month
- [ ] **Advanced filtering & search**
  - [ ] Full-text search across payee and notes
  - [ ] Multi-category filter
  - [ ] Custom date range picker
- [ ] **Net worth screen**
  - [ ] Dedicated screen with account breakdown
  - [ ] Month-over-month delta
- [ ] **Customizable reports**
  - [ ] User-defined date ranges
  - [ ] Side-by-side month comparison

---

## 🌍 Phase 3 — Maturity & Growth (Week 13+)

- [ ] **Multi-currency support**
  - [ ] Store exchange rates locally (manual entry, no live API required)
  - [ ] Display all amounts in a chosen base currency
- [ ] **Subscription tracker module**
  - [ ] Dedicated panel listing all recurring subscriptions
  - [ ] Annual cost summary ("you're spending X/year on subscriptions")
- [ ] **Plugin / theme system** (if community demand warrants it)
- [ ] **Mobile app** (Tauri 2.0 iOS/Android — post-MVP)
- [ ] **Automatic backup reminder** (prompt every 30 days to back up SQLite file)

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
