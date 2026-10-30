# Worker / D1 schema audit

Date: 2026-10-30. Static repository audit only; not a live Production verification.

## Critical finding

The Worker SQL contract in `worker/index.ts` does not match `migrations/0001_initial_schema.sql`. The Worker appears to target a legacy D1 schema. CI passing against a legacy-compatible fixture does not prove that a fresh database created from migration 0001 will work.

Confirmed mismatches:

- Categories: Worker expects `title_en`, `title_hi`, `description_en`, `description_hi`; migration 0001 stores names in `category_translations(name, language)`.
- Projects: Worker expects `category_slug`, `cover_image_url`, `is_featured`, `project_date`, and `demo_label`; migration 0001 uses `category_id`, `cover_object_key`, `featured`, and `event_date`, and lacks `demo_label`.
- Translations: Worker queries `project_translations.locale` and writes both `language` and `locale`; migration 0001 only has `language` and keys rows by `(project_id, language)`.
- Media: Worker uses `project_media` and columns `preview_url`, `original_key`, `alt_en`, `alt_hi`, `is_public`; migration 0001 creates a different `media` table with `object_key`, `mime_type`, `size_bytes`, and `is_public_preview`.
- Enquiries: Worker supports legacy date/status variants; migration 0001 and the candidate forward migration use different date/status contracts. Verify the exact Production CHECK constraints before any migration.

## Minimum required validation

The Worker's `/api/ready` endpoint checks presence of columns in categories, projects, project_translations, project_media, enquiries, enquiry_rate_limits, admin_users, admin_sessions, admin_setup, auth_rate_limits, audit_logs, site_content, site_content_revisions, and gf_monthly_media_usage. Column presence alone does not validate constraints, unique keys, indexes, foreign keys, or every SQL statement.

## Safe next steps

1. Export Production D1 and verify the backup, without modifying Production.
2. Restore the export to a disposable database.
3. Run `scripts/audit-d1-schema.sql`, `scripts/verify-d1-migration.sql`, and the exact candidate migration on that disposable copy.
4. Compare all Worker queries against the restored schema, especially projects, translations, media, enquiry status/date, auth rate limits, and audit logs.
5. Do not merge or apply SQL to Production until the mismatch is resolved and Preview runtime tests pass.

## Verification limits

Automated CI success proves only that the configured fixtures and build pass. Live Supabase Storage, admin login, Production schema compatibility, and live endpoint checks remain unverified. Preview secrets setup remains on hold. No database was changed by this audit.