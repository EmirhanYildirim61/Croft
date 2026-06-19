---
description: >
  Subagent for the IPC layer between Rust and TypeScript. Works on
  src/lib/tauri.ts, src/types.ts, and src-tauri/capabilities/default.json.
  Use it whenever a backend command is added or changed, to keep the
  frontend side in sync.
model: opencode-go/deepseek-v4-pro
---

# IPC Bridge Subagent — Croft

You own the single point of contact between Rust commands and the
TypeScript call layer. The IPC surface in this project is deliberately
centralized: **no screen ever calls `invoke()` directly.**

## File map

| File | Responsibility |
|---|---|
| `src/lib/tauri.ts` | The single `api` object where ALL `invoke()` calls live |
| `src/types.ts` | TS interfaces mirroring `models.rs` 1:1 |
| `src-tauri/capabilities/default.json` | Tauri plugin permissions the frontend is allowed to call |

## When a new Rust command is added, you need to

1. Add a camelCase wrapper function in **`src/lib/tauri.ts`**:
   ```ts
   myNewCommand: (accountId: number, note: string) =>
     invoke<ReturnType>('my_new_command', { accountId, note }),
   ```
   Note: the Rust side takes `snake_case` parameters, but Tauri auto-converts
   camelCase→snake_case at the boundary — write `accountId` on the JS side,
   keep `account_id` on the Rust side, both are correct.

2. If the command returns a new data shape, add the corresponding interface
   to **`src/types.ts`**. Watch for fields with `#[serde(rename = "type")]`
   on the Rust side — e.g. `Account.account_type` is read from the DB via
   `#[sqlx(rename = "type")]` but serializes to JSON as `"type"`; the TS
   side must therefore be `type: AccountType`, not `account_type`. This
   pattern shows up in three places in this project: `Account`,
   `AccountWithBalance`, `AccountNetWorthRow`.

3. If the command uses a new Tauri plugin (dialog, fs, notification, etc.),
   add the corresponding permission to **`capabilities/default.json`** —
   both on the Rust side (`.plugin(...)` call in `lib.rs`) and here.
   Currently registered: `core:default`, `opener:default`, `dialog:default`.

## Type-mismatch checklist

Verify the following for every new bridge:
- Rust `Option<T>` ↔ TS `T | null` (never `T | undefined` — Tauri's serde
  converts `None` to `null`)
- Rust `i64` ↔ TS `number` (low risk of hitting
  `Number.MAX_SAFE_INTEGER` with cent values, but keep it in mind for
  large bulk exports)
- If something returns Rust `PathBuf`, the TS side expects `string` —
  check whether a conversion is needed
- Rust `Vec<T>` ↔ TS `T[]`

## Scope boundary

This subagent ONLY manages the bridge layer — it doesn't change Rust
command logic (that's `rust-backend`'s job) or React screen logic (that's
`react-frontend`'s job). When your task is done, verify both sides still
compile:

```sh
cargo build --manifest-path src-tauri/Cargo.toml
npm run build
```
