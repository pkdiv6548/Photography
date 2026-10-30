-- Reconcile the fresh-install schema with the SQL contract consumed by worker/index.ts.
-- Fresh-schema migration only. Do NOT apply to the existing production D1 database:
-- production has no trusted d1_migrations history and requires a separately reviewed,
-- forward-only migration tested on a verified disposable restore first.

ALTER TABLE categories ADD COLUMN title_en TEXT;
ALTER TABLE categories ADD COLUMN title_hi TEXT;

UPDATE categories
SET title_en = (
  SELECT name FROM category_translations
  WHERE category_id = categories.id AND language = 'en'
)
WHERE title_en IS NULL;

UPDATE categories
SET title_hi = (
  SELECT name FROM category_translations
  WHERE category_id = categories.id AND language = 'hi'
)
WHERE title_hi IS NULL;

ALTER TABLE projects ADD COLUMN category_slug TEXT;
ALTER TABLE projects ADD COLUMN cover_image_url TEXT;
ALTER TABLE projects ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1));
ALTER TABLE projects ADD COLUMN project_date TEXT;
ALTER TABLE projects ADD COLUMN demo_label TEXT NOT NULL DEFAULT '';

UPDATE projects
SET category_slug = COALESCE(category_slug, (SELECT slug FROM categories WHERE categories.id = projects.category_id)),
    cover_image_url = COALESCE(cover_image_url, '/api/media/' || cover_object_key),
    is_featured = featured,
    project_date = event_date;

ALTER TABLE project_translations ADD COLUMN locale TEXT;
UPDATE project_translations SET locale = language WHERE locale IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_translations_project_locale
  ON project_translations(project_id, locale);

ALTER TABLE enquiries ADD COLUMN preferred_date TEXT;
UPDATE enquiries SET preferred_date = event_date WHERE preferred_date IS NULL;

-- Worker-facing media contract. Keep the original legacy media table intact.
CREATE TABLE IF NOT EXISTS project_media (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  preview_url TEXT NOT NULL,
  original_key TEXT,
  alt_en TEXT NOT NULL DEFAULT '',
  alt_hi TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public IN (0, 1))
);

INSERT OR IGNORE INTO project_media
  (id, project_id, media_type, preview_url, original_key, alt_en, alt_hi, sort_order, is_public)
SELECT
  m.id,
  m.project_id,
  m.media_type,
  '/api/media/' || m.object_key,
  m.object_key,
  COALESCE((SELECT pt.alt_text FROM project_translations pt WHERE pt.project_id = m.project_id AND pt.language = 'en'), ''),
  COALESCE((SELECT pt.alt_text FROM project_translations pt WHERE pt.project_id = m.project_id AND pt.language = 'hi'), ''),
  m.sort_order,
  m.is_public_preview
FROM media m;

CREATE INDEX IF NOT EXISTS idx_project_media_project_order
  ON project_media(project_id, sort_order);

-- Explicitly backfill locale only from the existing language field; no content is fabricated.
