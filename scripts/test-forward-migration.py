#!/usr/bin/env python3
"""Exercise the candidate forward migration against a disposable SQLite fixture.

This fixture mirrors the live D1 catalog schema captured by read-only queries on
2026-10-29 and uses synthetic rows. It is NOT a substitute for restoring and
testing an actual Cloudflare D1 export before any production migration.
"""
from pathlib import Path
import sqlite3
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "docs" / "forward-migrations" / "2026-10-29-live-schema-forward.sql"


BASELINE_SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  title_en TEXT NOT NULL,
  title_hi TEXT NOT NULL,
  description_en TEXT NOT NULL DEFAULT '',
  description_hi TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category_slug TEXT NOT NULL REFERENCES categories(slug),
  cover_image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0,1)),
  location TEXT,
  project_date TEXT,
  demo_label TEXT NOT NULL DEFAULT 'Demo Portfolio',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE project_translations (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('en','hi')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (project_id, locale)
);
CREATE TABLE project_media (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image','video')),
  preview_url TEXT NOT NULL,
  original_key TEXT,
  alt_en TEXT NOT NULL DEFAULT '',
  alt_hi TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE enquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL,
  preferred_date TEXT,
  budget_range TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_enquiries_status_created ON enquiries(status, created_at DESC);
CREATE TABLE enquiry_rate_limits (
  ip_hash TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (ip_hash, window_start)
);
CREATE INDEX idx_enquiry_rate_limits_window ON enquiry_rate_limits(window_start);
CREATE TABLE admin_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  email_verified_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);
CREATE TABLE admin_sessions (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT
);
CREATE INDEX idx_sessions_expiry ON admin_sessions(expires_at);
CREATE TABLE admin_setup (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE auth_rate_limits (
  rate_key TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1
);
-- Verified live catalog definition: no actor_id/details_json; target fields
-- default to empty strings and admin_user_id references admin_users.
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT '',
  target_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE site_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_media_project_sort ON project_media(project_id, sort_order);
CREATE INDEX idx_projects_category ON projects(category_slug, status, updated_at DESC);
CREATE INDEX idx_projects_status_featured ON projects(status, is_featured, updated_at DESC);
"""


# Capture all legacy values. The only changed legacy table is enquiries, where
# consent is added and email becomes nullable; all original columns must survive.
PRESERVATION_QUERIES = {
    "categories": "SELECT id, slug, sort_order, title_en, title_hi, description_en, description_hi, created_at FROM categories ORDER BY id",
    "projects": "SELECT id, slug, category_slug, cover_image_url, status, is_featured, location, project_date, demo_label, created_at, updated_at FROM projects ORDER BY id",
    "project_translations": "SELECT project_id, locale, title, description FROM project_translations ORDER BY project_id, locale",
    "project_media": "SELECT id, project_id, media_type, preview_url, original_key, alt_en, alt_hi, sort_order, is_public, created_at FROM project_media ORDER BY id",
    "enquiries": "SELECT id, name, email, phone, service, preferred_date, budget_range, message, status, created_at, updated_at FROM enquiries ORDER BY id",
    "enquiry_rate_limits": "SELECT ip_hash, window_start, request_count FROM enquiry_rate_limits ORDER BY ip_hash, window_start",
    "admin_users": "SELECT id, email, password_hash, password_salt, email_verified_at, is_active, created_at, last_login_at FROM admin_users ORDER BY id",
    "admin_sessions": "SELECT id, admin_user_id, token_hash, expires_at, created_at, last_seen_at FROM admin_sessions ORDER BY id",
    "admin_setup": "SELECT id, completed_at, created_at FROM admin_setup ORDER BY id",
    "auth_rate_limits": "SELECT rate_key, window_started_at, request_count FROM auth_rate_limits ORDER BY rate_key",
    "audit_logs": "SELECT id, admin_user_id, action, target_type, target_id, created_at FROM audit_logs ORDER BY id",
    "site_settings": "SELECT setting_key, setting_value, updated_at FROM site_settings ORDER BY setting_key",
}

EXPECTED_EXISTING_INDEXES = {
    "idx_enquiries_status_created",
    "idx_enquiry_rate_limits_window",
    "idx_media_project_sort",
    "idx_projects_category",
    "idx_projects_status_featured",
    "idx_sessions_expiry",
}


class ForwardMigrationFixtureTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.db = sqlite3.connect(Path(self.tmp.name) / "fixture.sqlite")
        self.db.row_factory = sqlite3.Row
        self.db.executescript(BASELINE_SCHEMA)
        self.db.executescript("""
          INSERT INTO categories (id, slug, sort_order, title_en, title_hi, description_en, description_hi)
          VALUES ('wedding-id', 'wedding', 1, 'Wedding', 'शादी', 'Wedding work', 'शादी का काम');
          INSERT INTO projects (id, slug, category_slug, cover_image_url, status, is_featured, location, project_date, demo_label)
          VALUES ('project-1', 'sample-project', 'wedding', 'https://example.test/cover.jpg', 'published', 1, 'Jaipur', '2026-10-20', 'Sample only');
          INSERT INTO project_translations (project_id, locale, title, description)
          VALUES ('project-1', 'en', 'Sample', 'Description'),
                 ('project-1', 'hi', 'नमूना', 'विवरण');
          INSERT INTO project_media (id, project_id, media_type, preview_url, original_key, alt_en, alt_hi, sort_order, is_public)
          VALUES ('media-1', 'project-1', 'image', 'https://example.test/photo.jpg', 'legacy/key.jpg', 'Sample photo', 'नमूना फोटो', 2, 1);
          INSERT INTO enquiries (id, name, email, phone, service, preferred_date, budget_range, message, status)
          VALUES ('enquiry-1', 'Test Client', 'client@example.test', '9999999999', 'wedding', '2026-11-10', 'mid', 'Please call', 'read');
          INSERT INTO enquiry_rate_limits (ip_hash, window_start, request_count)
          VALUES ('test-ip-hash', 1790000000, 2);
          INSERT INTO admin_users (id, email, password_hash, password_salt, email_verified_at, is_active, last_login_at)
          VALUES ('admin-1', 'owner@example.test', 'hash-placeholder', 'salt-placeholder', '2026-01-01', 1, '2026-10-28');
          INSERT INTO admin_sessions (id, admin_user_id, token_hash, expires_at, last_seen_at)
          VALUES ('session-1', 'admin-1', 'token-hash-placeholder', '2999-01-01 00:00:00', '2026-10-29 00:00:00');
          INSERT INTO admin_setup (id, completed_at)
          VALUES (1, NULL);
          INSERT INTO auth_rate_limits (rate_key, window_started_at, request_count)
          VALUES ('login:test-ip-hash', 1790000000, 1);
          INSERT INTO audit_logs (id, admin_user_id, action, target_type, target_id)
          VALUES ('audit-1', 'admin-1', 'fixture', 'project', 'project-1');
          INSERT INTO site_settings (setting_key, setting_value)
          VALUES ('locale_default', 'en');
        """)
        self.db.commit()

    def test_forward_migration_preserves_data_and_supports_contract(self):
        before = {
            table: [tuple(row) for row in self.db.execute(query)]
            for table, query in PRESERVATION_QUERIES.items()
        }

        self.db.executescript(MIGRATION.read_text(encoding="utf-8"))

        after = {
            table: [tuple(row) for row in self.db.execute(query)]
            for table, query in PRESERVATION_QUERIES.items()
        }
        self.assertEqual(
            after,
            before,
            "migration must preserve every captured legacy column value, not only row counts",
        )

        columns = {row["name"]: row for row in self.db.execute("PRAGMA table_info(enquiries)")}
        self.assertEqual(columns["email"]["notnull"], 0, "email must allow phone-only enquiries")
        self.assertIn("consent", columns)
        self.assertEqual(columns["consent"]["notnull"], 1)
        self.assertEqual(
            self.db.execute("SELECT COUNT(*) FROM enquiries WHERE consent != 0 OR consent IS NULL").fetchone()[0],
            0,
            "all historical enquiries must receive consent=0",
        )

        indexes = {
            row["name"]
            for row in self.db.execute("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_autoindex_%'")
        }
        self.assertTrue(EXPECTED_EXISTING_INDEXES.issubset(indexes), "migration must preserve all existing explicit indexes")

        admin_columns = {row["name"]: row for row in self.db.execute("PRAGMA table_info(admin_users)")}
        self.assertIn("role", admin_columns)
        self.assertEqual(
            self.db.execute("SELECT role FROM admin_users WHERE id='admin-1'").fetchone()[0],
            "owner",
        )

        table_names = {
            row[0] for row in self.db.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
        }
        self.assertTrue({"site_content", "site_content_revisions"}.issubset(table_names))

        content_columns = {
            row["name"] for row in self.db.execute("PRAGMA table_info(site_content)")
        }
        self.assertTrue(
            {"page_slug", "draft_json", "published_json", "status", "updated_by", "updated_at", "published_at"}.issubset(content_columns),
            "site_content must expose the columns used by the Worker CMS contract",
        )
        revision_columns = {
            row["name"] for row in self.db.execute("PRAGMA table_info(site_content_revisions)")
        }
        self.assertTrue(
            {"id", "page_slug", "content_json", "revision_status", "changed_by", "created_at"}.issubset(revision_columns),
            "site_content_revisions must expose the columns used by the Worker CMS contract",
        )
        cms_indexes = {
            row["name"] for row in self.db.execute(
                "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_autoindex_%'"
            )
        }
        self.assertIn("idx_site_content_revisions_page_created", cms_indexes)

        # Verify the new constraints, not only the resulting column names.
        self.db.execute(
            "INSERT INTO site_content (page_slug, draft_json, published_json, status) "
            "VALUES ('home', '{}', '{}', 'draft')"
        )
        self.db.execute(
            "INSERT INTO site_content_revisions "
            "(id, page_slug, content_json, revision_status) "
            "VALUES ('revision-1', 'home', '{}', 'draft')"
        )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO enquiries (id, name, email, phone, service, message, consent) "
                "VALUES ('bad-consent', 'Client', NULL, '9999999999', 'wedding', 'Call me', 2)"
            )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO admin_users "
                "(id, email, password_hash, password_salt, role, is_active) "
                "VALUES ('bad-role', 'bad-role@example.test', 'hash', 'salt', 'superuser', 1)"
            )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO site_content (page_slug, draft_json, published_json, status) "
                "VALUES ('unknown-page', '{}', '{}', 'draft')"
            )
        self.assertEqual(
            list(self.db.execute("PRAGMA foreign_key_check")),
            [],
            "migration must not introduce foreign-key violations",
        )

        # Worker audit inserts omit target fields for some event types; the live
        # schema defaults must permit those inserts without requiring extra fields.
        self.db.execute(
            "INSERT INTO audit_logs (id, admin_user_id, action) VALUES (?, ?, ?)",
            ("audit-defaults", "admin-1", "login_failed"),
        )
        self.assertEqual(
            tuple(self.db.execute(
                "SELECT target_type, target_id FROM audit_logs WHERE id='audit-defaults'"
            ).fetchone()),
            ("", ""),
        )

        self.db.execute("""
          INSERT INTO enquiries (id, name, email, phone, service, message, consent)
          VALUES ('phone-only', 'Phone Client', NULL, '9999999999', 'wedding', 'Call me', 1)
        """)
        self.assertIsNone(
            self.db.execute("SELECT email FROM enquiries WHERE id='phone-only'").fetchone()[0],
        )
        self.assertEqual(
            self.db.execute("SELECT COUNT(*) FROM project_translations WHERE project_id='project-1'").fetchone()[0],
            2,
        )
        self.assertEqual(
            self.db.execute("SELECT category_slug FROM projects WHERE id='project-1'").fetchone()[0],
            "wedding",
        )
        self.assertEqual(list(self.db.execute("PRAGMA foreign_key_check")), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
