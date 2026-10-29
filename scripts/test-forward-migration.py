#!/usr/bin/env python3
"""Exercise the candidate forward migration against a disposable SQLite fixture.

This is a schema/logic regression test, NOT a substitute for restoring and testing
an actual Cloudflare D1 export before any production migration.
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
  id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, sort_order INTEGER NOT NULL,
  title_en TEXT NOT NULL, title_hi TEXT NOT NULL,
  description_en TEXT NOT NULL DEFAULT '', description_hi TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE projects (
  id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE,
  category_slug TEXT NOT NULL REFERENCES categories(slug),
  cover_image_url TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'published',
  is_featured INTEGER NOT NULL DEFAULT 0, location TEXT NOT NULL DEFAULT '',
  project_date TEXT, demo_label TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE project_translations (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  locale TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (project_id, locale)
);
CREATE TABLE project_media (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL, preview_url TEXT NOT NULL DEFAULT '',
  original_key TEXT NOT NULL DEFAULT '', alt_en TEXT NOT NULL DEFAULT '',
  alt_hi TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0,
  is_public INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE enquiries (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '', service TEXT NOT NULL,
  preferred_date TEXT, budget_range TEXT, message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_enquiries_status_created ON enquiries(status, created_at DESC);
CREATE TABLE admin_users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL, email_verified_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), last_login_at TEXT
);
CREATE TABLE admin_sessions (
  id TEXT PRIMARY KEY, admin_user_id TEXT NOT NULL REFERENCES admin_users(id),
  token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY, actor_id TEXT, action TEXT NOT NULL,
  target_type TEXT, target_id TEXT, details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


# Compare pre-existing columns and values, not only row counts. The enquiries
# table gains consent and relaxes email NOT NULL, so its legacy columns are
# checked explicitly while the new column is tested separately.
PRESERVATION_QUERIES = {
    "categories": "SELECT id, slug, sort_order, title_en, title_hi, description_en, description_hi, created_at FROM categories ORDER BY id",
    "projects": "SELECT id, slug, category_slug, cover_image_url, status, is_featured, location, project_date, demo_label, created_at, updated_at FROM projects ORDER BY id",
    "project_translations": "SELECT project_id, locale, title, description FROM project_translations ORDER BY project_id, locale",
    "project_media": "SELECT id, project_id, media_type, preview_url, original_key, alt_en, alt_hi, sort_order, is_public, created_at FROM project_media ORDER BY id",
    "enquiries": "SELECT id, name, email, phone, service, preferred_date, budget_range, message, status, created_at, updated_at FROM enquiries ORDER BY id",
    "admin_users": "SELECT id, email, password_hash, password_salt, email_verified_at, is_active, created_at, last_login_at FROM admin_users ORDER BY id",
    "admin_sessions": "SELECT id, admin_user_id, token_hash, expires_at, created_at FROM admin_sessions ORDER BY id",
    "audit_logs": "SELECT id, actor_id, action, target_type, target_id, details_json, created_at FROM audit_logs ORDER BY id",
}


class ForwardMigrationFixtureTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.db = sqlite3.connect(Path(self.tmp.name) / "fixture.sqlite")
        self.db.row_factory = sqlite3.Row
        self.db.executescript(BASELINE_SCHEMA)
        self.db.executescript("""
          INSERT INTO categories (id, slug, sort_order, title_en, title_hi)
          VALUES ('wedding-id', 'wedding', 1, 'Wedding', 'शादी');
          INSERT INTO projects (id, slug, category_slug, cover_image_url)
          VALUES ('project-1', 'sample-project', 'wedding', 'https://example.test/cover.jpg');
          INSERT INTO project_translations (project_id, locale, title, description)
          VALUES ('project-1', 'en', 'Sample', 'Description'),
                 ('project-1', 'hi', 'नमूना', 'विवरण');
          INSERT INTO project_media (id, project_id, media_type, preview_url, original_key, alt_en, alt_hi, is_public)
          VALUES ('media-1', 'project-1', 'image', 'https://example.test/photo.jpg', 'legacy/key.jpg', 'Sample photo', 'नमूना फोटो', 1);
          INSERT INTO enquiries (id, name, email, phone, service, preferred_date, budget_range, message, status)
          VALUES ('enquiry-1', 'Test Client', 'client@example.test', '9999999999', 'wedding', '2026-11-10', 'mid', 'Please call', 'read');
          INSERT INTO admin_users (id, email, password_hash, password_salt, email_verified_at, last_login_at)
          VALUES ('admin-1', 'owner@example.test', 'hash-placeholder', 'salt-placeholder', '2026-01-01', '2026-10-28');
          INSERT INTO admin_sessions (id, admin_user_id, token_hash, expires_at)
          VALUES ('session-1', 'admin-1', 'token-hash-placeholder', '2999-01-01 00:00:00');
          INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, details_json)
          VALUES ('audit-1', 'admin-1', 'fixture', 'project', 'project-1', '{"kept":true}');
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
            "migration must preserve existing row values, not only row counts",
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
            row["name"] for row in self.db.execute("PRAGMA index_list(enquiries)")
        }
        self.assertIn("idx_enquiries_status_created", indexes, "migration must recreate the enquiry index")

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
