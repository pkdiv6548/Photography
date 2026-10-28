# Live D1 schema audit — 2026-10-28

## Scope and safety

This report is based on read-only SQL catalog queries against the configured `golden-films-db` database. No rows were inserted, updated, or deleted. No migration was applied. The Cloudflare database metadata reported `num_tables: 0`, but querying `sqlite_master` directly returned the application tables below. Treat this discrepancy as an account metadata/API inconsistency until Cloudflare support or a fresh metadata read explains it; the SQL catalog is direct evidence that tables exist.

## Tables found

- `categories`: `id`, `slug`, `sort_order`, `title_en`, `title_hi`, `description_en`, `description_hi`, `created_at`.
- `projects`: `id`, `slug`, `category_slug` (FK to `categories.slug`), `cover_image_url`, `status` (draft/published), `is_featured`, `location`, `project_date`, `demo_label`, `created_at`, `updated_at`.
- `project_media`: media type, `preview_url`, `original_key`, bilingual alt text, `is_public`, sort order and project FK.
- `project_translations`: `project_id`, `locale` (en/hi), `title`, `description`.
- `enquiries`: `email TEXT NOT NULL`, `phone TEXT NOT NULL DEFAULT ''`, `preferred_date`, `budget_range`, message, and status constrained to `new/read/archived`.
- `enquiry_rate_limits`: `ip_hash`, `window_start`, `request_count`; this matches the current rate-limiter table shape.
- `admin_users`, `admin_sessions`, `admin_setup`, `auth_rate_limits`, `audit_logs`, `site_settings`, and Cloudflare's internal `_cf_KV`.

The read-only count query returned 14 categories and zero rows in `projects`, `enquiries`, `admin_users`, `project_media`, and `project_translations`.

## Contract drift from current Worker

The Worker currently expects:

- `categories.is_published` and a `category_translations(category_id, language, name)` table; the live `categories` table instead stores `title_en/title_hi` directly and has no `is_published` column.
- `projects.category_id`, `cover_object_key`, and `featured`; the live table instead uses `category_slug`, `cover_image_url`, and `is_featured`.
- `enquiries.email` to allow SQL NULL; the live table declares it NOT NULL. The API supports phone-only enquiries and binds NULL for absent email, so this insert would fail against the live schema.
- The current baseline schema also uses a different enquiries status constraint and date column name (`event_date` versus live `preferred_date`).

Both `migrations/0001_initial_schema.sql` and the current Worker cannot be applied to the live database unchanged. In particular, `CREATE TABLE IF NOT EXISTS` does not modify existing table definitions.

## Safe next steps

1. Confirm the intended database/account and discover whether migrations were ever tracked or applied. Do not infer migration history from the table count metadata.
2. Make a verified backup/export using a supported Cloudflare D1 backup/export path before any writes.
3. Choose one explicit direction: adapt Worker SQL to the existing schema, or create a forward migration that preserves legacy columns and rows while adding/transforming the new contract. Do not mix both strategies ad hoc.
4. If choosing forward migration, test it against a disposable D1 database seeded from a schema/data export. It must address the non-null `enquiries.email` constraint, existing admin/auth tables, foreign keys, and status/date mappings.
5. Add a schema smoke test that checks expected columns and constraints, then run all Worker tests and frontend build.
6. Only after review and explicit authorization should any migration be applied to the configured database. Keep the project at ₹0; do not enable paid services.

## Current status

The Worker is not deployed. No live schema change was made during this audit. The safest immediate action is schema reconciliation and testing, not deployment.
