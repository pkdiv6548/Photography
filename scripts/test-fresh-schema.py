#!/usr/bin/env python3
"""Validate fresh migrations and the Worker-facing schema bridge with SQLite."""
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

    print(f"PASS: {len(MIGRATIONS)} migrations discovered; fresh baseline plus 0006 bridge verified.")

if __name__ == "__main__":
    main()
