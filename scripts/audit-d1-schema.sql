-- Read-only contract audit for the current Golden Films Worker API.
-- Run in the Cloudflare D1 SQL console against the intended database.
-- No application rows are selected; this compares required column names and
-- the nullable-email contract using SQLite schema metadata only.
-- Results: PRESENT, MISSING, or INCOMPATIBLE_NOT_NULL.
-- This is diagnostic only; it does not validate all constraints or data mappings.

WITH expected(table_name, column_name, must_allow_null) AS (
  SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]')
  FROM json_each('[
    ["categories","id",0],["categories","slug",0],["categories","sort_order",0],
    ["categories","title_en",0],["categories","title_hi",0],["categories","description_en",0],["categories","description_hi",0],
    ["projects","id",0],["projects","slug",0],["projects","category_slug",0],["projects","cover_image_url",0],
    ["projects","status",0],["projects","is_featured",0],["projects","project_date",0],["projects","updated_at",0],
    ["project_translations","project_id",0],["project_translations","locale",0],["project_translations","title",0],["project_translations","description",0],
    ["project_media","id",0],["project_media","project_id",0],["project_media","media_type",0],["project_media","preview_url",0],
    ["project_media","original_key",0],["project_media","alt_en",0],["project_media","alt_hi",0],["project_media","sort_order",0],["project_media","is_public",0],
    ["enquiries","id",0],["enquiries","name",0],["enquiries","email",1],["enquiries","phone",0],["enquiries","service",0],
    ["enquiries","preferred_date",0],["enquiries","budget_range",0],["enquiries","message",0],["enquiries","consent",0],
    ["enquiries","status",0],["enquiries","created_at",0],["enquiries","updated_at",0],
    ["enquiry_rate_limits","ip_hash",0],["enquiry_rate_limits","window_start",0],["enquiry_rate_limits","request_count",0],
    ["admin_users","id",0],["admin_users","email",0],["admin_users","password_hash",0],["admin_users","password_salt",0],
    ["admin_users","role",0],["admin_users","is_active",0],["admin_users","created_at",0],
    ["admin_sessions","id",0],["admin_sessions","admin_user_id",0],["admin_sessions","token_hash",0],["admin_sessions","expires_at",0],
    ["admin_setup","id",0],["admin_setup","completed_at",0],
    ["auth_rate_limits","rate_key",0],["auth_rate_limits","window_started_at",0],["auth_rate_limits","request_count",0],
    ["audit_logs","id",0],["audit_logs","admin_user_id",0],["audit_logs","action",0],["audit_logs","target_type",0],["audit_logs","target_id",0],["audit_logs","created_at",0],
    ["site_content","page_slug",0],["site_content","draft_json",0],["site_content","published_json",0],["site_content","status",0],["site_content","updated_at",0],
    ["site_content_revisions","id",0],["site_content_revisions","page_slug",0],["site_content_revisions","content_json",0],["site_content_revisions","revision_status",0],["site_content_revisions","created_at",0]
  ]')
),
actual(table_name, column_name, is_not_null) AS (
  SELECT 'categories', name, "notnull" FROM pragma_table_info('categories')
  UNION ALL SELECT 'projects', name, "notnull" FROM pragma_table_info('projects')
  UNION ALL SELECT 'project_translations', name, "notnull" FROM pragma_table_info('project_translations')
  UNION ALL SELECT 'project_media', name, "notnull" FROM pragma_table_info('project_media')
  UNION ALL SELECT 'enquiries', name, "notnull" FROM pragma_table_info('enquiries')
  UNION ALL SELECT 'enquiry_rate_limits', name, "notnull" FROM pragma_table_info('enquiry_rate_limits')
  UNION ALL SELECT 'admin_users', name, "notnull" FROM pragma_table_info('admin_users')
  UNION ALL SELECT 'admin_sessions', name, "notnull" FROM pragma_table_info('admin_sessions')
  UNION ALL SELECT 'admin_setup', name, "notnull" FROM pragma_table_info('admin_setup')
  UNION ALL SELECT 'auth_rate_limits', name, "notnull" FROM pragma_table_info('auth_rate_limits')
  UNION ALL SELECT 'audit_logs', name, "notnull" FROM pragma_table_info('audit_logs')
  UNION ALL SELECT 'site_content', name, "notnull" FROM pragma_table_info('site_content')
  UNION ALL SELECT 'site_content_revisions', name, "notnull" FROM pragma_table_info('site_content_revisions')
)
SELECT e.table_name, e.column_name,
  CASE
    WHEN a.column_name IS NULL THEN 'MISSING'
    WHEN e.must_allow_null = 1 AND a.is_not_null = 1 THEN 'INCOMPATIBLE_NOT_NULL'
    ELSE 'PRESENT'
  END AS result
FROM expected e
LEFT JOIN actual a ON a.table_name = e.table_name AND a.column_name = e.column_name
ORDER BY e.table_name, e.column_name;
