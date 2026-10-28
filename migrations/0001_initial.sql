PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_hi TEXT NOT NULL,
  group_name TEXT NOT NULL CHECK (group_name IN ('photography', 'videography', 'editing')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_hi TEXT NOT NULL,
  description_en TEXT NOT NULL DEFAULT '',
  description_hi TEXT NOT NULL DEFAULT '',
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  group_name TEXT NOT NULL CHECK (group_name IN ('photography', 'videography', 'editing')),
  cover_media_key TEXT,
  is_demo INTEGER NOT NULL DEFAULT 1 CHECK (is_demo IN (0, 1)),
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_projects_published_sort ON projects(is_published, sort_order);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category_id);

CREATE TABLE IF NOT EXISTS enquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  service TEXT NOT NULL,
  event_date TEXT,
  budget_range TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'replied', 'archived')),
  source TEXT NOT NULL DEFAULT 'website',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_enquiries_status_created ON enquiries(status, created_at DESC);

INSERT OR IGNORE INTO categories (id, slug, title_en, title_hi, group_name, sort_order) VALUES
  ('wedding', 'wedding', 'Wedding Photography', 'वेडिंग फोटोग्राफी', 'photography', 1),
  ('pre-wedding', 'pre-wedding', 'Pre-Wedding Photography', 'प्री-वेडिंग फोटोग्राफी', 'photography', 2),
  ('portrait', 'portrait', 'Portrait & Personal Photography', 'पोर्ट्रेट और पर्सनल फोटोग्राफी', 'photography', 3),
  ('fashion', 'fashion', 'Fashion & Model Photography', 'फैशन और मॉडल फोटोग्राफी', 'photography', 4),
  ('events', 'events', 'Event Photography', 'इवेंट फोटोग्राफी', 'photography', 5),
  ('product', 'product', 'Product Photography', 'प्रोडक्ट फोटोग्राफी', 'photography', 6),
  ('commercial', 'commercial', 'Commercial Photography', 'कमर्शियल फोटोग्राफी', 'photography', 7),
  ('wedding-films', 'wedding-films', 'Cinematic Wedding Films', 'सिनेमैटिक वेडिंग फिल्म्स', 'videography', 8),
  ('event-video', 'event-video', 'Event Videography', 'इवेंट वीडियोग्राफी', 'videography', 9),
  ('brand-films', 'brand-films', 'Promotional & Commercial Videos', 'प्रमोशनल और कमर्शियल वीडियो', 'videography', 10),
  ('photo-editing', 'photo-editing', 'Photo Editing & Retouching', 'फोटो एडिटिंग और रीटचिंग', 'editing', 11),
  ('video-editing', 'video-editing', 'Video Editing & Color Grading', 'वीडियो एडिटिंग और कलर ग्रेडिंग', 'editing', 12),
  ('reels', 'reels', 'Reels & Short-Form Videos', 'रील्स और शॉर्ट वीडियो', 'videography', 13),
  ('other', 'other', 'Other Projects', 'अन्य प्रोजेक्ट्स', 'videography', 14);
