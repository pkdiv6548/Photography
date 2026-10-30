-- Golden Films / Photography production D1 compatibility repair
-- MANUAL / REVIEW REQUIRED. Do not execute blindly.
-- Target: the currently inspected production database schema (2026-10-30).
-- This is additive: it does not DROP, rename, truncate, or rewrite existing rows.
-- Before execution: create and verify a full D1 export backup and review admin_users.
--
-- This script intentionally gives existing admin accounts the least-privilege role
-- 'editor'. After reviewing admin_users, promote ONLY the verified owner account to
-- role='owner' with a separately reviewed UPDATE. Do not grant owner to every account.
--
-- This script assumes the inspected production schema still matches the schema
-- recorded in the draft PR. Re-run PRAGMA table_info(...) first and stop if it differs.

ALTER TABLE admin_users
  ADD COLUMN role TEXT NOT NULL DEFAULT 'editor'
  CHECK (role IN ('owner', 'editor'));

-- Historical enquiries did not store consent. Default them to 0 (unknown/not recorded)
-- rather than falsely asserting that consent was given. New API submissions must supply it.
ALTER TABLE enquiries
  ADD COLUMN consent INTEGER NOT NULL DEFAULT 0
  CHECK (consent IN (0, 1));

CREATE TABLE IF NOT EXISTS site_content (
  page_slug TEXT PRIMARY KEY CHECK (page_slug IN ('home','about','services','showreel','contact')),
  draft_json TEXT NOT NULL DEFAULT '{}',
  published_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS site_content_revisions (
  id TEXT PRIMARY KEY,
  page_slug TEXT NOT NULL CHECK (page_slug IN ('home','about','services','showreel','contact')),
  content_json TEXT NOT NULL,
  revision_status TEXT NOT NULL CHECK (revision_status IN ('draft','published')),
  changed_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gf_monthly_media_usage (
  month_key TEXT PRIMARY KEY,
  used_bytes INTEGER NOT NULL DEFAULT 0 CHECK (used_bytes >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- POST-REPAIR VERIFICATION (run separately after the changes):
-- PRAGMA table_info(admin_users);
-- PRAGMA table_info(enquiries);
-- PRAGMA table_info(site_content);
-- PRAGMA table_info(site_content_revisions);
-- PRAGMA table_info(gf_monthly_media_usage);
-- SELECT count(*) AS admin_count FROM admin_users;
-- SELECT count(*) AS enquiry_count FROM enquiries;
-- SELECT count(*) AS project_count FROM projects;
-- Then verify /api/ready and exercise login, content editing, enquiry submission and media routes.
