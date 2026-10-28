-- Read-only D1 integrity and constraint inventory for Golden Films.
-- Run each statement separately against the intended D1 database.
-- This file performs no INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, or migration.
-- Empty PRAGMA foreign_key_check output means no currently detected FK violations;
-- it does not prove the schema matches the Worker contract.

-- 1. Actual tables and their stored CREATE statements (helps reconcile API metadata).
SELECT type, name, tbl_name, sql
FROM sqlite_master
WHERE type IN ('table', 'index', 'trigger', 'view')
  AND name NOT LIKE 'sqlite_%'
  AND name NOT LIKE '_cf_%'
ORDER BY type, name;

-- 2. Category inventory invariants. Expected live baseline: 14 rows.
SELECT
  COUNT(*) AS row_count,
  COUNT(DISTINCT id) AS distinct_ids,
  COUNT(DISTINCT slug) AS distinct_slugs,
  COUNT(DISTINCT sort_order) AS distinct_sort_orders,
  SUM(CASE WHEN id <> slug THEN 1 ELSE 0 END) AS id_differs_from_slug
FROM categories;

-- 3. Identify category rows whose IDs differ from the slug (do not rewrite them).
SELECT id, slug, sort_order, title_en, title_hi
FROM categories
WHERE id <> slug
ORDER BY sort_order, slug;

-- 4. Table row counts: run each statement separately; values are point-in-time only.
SELECT COUNT(*) AS categories_rows FROM categories;
SELECT COUNT(*) AS projects_rows FROM projects;
SELECT COUNT(*) AS project_translations_rows FROM project_translations;
SELECT COUNT(*) AS project_media_rows FROM project_media;
SELECT COUNT(*) AS enquiries_rows FROM enquiries;
SELECT COUNT(*) AS admin_users_rows FROM admin_users;
SELECT COUNT(*) AS admin_sessions_rows FROM admin_sessions;
SELECT COUNT(*) AS admin_setup_rows FROM admin_setup;
SELECT COUNT(*) AS auth_rate_limits_rows FROM auth_rate_limits;
SELECT COUNT(*) AS audit_logs_rows FROM audit_logs;
SELECT COUNT(*) AS site_settings_rows FROM site_settings;
SELECT COUNT(*) AS enquiry_rate_limits_rows FROM enquiry_rate_limits;

-- 5. Full column definitions. Run each PRAGMA separately.
PRAGMA table_info('categories');
PRAGMA table_info('projects');
PRAGMA table_info('project_translations');
PRAGMA table_info('project_media');
PRAGMA table_info('enquiries');
PRAGMA table_info('enquiry_rate_limits');
PRAGMA table_info('admin_users');
PRAGMA table_info('admin_sessions');
PRAGMA table_info('admin_setup');
PRAGMA table_info('auth_rate_limits');
PRAGMA table_info('audit_logs');
PRAGMA table_info('site_settings');

-- 6. Foreign-key declarations. Run each PRAGMA separately.
PRAGMA foreign_key_list('categories');
PRAGMA foreign_key_list('projects');
PRAGMA foreign_key_list('project_translations');
PRAGMA foreign_key_list('project_media');
PRAGMA foreign_key_list('enquiries');
PRAGMA foreign_key_list('admin_users');
PRAGMA foreign_key_list('admin_sessions');
PRAGMA foreign_key_list('admin_setup');
PRAGMA foreign_key_list('auth_rate_limits');
PRAGMA foreign_key_list('audit_logs');
PRAGMA foreign_key_list('site_settings');

-- 7. Existing foreign-key violations, if any. Empty result is expected.
PRAGMA foreign_key_check;

-- 8. Index declarations. Run each PRAGMA separately, then inspect each index with
-- PRAGMA index_info('<index_name>') using the names returned below.
PRAGMA index_list('categories');
PRAGMA index_list('projects');
PRAGMA index_list('project_translations');
PRAGMA index_list('project_media');
PRAGMA index_list('enquiries');
PRAGMA index_list('enquiry_rate_limits');
PRAGMA index_list('admin_users');
PRAGMA index_list('admin_sessions');
PRAGMA index_list('admin_setup');
PRAGMA index_list('auth_rate_limits');
PRAGMA index_list('audit_logs');
PRAGMA index_list('site_settings');

-- Safety reminder: this is a diagnostic inventory, not a migration approval.
-- Do not run a forward migration on live D1 until backup/restore is verified,
-- schema metadata is reconciled, mappings are approved, and disposable-copy tests pass.
