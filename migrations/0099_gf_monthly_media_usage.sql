-- Additive quota ledger for Photography media uploads.
-- Safe to apply to the existing legacy D1 schema; does not alter existing tables or rows.
CREATE TABLE IF NOT EXISTS gf_monthly_media_usage (
  month_key TEXT PRIMARY KEY,
  used_bytes INTEGER NOT NULL DEFAULT 0 CHECK (used_bytes >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
