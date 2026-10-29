-- Disposable-copy migration verification for Golden Films D1.
-- Run ONLY against an isolated disposable database after applying the candidate
-- forward migration. These statements are read-only and do not modify data.
-- Run each statement separately; compare row counts with the pre-migration export.
-- This is not a production migration script or an approval to alter live D1.

-- A. Compare these counts before and after migration; each existing row must remain.
SELECT 'categories' AS table_name, COUNT(*) AS row_count FROM categories;
SELECT 'projects' AS table_name, COUNT(*) AS row_count FROM projects;
SELECT 'project_translations' AS table_name, COUNT(*) AS row_count FROM project_translations;
SELECT 'project_media' AS table_name, COUNT(*) AS row_count FROM project_media;
SELECT 'enquiries' AS table_name, COUNT(*) AS row_count FROM enquiries;
SELECT 'admin_users' AS table_name, COUNT(*) AS row_count FROM admin_users;
SELECT 'admin_sessions' AS table_name, COUNT(*) AS row_count FROM admin_sessions;
SELECT 'audit_logs' AS table_name, COUNT(*) AS row_count FROM audit_logs;

-- B. Compare category identity and ordering with the pre-migration snapshot.
SELECT id, slug, sort_order FROM categories ORDER BY sort_order, slug;

-- C. Project category references must all resolve. Expected: zero rows.
SELECT p.id, p.slug, p.category_slug
FROM projects p LEFT JOIN categories c ON c.slug = p.category_slug
WHERE c.slug IS NULL;

-- D. Project translations must point to existing projects and use en/hi.
-- Both queries should return zero rows.
SELECT pt.project_id, pt.locale
FROM project_translations pt LEFT JOIN projects p ON p.id = pt.project_id
WHERE p.id IS NULL;
SELECT project_id, locale, COUNT(*) AS duplicate_count
FROM project_translations GROUP BY project_id, locale HAVING COUNT(*) > 1;
SELECT project_id, locale FROM project_translations WHERE locale NOT IN ('en','hi');

-- E. Media references must point to existing projects. Expected: zero rows.
SELECT pm.id, pm.project_id
FROM project_media pm LEFT JOIN projects p ON p.id = pm.project_id
WHERE p.id IS NULL;

-- F. Verify nullable-email contract. The email row must have notnull=0.
PRAGMA table_info('enquiries');

-- G. Verify additive migration columns and CMS tables.
PRAGMA table_info('enquiries');
PRAGMA table_info('admin_users');
PRAGMA table_info('site_content');
PRAGMA table_info('site_content_revisions');

-- H. Historical consent must not be inferred. Existing enquiries should have
-- consent=0 unless consent was explicitly recorded later. Expected: zero rows
-- outside the allowed domain.
SELECT id FROM enquiries WHERE consent NOT IN (0,1) OR consent IS NULL;

-- I. Every existing admin account should retain a valid role.
SELECT id, role FROM admin_users WHERE role NOT IN ('owner','editor') OR role IS NULL;

-- J. Foreign-key violations. Expected: zero rows.
PRAGMA foreign_key_check;

-- Acceptance gate: do not test against production. Do not proceed if the backup
-- is unverified, any pre/post row counts differ unexpectedly, category/project/
-- media references change, email is still NOT NULL, consent/role are missing,
-- content tables are absent, or foreign_key_check returns rows.
