-- FORWARD-ONLY migration for the existing golden-films-db schema.
-- DO NOT run against production until a verified D1 export has been restored to
-- a disposable database and this exact migration plus the verification queries pass.
-- Historical enquiries receive consent=0: do not infer consent from old records.
--
-- The live enquiries.email column is NOT NULL, but the current API permits phone-only
-- enquiries. SQLite cannot drop NOT NULL with ALTER COLUMN, so rebuild this table.
-- The live catalog audit found no foreign keys referencing enquiries and one explicit
-- status/created_at index; this migration recreates that index after the rebuild.

CREATE TABLE enquiries_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL,
  preferred_date TEXT,
  budget_range TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  consent INTEGER NOT NULL DEFAULT 0 CHECK (consent IN (0,1))
);

INSERT INTO enquiries_new (
  id, name, email, phone, service, preferred_date, budget_range,
  message, status, created_at, updated_at, consent
)
SELECT
  id, name, email, phone, service, preferred_date, budget_range,
  message, status, created_at, updated_at, 0
FROM enquiries;

DROP TABLE enquiries;
ALTER TABLE enquiries_new RENAME TO enquiries;
CREATE INDEX IF NOT EXISTS idx_enquiries_status_created
  ON enquiries(status, created_at DESC);

-- Least privilege: existing accounts become editors, not owners. Initial owner
-- setup explicitly inserts role='owner' only when no account exists.
ALTER TABLE admin_users
  ADD COLUMN role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor'));

CREATE TABLE IF NOT EXISTS site_content (
  page_slug TEXT PRIMARY KEY CHECK (page_slug IN ('home', 'about', 'services', 'showreel', 'contact')),
  draft_json TEXT NOT NULL DEFAULT '{}',
  published_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS site_content_revisions (
  id TEXT PRIMARY KEY,
  page_slug TEXT NOT NULL CHECK (page_slug IN ('home', 'about', 'services', 'showreel', 'contact')),
  content_json TEXT NOT NULL,
  revision_status TEXT NOT NULL CHECK (revision_status IN ('draft', 'published')),
  changed_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_site_content_revisions_page_created
  ON site_content_revisions(page_slug, created_at DESC);

-- Shared 100 MiB UTC-calendar-month media-upload quota ledger.
-- This records newly uploaded bytes; deleting media does not retroactively restore quota.
CREATE TABLE IF NOT EXISTS gf_monthly_media_usage (
  month_key TEXT PRIMARY KEY,
  used_bytes INTEGER NOT NULL DEFAULT 0 CHECK (used_bytes >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Post-migration verification:
-- PRAGMA table_info(enquiries) must show email with notnull=0 and consent INTEGER NOT NULL DEFAULT 0.
-- PRAGMA table_info(admin_users) must show role TEXT NOT NULL DEFAULT 'editor';
-- SELECT COUNT(*) FROM enquiries WHERE consent NOT IN (0,1) must return 0.
-- SELECT name FROM sqlite_master WHERE type='table' AND name IN ('site_content','site_content_revisions')
-- must return both tables.
-- Run scripts/verify-d1-migration.sql and scripts/audit-d1-schema.sql on the disposable copy.
-- GET /api/ready should return {"status":"ready","schema":"legacy-compatible"} only after
-- the Worker code is deployed and the Pages D1 binding is configured.
