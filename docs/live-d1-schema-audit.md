# Live D1 schema audit — 2026-10-29

## Scope and safety

This snapshot is based on a read-only Cloudflare D1 query against the configured database golden-films-db (database ID 0241231b-6e6c-410b-a5ac-958eeb424a78). The query read sqlite_master definitions only. No application rows were read or changed, no export was started, and no migration was applied.

The configured Pages project is golden-films, with main as the production branch. A Pages deployment exists, but the Pages project currently has **no D1 binding in either preview or production**, no MEDIA_BUCKET R2 binding, and no ADMIN_SETUP_SECRET variable/secret configured. The API bridge remains in draft PR #63, so a successful static-site deployment is not proof that the admin APIs are reachable.

## Tables confirmed in the live database

The SQLite catalog lists these application tables:

- categories: id, slug, sort_order, title_en, title_hi, description_en, description_hi, created_at.
- projects: id, slug, category_slug, cover_image_url, status, is_featured, location, project_date, demo_label, created_at, updated_at.
- project_translations: project_id, locale, title, description.
- project_media: id, project_id, media_type, preview_url, original_key, alt_en, alt_hi, sort_order, is_public, created_at.
- enquiries: id, name, email TEXT NOT NULL, phone, service, preferred_date, budget_range, message, status, created_at, updated_at.
- enquiry_rate_limits: ip_hash, window_start, request_count.
- admin_users: id, email, password_hash, password_salt, email_verified_at, is_active, created_at, last_login_at.
- admin_sessions, admin_setup, auth_rate_limits, audit_logs, site_settings, and Cloudflare's internal _cf_KV.

The catalog does **not** list site_content or site_content_revisions. admin_users does not yet have role; enquiries does not yet have consent.

## Current Worker contract gaps confirmed by direct inspection

The current /api/ready contract checks for these missing pieces:

1. enquiries.consent — absent.
2. admin_users.role — absent.
3. site_content — absent.
4. site_content_revisions — absent.

Separately, enquiries.email is NOT NULL. The enquiry submission contract allows a visitor to provide a phone number without an email address, and the schema-readiness guard is designed to fail closed when email nullability is incompatible. The forward migration currently adds consent, role, and the two CMS tables, but **does not resolve the existing email-nullability mismatch**. That must be designed and tested before the migration can be approved.

The live schema's category/project/media names are the current bilingual slug-based model (categories.title_en/title_hi, projects.category_slug, project_media). Do not use older audit scripts that expect category_translations, projects.category_id, or a separate media table.

## Required safe next steps

1. Use a supported Cloudflare D1 export/backup workflow. The export API documentation warns that an in-progress export can make the database unavailable while it runs and must be polled to completion. Schedule this deliberately rather than triggering an export casually.
2. Verify the export and restore it to a disposable database. Compare the restored schema and row counts with the source snapshot.
3. Revise the candidate forward migration to address the enquiries.email NOT NULL constraint safely while preserving every existing enquiry, and add consent DEFAULT 0 for historical rows (never infer consent).
4. Apply the candidate migration only to the disposable copy. Run scripts/verify-d1-migration.sql, scripts/audit-d1-schema.sql, Worker tests, and GET /api/ready against the test copy.
5. Review the test evidence and obtain explicit production-migration approval before any write to live D1.
6. Only after database compatibility is established, configure Pages DB binding and ADMIN_SETUP_SECRET for preview and production, merge the API bridge, deploy, and run the documented smoke tests.
7. Configure MEDIA_BUCKET only if media upload is explicitly enabled and the R2 cost/billing implications have been reviewed.

## Current status

- Read-only schema inspection: complete.
- Schema audit and migration verifier updated to the actual live table model in the current branch.
- Verified full backup/export and disposable restore: not yet complete.
- Email-nullability migration design: still required.
- Production D1 migration: not performed.
- Pages D1/secret bindings and API bridge: not enabled.
- R2 bucket: not created.
