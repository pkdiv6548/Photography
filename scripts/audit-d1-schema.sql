-- Read-only contract audit for the Golden Films Worker API.
-- Run in the Cloudflare D1 SQL console against the intended database.
-- This query reads SQLite schema metadata only; it does not read application rows
-- and performs no INSERT, UPDATE, DELETE, ALTER, or other writes.
--
-- Results:
--   PRESENT                required column exists
--   MISSING                required column/table is absent
--   INCOMPATIBLE_NOT_NULL  enquiries.email exists but rejects SQL NULL
--
-- This is a diagnostic report, not a migration. A PRESENT result does not prove
-- that every CHECK constraint, foreign key, index, or semantic mapping is correct.

WITH expected(table_name, column_name, must_allow_null) AS (
  SELECT
    json_extract(value, '$[0]'),
    json_extract(value, '$[1]'),
    json_extract(value, '$[2]')
  FROM json_each('[["categories","id",0],["categories","slug",0],["categories","sort_order",0],["categories","is_published",0],["category_translations","category_id",0],["category_translations","language",0],["category_translations","name",0],["projects","id",0],["projects","slug",0],["projects","category_id",0],["projects","cover_object_key",0],["projects","featured",0],["projects","status",0],["projects","event_date",0],["projects","updated_at",0],["project_translations","project_id",0],["project_translations","language",0],["project_translations","title",0],["project_translations","description",0],["project_translations","alt_text",0],["media","id",0],["media","project_id",0],["media","object_key",0],["media","media_type",0],["media","mime_type",0],["media","size_bytes",0],["media","is_public_preview",0],["media","sort_order",0],["enquiries","id",0],["enquiries","name",0],["enquiries","email",1],["enquiries","phone",0],["enquiries","service",0],["enquiries","event_date",0],["enquiries","budget_range",0],["enquiries","message",0],["enquiries","consent",0],["enquiries","status",0],["enquiries","created_at",0],["enquiry_rate_limits","ip_hash",0],["enquiry_rate_limits","window_start",0],["enquiry_rate_limits","request_count",0]]')
),
actual(table_name, column_name, is_not_null) AS (
  SELECT * FROM (
    SELECT 'categories', name, "notnull" FROM pragma_table_info('categories')
    UNION ALL
    SELECT 'category_translations', name, "notnull" FROM pragma_table_info('category_translations')
    UNION ALL
    SELECT 'projects', name, "notnull" FROM pragma_table_info('projects')
    UNION ALL
    SELECT 'project_translations', name, "notnull" FROM pragma_table_info('project_translations')
  )
  UNION ALL
  SELECT * FROM (
    SELECT 'media', name, "notnull" FROM pragma_table_info('media')
    UNION ALL
    SELECT 'enquiries', name, "notnull" FROM pragma_table_info('enquiries')
    UNION ALL
    SELECT 'enquiry_rate_limits', name, "notnull" FROM pragma_table_info('enquiry_rate_limits')
  )
)
SELECT
  e.table_name,
  e.column_name,
  CASE
    WHEN a.column_name IS NULL THEN 'MISSING'
    WHEN e.must_allow_null = 1 AND a.is_not_null = 1 THEN 'INCOMPATIBLE_NOT_NULL'
    ELSE 'PRESENT'
  END AS result
FROM expected AS e
LEFT JOIN actual AS a
  ON a.table_name = e.table_name
 AND a.column_name = e.column_name
ORDER BY e.table_name, e.column_name;
