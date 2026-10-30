#!/usr/bin/env python3
"""Validate fresh migrations, Worker schema bridge, indexes, constraints, and relationships."""
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = sorted((ROOT / "migrations").glob("*.sql"))
BRIDGE = ROOT / "migrations" / "0006_worker_schema_compat.sql"

REQUIRED_COLUMNS = {
    "categories": {"id", "slug", "sort_order", "title_en", "title_hi"},
    "projects": {"id", "slug", "category_slug", "cover_image_url", "status", "is_featured", "project_date", "updated_at", "demo_label"},
    "project_translations": {"project_id", "locale", "title", "description"},
    "project_media": {"id", "project_id", "media_type", "preview_url", "original_key", "alt_en", "alt_hi", "sort_order", "is_public"},
    "enquiries": {"id", "name", "email", "phone", "service", "preferred_date", "budget_range", "message", "consent", "status", "created_at", "updated_at"},
    "enquiry_rate_limits": {"ip_hash", "window_start", "request_count"},
    "admin_users": {"id", "email", "password_hash", "password_salt", "role", "is_active"},
    "admin_sessions": {"id", "admin_user_id", "token_hash", "expires_at"},
    "admin_setup": {"id", "completed_at"},
    "auth_rate_limits": {"rate_key", "window_started_at", "request_count"},
    "audit_logs": {"id", "admin_user_id", "action", "target_type", "target_id", "created_at"},
    "site_content": {"page_slug", "draft_json", "published_json", "status", "updated_at"},
    "site_content_revisions": {"id", "page_slug", "content_json", "revision_status", "created_at"},
}

REQUIRED_INDEXES = {
    "idx_admin_sessions_expiry",
    "idx_audit_logs_created_at",
    "idx_enquiries_status_created",
    "idx_enquiry_rate_limits_window",
    "idx_media_project_order",
    "idx_project_media_project_order",
    "idx_project_translations_project_locale",
    "idx_projects_category_status",
    "idx_projects_public_order",
    "idx_site_content_revisions_page_created",
}

def expect_integrity_error(db, sql, message):
    db.execute("SAVEPOINT expected_constraint_failure")
    try:
        db.execute(sql)
    except sqlite3.IntegrityError:
        db.execute("ROLLBACK TO expected_constraint_failure")
        db.execute("RELEASE expected_constraint_failure")
        return
    db.execute("ROLLBACK TO expected_constraint_failure")
    db.execute("RELEASE expected_constraint_failure")
    raise AssertionError(message)

def main():
    if not MIGRATIONS or not BRIDGE.exists():
        raise AssertionError("Migration sequence or 0006 Worker schema bridge is missing")
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    for migration in MIGRATIONS:
        if migration.name == BRIDGE.name:
            continue
        db.executescript(migration.read_text(encoding="utf-8"))

    # Seed representative legacy rows using the schema before the compatibility migration.
    db.execute(
        "INSERT INTO projects (id, slug, category_id, cover_object_key, featured, status, event_date) "
        "VALUES ('project-test', 'project-test', 'wedding-photography', 'projects/test/cover.jpg', 1, 'published', '2026-10-30')"
    )
    db.execute(
        "INSERT INTO project_translations (project_id, language, title, description, alt_text) "
        "VALUES ('project-test', 'en', 'First title', 'First description', 'English alt'), "
        "('project-test', 'hi', 'पहला शीर्षक', 'पहला विवरण', 'हिंदी alt')"
    )
    db.execute(
        "INSERT INTO media (id, project_id, object_key, media_type, mime_type, size_bytes, is_public_preview) "
        "VALUES ('media-test', 'project-test', 'projects/test/photo.jpg', 'image', 'image/jpeg', 100, 1)"
    )
    db.commit()
    db.executescript(BRIDGE.read_text(encoding="utf-8"))

    for table, expected in REQUIRED_COLUMNS.items():
        actual = {row["name"] for row in db.execute(f"PRAGMA table_info({table})")}
        missing = expected - actual
        if missing:
            raise AssertionError(f"{table} missing Worker-required columns: {sorted(missing)}")

    indexes = {row["name"] for row in db.execute(
        "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"
    )}
    missing_indexes = REQUIRED_INDEXES - indexes
    if missing_indexes:
        raise AssertionError(f"Missing required indexes: {sorted(missing_indexes)}")

    # Confirm critical referential links exist in the schema.
    expected_foreign_keys = {
        ("projects", "category_id", "categories", "id"),
        ("project_translations", "project_id", "projects", "id"),
        ("media", "project_id", "projects", "id"),
        ("project_media", "project_id", "projects", "id"),
        ("admin_sessions", "admin_user_id", "admin_users", "id"),
        ("audit_logs", "admin_user_id", "admin_users", "id"),
        ("site_content", "updated_by", "admin_users", "id"),
        ("site_content_revisions", "changed_by", "admin_users", "id"),
    }
    actual_foreign_keys = set()
    for table in set(REQUIRED_COLUMNS) | {"media"}:
        for fk in db.execute(f"PRAGMA foreign_key_list({table})"):
            actual_foreign_keys.add((table, fk["from"], fk["table"], fk["to"]))
    missing_foreign_keys = expected_foreign_keys - actual_foreign_keys
    if missing_foreign_keys:
        raise AssertionError(f"Missing required foreign keys: {sorted(missing_foreign_keys)}")

    category = db.execute(
        "SELECT title_en, title_hi FROM categories WHERE slug='wedding-photography'"
    ).fetchone()
    assert category and category["title_en"] == "Wedding Photography", category
    assert category["title_hi"] == "शादी की फोटोग्राफी", category

    project = db.execute(
        "SELECT category_slug, cover_image_url, is_featured, project_date FROM projects WHERE id='project-test'"
    ).fetchone()
    assert project["category_slug"] == "wedding-photography", project
    assert project["cover_image_url"] == "/api/media/projects/test/cover.jpg", project
    assert project["is_featured"] == 1 and project["project_date"] == "2026-10-30", project

    title = db.execute(
        "SELECT title FROM project_translations WHERE project_id='project-test' AND locale='en'"
    ).fetchone()[0]
    assert title == "First title", title
    db.execute(
        "INSERT INTO project_translations (project_id, language, locale, title, description) "
        "VALUES ('project-test', 'en', 'en', 'Updated title', 'Updated description') "
        "ON CONFLICT(project_id, locale) DO UPDATE SET title=excluded.title, description=excluded.description"
    )
    title = db.execute(
        "SELECT title FROM project_translations WHERE project_id='project-test' AND locale='en'"
    ).fetchone()[0]
    assert title == "Updated title", title

    media = db.execute(
        "SELECT preview_url, original_key, alt_en, alt_hi, is_public FROM project_media WHERE id='media-test'"
    ).fetchone()
    assert media["preview_url"] == "/api/media/projects/test/photo.jpg", media
    assert media["original_key"] == "projects/test/photo.jpg" and media["is_public"] == 1, media
    assert media["alt_en"] == "English alt" and media["alt_hi"] == "हिंदी alt", media

    # Least privilege: omitted role must never promote a new account to owner.
    admin_role = next(row for row in db.execute("PRAGMA table_info(admin_users)") if row["name"] == "role")
    assert admin_role["dflt_value"] == "'editor'", admin_role["dflt_value"]
    db.execute(
        "INSERT INTO admin_users (id,email,password_hash,password_salt) "
        "VALUES ('least-privilege-test','least-privilege@example.test','hash','salt')"
    )
    assigned_role = db.execute(
        "SELECT role FROM admin_users WHERE id='least-privilege-test'"
    ).fetchone()[0]
    assert assigned_role == "editor", assigned_role

    # Exercise representative CHECK, UNIQUE, and FK constraints, without retaining bad rows.
    expect_integrity_error(
        db,
        "INSERT INTO admin_users (id,email,password_hash,password_salt,role) VALUES ('bad-role','bad@example.test','hash','salt','superadmin')",
        "admin_users.role CHECK constraint did not reject an unsupported role",
    )
    expect_integrity_error(
        db,
        "INSERT INTO project_media (id,project_id,media_type,preview_url) VALUES ('bad-media','project-test','document','/bad')",
        "project_media.media_type CHECK constraint did not reject an unsupported media type",
    )
    expect_integrity_error(
        db,
        "INSERT INTO project_media (id,project_id,media_type,preview_url) VALUES ('orphan-media','missing-project','image','/bad')",
        "project_media foreign key did not reject a missing project",
    )
    expect_integrity_error(
        db,
        "INSERT INTO site_content (page_slug) VALUES ('not-a-page')",
        "site_content.page_slug CHECK constraint did not reject an unsupported page",
    )

    fk_violations = list(db.execute("PRAGMA foreign_key_check"))
    if fk_violations:
        raise AssertionError(f"Foreign-key violations after migration: {[tuple(row) for row in fk_violations]}")

    # Compatibility migration should preserve source rows and create exactly one bridged media row.
    assert db.execute("SELECT COUNT(*) FROM projects WHERE id='project-test'").fetchone()[0] == 1
    assert db.execute("SELECT COUNT(*) FROM project_translations WHERE project_id='project-test'").fetchone()[0] == 2
    assert db.execute("SELECT COUNT(*) FROM media WHERE id='media-test'").fetchone()[0] == 1
    assert db.execute("SELECT COUNT(*) FROM project_media WHERE id='media-test'").fetchone()[0] == 1

    print(
        f"PASS: {len(MIGRATIONS)} migrations discovered; fresh schema, "
        f"{len(REQUIRED_INDEXES)} indexes, {len(expected_foreign_keys)} foreign keys, "
        "constraints, representative data migration, and referential integrity verified."
    )

if __name__ == "__main__":
    main()
