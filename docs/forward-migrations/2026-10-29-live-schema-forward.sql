-- FORWARD-ONLY SQL for the existing golden-films-db legacy schema.
-- DO NOT run until a verified D1 export has been downloaded, restored to a disposable database,
-- and this SQL has been tested against that restored copy.
-- The enquiries.consent column is intentionally DEFAULT 0 for historical rows: do not infer consent.

ALTER TABLE enquiries
  ADD COLUMN consent INTEGER NOT NULL DEFAULT 0 CHECK (consent IN (0, 1));

ALTER TABLE admin_users
  ADD COLUMN role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'editor'));

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

-- Post-migration verification:
-- PRAGMA table_info(enquiries) must show consent INTEGER NOT NULL DEFAULT 0.
-- PRAGMA table_info(admin_users) must show role TEXT NOT NULL DEFAULT 'owner'.
-- SELECT COUNT(*) FROM enquiries WHERE consent NOT IN (0,1) must return 0.
-- SELECT name FROM sqlite_master WHERE type='table' AND name IN ('site_content','site_content_revisions')
-- must return both tables.
-- Then GET /api/ready should return {"status":"ready","schema":"legacy-compatible"} when Worker is deployed.
