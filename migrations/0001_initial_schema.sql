PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS category_translations (
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('en', 'hi')),
  name TEXT NOT NULL,
  PRIMARY KEY (category_id, language)
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category_id TEXT NOT NULL REFERENCES categories(id),
  cover_object_key TEXT NOT NULL,
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  event_date TEXT,
  location TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS project_translations (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('en', 'hi')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  alt_text TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (project_id, language)
);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  width INTEGER,
  height INTEGER,
  duration_seconds INTEGER,
  is_public_preview INTEGER NOT NULL DEFAULT 1 CHECK (is_public_preview IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS enquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  email TEXT NOT NULL CHECK (length(email) <= 254),
  phone TEXT,
  service TEXT NOT NULL,
  event_date TEXT,
  budget_range TEXT,
  message TEXT NOT NULL CHECK (length(message) BETWEEN 10 AND 3000),
  consent INTEGER NOT NULL CHECK (consent IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'closed', 'spam')),
  created_at TEXT NOT NULL,
  updated_at TEXT
);


CREATE INDEX IF NOT EXISTS idx_projects_public_order
  ON projects(status, featured DESC, sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_category_status
  ON projects(category_id, status);
CREATE INDEX IF NOT EXISTS idx_media_project_order
  ON media(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_enquiries_status_created
  ON enquiries(status, created_at DESC);

INSERT OR IGNORE INTO categories (id, slug, sort_order, is_published) VALUES
  ('wedding-photography', 'wedding-photography', 1, 1),
  ('pre-wedding-photography', 'pre-wedding-photography', 2, 1),
  ('portrait-personal-photography', 'portrait-personal-photography', 3, 1),
  ('fashion-model-photography', 'fashion-model-photography', 4, 1),
  ('event-photography', 'event-photography', 5, 1),
  ('product-photography', 'product-photography', 6, 1),
  ('commercial-photography', 'commercial-photography', 7, 1),
  ('cinematic-wedding-films', 'cinematic-wedding-films', 8, 1),
  ('event-videography', 'event-videography', 9, 1),
  ('promotional-commercial-videos', 'promotional-commercial-videos', 10, 1),
  ('photo-editing-retouching', 'photo-editing-retouching', 11, 1),
  ('video-editing-color-grading', 'video-editing-color-grading', 12, 1),
  ('reels-short-form-videos', 'reels-short-form-videos', 13, 1),
  ('other-projects', 'other-projects', 14, 1);

INSERT OR IGNORE INTO category_translations (category_id, language, name) VALUES
  ('wedding-photography', 'en', 'Wedding Photography'),
  ('wedding-photography', 'hi', 'शादी की फोटोग्राफी'),
  ('pre-wedding-photography', 'en', 'Pre-Wedding Photography'),
  ('pre-wedding-photography', 'hi', 'प्री-वेडिंग फोटोग्राफी'),
  ('portrait-personal-photography', 'en', 'Portrait & Personal Photography'),
  ('portrait-personal-photography', 'hi', 'पोर्ट्रेट और व्यक्तिगत फोटोग्राफी'),
  ('fashion-model-photography', 'en', 'Fashion & Model Photography'),
  ('fashion-model-photography', 'hi', 'फैशन और मॉडल फोटोग्राफी'),
  ('event-photography', 'en', 'Event Photography'),
  ('event-photography', 'hi', 'इवेंट फोटोग्राफी'),
  ('product-photography', 'en', 'Product Photography'),
  ('product-photography', 'hi', 'प्रोडक्ट फोटोग्राफी'),
  ('commercial-photography', 'en', 'Commercial Photography'),
  ('commercial-photography', 'hi', 'कमर्शियल फोटोग्राफी'),
  ('cinematic-wedding-films', 'en', 'Cinematic Wedding Films'),
  ('cinematic-wedding-films', 'hi', 'सिनेमैटिक वेडिंग फिल्में'),
  ('event-videography', 'en', 'Event Videography'),
  ('event-videography', 'hi', 'इवेंट वीडियोग्राफी'),
  ('promotional-commercial-videos', 'en', 'Promotional & Commercial Videos'),
  ('promotional-commercial-videos', 'hi', 'प्रमोशनल और कमर्शियल वीडियो'),
  ('photo-editing-retouching', 'en', 'Photo Editing & Retouching'),
  ('photo-editing-retouching', 'hi', 'फोटो एडिटिंग और रीटचिंग'),
  ('video-editing-color-grading', 'en', 'Video Editing & Color Grading'),
  ('video-editing-color-grading', 'hi', 'वीडियो एडिटिंग और कलर ग्रेडिंग'),
  ('reels-short-form-videos', 'en', 'Reels & Short-Form Videos'),
  ('reels-short-form-videos', 'hi', 'रील्स और छोटे वीडियो'),
  ('other-projects', 'en', 'Other Projects'),
  ('other-projects', 'hi', 'अन्य प्रोजेक्ट');