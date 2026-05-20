-- Categories (defined before transactions so the FK can reference it)
CREATE TABLE IF NOT EXISTS categories (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    color     TEXT    NOT NULL DEFAULT '#6B7280'
);

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    type            TEXT    NOT NULL CHECK(type IN ('bank', 'credit', 'cash', 'savings')),
    currency        TEXT    NOT NULL DEFAULT 'USD',
    initial_balance INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Transactions (amount_cents is always INTEGER — never REAL)
CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id  INTEGER NOT NULL REFERENCES accounts(id)   ON DELETE CASCADE,
    date        TEXT    NOT NULL,
    amount_cents INTEGER NOT NULL,
    payee       TEXT    NOT NULL DEFAULT '',
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    note        TEXT    NOT NULL DEFAULT '',
    is_recurring INTEGER NOT NULL DEFAULT 0 CHECK(is_recurring IN (0, 1)),
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_account_id  ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date        ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);

-- Budgets (one row per category per month)
CREATE TABLE IF NOT EXISTS budgets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id  INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    month        TEXT    NOT NULL,           -- format: YYYY-MM
    amount_cents INTEGER NOT NULL DEFAULT 0,
    UNIQUE(category_id, month)
);

-- Recurring items
CREATE TABLE IF NOT EXISTS recurring_items (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id    INTEGER NOT NULL REFERENCES accounts(id)    ON DELETE CASCADE,
    category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    amount_cents  INTEGER NOT NULL,
    frequency     TEXT    NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    next_due_date TEXT    NOT NULL,
    label         TEXT    NOT NULL
);

-- Seed default categories (INSERT OR IGNORE so re-running the migration is safe)
INSERT OR IGNORE INTO categories (id, name, parent_id, color) VALUES
    (1,  'Food & Dining',  NULL, '#F59E0B'),
    (2,  'Transport',      NULL, '#3B82F6'),
    (3,  'Housing',        NULL, '#8B5CF6'),
    (4,  'Health',         NULL, '#10B981'),
    (5,  'Entertainment',  NULL, '#EF4444'),
    (6,  'Shopping',       NULL, '#F97316'),
    (7,  'Education',      NULL, '#06B6D4'),
    (8,  'Utilities',      NULL, '#6B7280'),
    (9,  'Savings',        NULL, '#22C55E'),
    (10, 'Income',         NULL, '#84CC16'),
    (11, 'Other',          NULL, '#A78BFA');
