PRAGMA foreign_keys = ON;

-- Keep the baseline compatible with the existing Golden Films D1 schema.
-- All table creation is idempotent; existing category/project/enquiry records are preserved.
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  title_en TEXT NOT NULL,
  title_hi TEXT NOT NULL,
  description_en TEXT NOT NULL DEFAULT '',
  description_hi TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
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

CREATE TABLE IF NOT EXISTS enquiries (
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

CREATE INDEX IF NOT EXISTS idx_projects_category
  ON projects(category_slug, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_status_featured
  ON projects(status, is_featured, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_status_created
  ON enquiries(status, created_at DESC);

-- Match the existing category identifiers and slugs to avoid duplicate category rows.
INSERT OR IGNORE INTO categories (id, slug, title_en, title_hi, sort_order) VALUES
  ('cat-wedding', 'wedding-photography', 'Wedding Photography', 'वेडिंग फोटोग्राफी', 1),
  ('cat-prewedding', 'pre-wedding-photography', 'Pre-Wedding Photography', 'प्री-वेडिंग फोटोग्राफी', 2),
  ('cat-portrait', 'portrait-personal-photography', 'Portrait & Personal Photography', 'पोर्ट्रेट और पर्सनल फोटोग्राफी', 3),
  ('cat-fashion', 'fashion-model-photography', 'Fashion & Model Photography', 'फैशन और मॉडल फोटोग्राफी', 4),
  ('cat-event-photo', 'event-photography', 'Event Photography', 'इवेंट फोटोग्राफी', 5),
  ('cat-product', 'product-photography', 'Product Photography', 'प्रोडक्ट फोटोग्राफी', 6),
  ('cat-commercial', 'commercial-photography', 'Commercial Photography', 'कमर्शियल फोटोग्राफी', 7),
  ('cat-wedding-film', 'cinematic-wedding-films', 'Cinematic Wedding Films', 'सिनेमैटिक वेडिंग फिल्म्स', 8),
  ('cat-event-video', 'event-videography', 'Event Videography', 'इवेंट वीडियोग्राफी', 9),
  ('cat-promo', 'promotional-commercial-videos', 'Promotional & Commercial Videos', 'प्रमोशनल और कमर्शियल वीडियो', 10),
  ('cat-photo-edit', 'photo-editing-retouching', 'Photo Editing & Retouching', 'फोटो एडिटिंग और रीटचिंग', 11),
  ('cat-video-edit', 'video-editing-color-grading', 'Video Editing & Color Grading', 'वीडियो एडिटिंग और कलर ग्रेडिंग', 12),
  ('cat-reels', 'reels-short-form-videos', 'Reels & Short-Form Videos', 'रील्स और शॉर्ट वीडियो', 13),
  ('cat-other', 'other-projects', 'Other Projects', 'अन्य प्रोजेक्ट', 14);
