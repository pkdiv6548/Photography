-- Typed, revisioned content storage for the admin CMS. Additive only; do not apply to production until the verified backup/schema migration gate is complete.
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
