# Live D1 schema audit — 2026-10-29

## Scope and safety

This snapshot is based on read-only Cloudflare D1 catalog queries against `golden-films-db` (database ID `0241231b-6e6c-410b-a5ac-958eeb424a78`). Catalog queries inspect schema definitions only. No application records were read or changed, no export was started, and no migration was applied during this audit.

The Cloudflare Pages project is `golden-films`, with `main` as the production branch. The latest production Pages build/deploy succeeded, but the project configuration reports no production or preview environment variables and the latest deployment does not use Pages Functions. Treat the static-site deployment as separate from API readiness. PR #63 contains the draft Pages API bridge; do not merge it until the database restore/migration gate and Pages bindings are verified.

## Tables confirmed in the live database

The SQLite catalog lists these application tables:

- `categories`: `id`, `slug`, `sort_order`, `title_en`, `title_hi`, `description_en`, `description_hi`, `created_at`.
- `projects`: `id`, `slug`, `category_slug`, `cover_image_url`, `status`, `is_featured`, `location`, `project_date`, `demo_label`, `created_at`, `updated_at`.
- `project_translations`: `project_id`, `locale`, `title`, `description`.
- `project_media`: `id`, `project_id`, `media_type`, `preview_url`, `original_key`, `alt_en`, `alt_hi`, `sort_order`, `is_public`, `created_at`.
- `enquiries`: `id`, `name`, `email TEXT NOT NULL`, `phone`, `service`, `preferred_date`, `budget_range`, `message`, `status`, `created_at`, `updated_at`.
- `enquiry_rate_limits`: `ip_hash`, `window_start`, `request_count`.
- `admin_users`: `id`, `email`, `password_hash`, `password_salt`, `email_verified_at`, `is_active`, `created_at`, `last_login_at`.
- `admin_sessions`, `admin_setup`, `auth_rate_limits`, `audit_logs`, `site_settings`, and Cloudflare's internal `_cf_KV`.

The catalog does not list `site_content` or `site_content_revisions`. `admin_users` does not yet have `role`; `enquiries` does not yet have `consent`. A fresh read-only catalog query returned 12 application tables when Cloudflare's internal `_cf_KV` is excluded from the count convention used in the repository docs; the raw query listed 12 application tables plus `_cf_KV`.

## Worker contract gaps confirmed by direct inspection

The current Worker readiness contract requires these pieces, which are absent from the live database:

1. `enquiries.consent`.
2. `admin_users.role`.
3. `site_content`.
4. `site_content_revisions`.

Also, `enquiries.email` is currently `NOT NULL`, while the API supports phone-only enquiries. The current candidate forward migration at `docs/forward-migrations/2026-10-29-live-schema-forward.sql` now addresses this by rebuilding `enquiries`, copying existing records, allowing `email` to be nullable, and assigning historical records `consent=0`. It also adds the `role` column and CMS tables. This is a candidate migration only; it has not been run against production and is not approved for production until isolated restore testing succeeds.

The live schema uses the slug-based category/project/media model (`categories.title_en/title_hi`, `projects.category_slug`, `project_media`). Do not use older audit assumptions expecting `category_translations`, `projects.category_id`, or a separate media table.

## Required safe next steps

1. Schedule a supported Cloudflare D1 export deliberately. Cloudflare warns an active export can temporarily make the database unavailable for queries and requires polling to completion; do not start it casually during normal use.
2. Download the generated SQL and restore it to a disposable database. Verify the file, schema, and row counts against the source snapshot.
3. Apply the exact candidate forward migration only to that disposable copy.
4. Run `scripts/verify-d1-migration.sql`, `scripts/audit-d1-schema.sql`, Worker regression tests, and `GET /api/ready` against the migrated test copy. Confirm existing categories, projects, translations, media, admin records, and enquiries are preserved; historical consent must remain `0`.
5. Review the test evidence and obtain explicit approval before any production D1 write.
6. Only after database compatibility is established, configure Pages D1 binding `DB` and secret `ADMIN_SETUP_SECRET` for preview and production, then review/merge the API bridge and run the documented smoke tests.
7. Configure `MEDIA_BUCKET` only if uploads are explicitly enabled and the R2 free-tier/billing implications are reviewed.

## Current status

- Read-only live schema inspection: complete; latest catalog query made no writes (`changed_db=false`, `rows_written=0`).
- Candidate forward migration: revised to handle nullable email, historical consent default, admin role, and CMS tables.
- Full backup/export downloaded and restore-verified: not complete.
- Disposable restore plus exact migration/test suite: not complete.
- Production D1 migration: not performed.
- Pages D1 binding and `ADMIN_SETUP_SECRET`: not configured.
- Pages API bridge: remains draft PR #63 and is not active in the latest production deployment.
- R2 bucket: not created; remain within the ₹0 budget unless explicitly authorized.
