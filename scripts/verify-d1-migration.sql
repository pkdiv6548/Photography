-- Disposable-copy migration verification for Golden Films D1.
-- Run ONLY against an isolated disposable database after applying a candidate
-- forward migration. These statements are read-only and do not modify data.
-- Run each statement separately; inspect every result before accepting a test.
-- This is not a production migration script or an approval to alter live D1.

-- A. Category identity and order must remain stable (current baseline: 14).
-- Expected: row_count=14, distinct_ids=14, distinct_slugs=14,
-- distinct_sort_orders=14. Any other value is a STOP.
SELECT
  COUNT(*) AS row_count,
  COUNT(DISTINCT id) AS distinct_ids,
  COUNT(DISTINCT slug) AS distinct_slugs,
  COUNT(DISTINCT sort_order) AS distinct_sort_orders
FROM categories;

-- B. No category ID/slug substitution: list mismatches for review.
-- Legacy IDs are intentionally allowed to differ from slugs; this query is
-- diagnostic. Compare the returned id+slug pairs with the pre-migration export.
SELECT id, slug, sort_order
FROM categories
ORDER BY sort_order, slug;

-- C. Exactly 28 category translations for the current 14-category baseline.
-- Expected: translation_rows=28, categories_with_two_locales=14,
-- categories_with_wrong_locale_count=0, categories_missing_locale=0.
SELECT
  SUM(locale_count) AS translation_rows,
  SUM(CASE WHEN locale_count = 2 AND has_en = 1 AND has_hi = 1 THEN 1 ELSE 0 END) AS categories_with_two_locales,
  SUM(CASE WHEN locale_count <> 2 OR has_en = 0 OR has_hi = 0 THEN 1 ELSE 0 END) AS categories_with_wrong_locale_count,
  SUM(CASE WHEN has_en = 0 OR has_hi = 0 THEN 1 ELSE 0 END) AS categories_missing_locale
FROM (
  SELECT
    c.id,
    COUNT(ct.category_id) AS locale_count,
    MAX(CASE WHEN ct.language = 'en' THEN 1 ELSE 0 END) AS has_en,
    MAX(CASE WHEN ct.language = 'hi' THEN 1 ELSE 0 END) AS has_hi
  FROM categories c
  LEFT JOIN category_translations ct ON ct.category_id = c.id
  GROUP BY c.id
);

-- D. List translations whose category_id does not point to the preserved
-- category primary key. Expected: zero rows.
SELECT ct.category_id, ct.language, ct.name
FROM category_translations ct
LEFT JOIN categories c ON c.id = ct.category_id
WHERE c.id IS NULL;

-- E. List duplicate locale rows per category. Expected: zero rows.
-- A primary key may already prevent duplicates; this also documents the invariant.
SELECT category_id, language, COUNT(*) AS duplicate_count
FROM category_translations
GROUP BY category_id, language
HAVING COUNT(*) <> 1;

-- F. Worker contract requires nullable enquiries.email. Expected to include
-- a row named email with notnull=0. Run separately.
PRAGMA table_info('enquiries');

-- G. Project category references must all resolve. Expected: zero rows.
SELECT p.id, p.slug, p.category_id
FROM projects p
LEFT JOIN categories c ON c.id = p.category_id
WHERE c.id IS NULL;

-- H. Worker contract expects these tables. Each should return at least one
-- row of column metadata; a "no such table" error is a STOP. Run separately.
PRAGMA table_info('categories');
PRAGMA table_info('category_translations');
PRAGMA table_info('projects');
PRAGMA table_info('project_translations');
PRAGMA table_info('media');
PRAGMA table_info('enquiries');
PRAGMA table_info('enquiry_rate_limits');

-- I. Expected: zero rows. Run against the migrated disposable database.
PRAGMA foreign_key_check;

-- J. Recheck preserved operational tables and compare their definitions and
-- row counts with the pre-migration export. Run separately.
PRAGMA table_info('admin_users');
PRAGMA table_info('admin_sessions');
PRAGMA table_info('admin_setup');
PRAGMA table_info('auth_rate_limits');
PRAGMA table_info('audit_logs');
PRAGMA table_info('site_settings');

-- Acceptance gate: do not test against production. Do not proceed if the
-- baseline export is unverified, category identity changed, translations are
-- not exactly one en+hi pair per category, FK checks fail, the nullable email
-- contract is absent, or any admin/auth/settings definition unexpectedly changed.
