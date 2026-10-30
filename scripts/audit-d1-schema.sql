-- Read-only contract audit for the current Golden Films Worker API.
-- Run in the Cloudflare D1 SQL console against the intended database.
-- This compares required column names and selected nullable-column contracts using
-- SQLite schema metadata only. Results: PRESENT, MISSING, INCOMPATIBLE_NOT_NULL.
-- Checks nullable enquiries.email and audit_logs.admin_user_id. Diagnostic only;
-- it does not validate all constraints or data mappings.

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
    ["admin_users","role",0],["admin_users","is_active",0],["admin_users","created_at",0],["admin_users","last_login_at",0],
    ["admin_sessions","id",0],["admin_sessions","admin_user_id",0],["admin_sessions","token_hash",0],["admin_sessions","expires_at",0],
    ["admin_setup","id",0],["admin_setup","completed_at",0],
    ["auth_rate_limits","rate_key",0],["auth_rate_limits","window_started_at",0],["auth_rate_limits","request_count",0],
    ["audit_logs","id",0],["audit_logs","admin_user_id",1],["audit_logs","action",0],["audit_logs","target_type",0],["audit_logs","target_id",0],["audit_logs","created_at",0],
    ["site_content","page_slug",0],["site_content","draft_json",0],["site_content","published_json",0],["site_content","status",0],["site_content","updated_at",0],
    ["site_content_revisions","id",0],["site_content_revisions","page_slug",0],["site_content_revisions","content_json",0],["site_content_revisions","revision_status",0],["site_content_revisions","created_at",0]
  ]')
)
SELECT e.table_name, e.column_name,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM pragma_table_info(e.table_name) p WHERE p.name = e.column_name
    ) THEN 'MISSING'
    WHEN e.must_allow_null = 1 AND COALESCE((
      SELECT p."notnull" FROM pragma_table_info(e.table_name) p WHERE p.name = e.column_name
    ), 0) = 1 THEN 'INCOMPATIBLE_NOT_NULL'
    ELSE 'PRESENT'
  END AS result
FROM expected e
ORDER BY e.table_name, e.column_name;

-- Second result set: verify the unique/primary-key conflict targets used by
-- Worker ON CONFLICT clauses. A column existing is not enough: the exact
-- column set must be backed by a UNIQUE index or PRIMARY KEY.
WITH expected_unique(table_name, target_columns) AS (
  SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]')
  FROM json_each('[
    ["categories","slug"],
    ["projects","slug"],
    ["project_translations","project_id,locale"],
    ["enquiry_rate_limits","ip_hash,window_start"],
    ["admin_users","email"],
    ["admin_sessions","token_hash"],
    ["admin_setup","id"],
    ["auth_rate_limits","rate_key"],
    ["site_content","page_slug"],
    ["gf_monthly_media_usage","month_key"]
  ]')
),
actual_unique AS (
  SELECT m.name AS table_name,
         group_concat(
           (SELECT group_concat(ii.name, ',')
            FROM pragma_index_info(m.name) ii
            ORDER BY ii.seqno),
           '|'
         ) AS index_column_sets
  FROM sqlite_master m
  WHERE m.type = 'index'
    AND (m.sql IS NULL OR upper(m.sql) LIKE '%UNIQUE%')
  GROUP BY m.name
)
SELECT e.table_name, e.target_columns,
  CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM pragma_index_list(e.table_name) il
      WHERE il."unique" = 1
        AND (
          SELECT group_concat(ii.name, ',')
          FROM pragma_index_info(il.name) ii
          ORDER BY ii.seqno
        ) = e.target_columns
    ) THEN 'MISSING_UNIQUE_CONFLICT_TARGET'
    ELSE 'UNIQUE_TARGET_PRESENT'
  END AS result
FROM expected_unique e
ORDER BY e.table_name;
