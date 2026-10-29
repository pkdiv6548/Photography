# Live D1 schema audit — 2026-10-29

## Scope and safety

This snapshot is based on read-only Cloudflare D1 catalog queries against `golden-films-db` (database ID `0241231b-6e6c-410b-a5ac-958eeb424a78`). Queries inspected schema definitions only; no application records were read or changed. The latest catalog inspection returned `changed_db=false` and `rows_written=0`. No export was started and no migration was applied.

The Cloudflare Pages project is `golden-films`, with `main` as the production branch. The static-site deployment is separate from API readiness. PR #63 contains the draft Pages API bridge; do not merge it until the database restore/migration gate and Pages bindings are verified.

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

The catalog does not list `site_content` or `site_content_revisions`. `admin_users` does not yet have `role`; `enquiries` does not yet have `consent`. A read-only catalog query returned 12 application tables under the repository's counting convention excluding Cloudflare's internal `_cf_KV`; the raw query listed 12 application tables plus `_cf_KV`.

A separate read-only catalog query found **no `d1_migrations` table and no table names containing `migration`**. That means the current database catalog provides no evidence of Wrangler's migration ledger; it does not prove that no manual changes were ever applied. Do not assume the baseline migration history is synchronized with this database.

## Worker contract gaps confirmed by direct inspection

The current Worker readiness contract requires these pieces, which are absent from the live database:

1. `enquiries.consent`.
2. `admin_users.role`.
3. `site_content`.
4. `site_content_revisions`.

Also, `enquiries.email` is currently `NOT NULL`, while the API supports phone-only enquiries. The candidate forward migration at `docs/forward-migrations/2026-10-29-live-schema-forward.sql` rebuilds `enquiries`, copies existing records, allows `email` to be nullable, and assigns historical records `consent=0`. It also adds the `role` column and CMS tables. This is a candidate migration only; it has not been run against production and is not approved until isolated restore testing succeeds.

The live schema uses the slug-based category/project/media model (`categories.title_en/title_hi`, `projects.category_slug`, `project_media`). Do not use older audit assumptions expecting `category_translations`, `projects.category_id`, or a separate media table.

## Why the baseline migrations must not be applied to the live database

The repository's `migrations/0001_initial_schema.sql` is for a different schema generation. It uses `CREATE TABLE IF NOT EXISTS`, which would skip existing live tables without changing their incompatible columns, but it also defines additional tables such as `category_translations` and `media`. Its indexes refer to columns such as `projects.featured`, `projects.sort_order`, and `projects.category_id`, while the live table has `is_featured` and `category_slug`. The seed statements also expect `categories.is_published`, which is absent from the live table.

Consequently, applying the baseline migrations is not a safe way to bring the live database up to date: it can create unrelated tables and then fail on incompatible index/seed SQL, potentially leaving partial schema changes while no `d1_migrations` ledger exists to explain the state. Keep `migrations/0001_initial_schema.sql` through `0005_admin_roles.sql` unapplied to this database. Use only the reviewed forward migration against a verified disposable restore first.

## `audit_logs` — exact live catalog shape verified

A direct read-only `sqlite_master` query and `PRAGMA table_info('audit_logs')` on 2026-10-29 captured this definition:

```sql
CREATE TABLE audit_logs (
 id TEXT PRIMARY KEY,
 admin_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
 action TEXT NOT NULL,
 target_type TEXT NOT NULL DEFAULT '',
 target_id TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
```

The table has `admin_user_id`; it does **not** have `actor_id` or `details_json`. The Worker uses `admin_user_id`, so the previously suspected production/Worker column mismatch is not present in the current catalog. PR #73 corrected the test fixture to match this verified audit-log definition. The Worker sometimes omits `target_type` and `target_id`; their empty-string defaults permit those inserts.

This inspection confirms the table definition only. No audit-log row contents were read, no production records were changed, and it does not establish that the complete API bridge is ready to deploy.

## Required safe next steps

1. Plan a supported Cloudflare D1 export deliberately. Cloudflare documents that an active export can temporarily make the database unavailable for queries and requires polling to completion; do not start one casually during normal use.
2. Download the generated SQL and restore it to a disposable database. Verify the file, schema, and row counts against the source catalog.
3. Apply the exact candidate forward migration only to that disposable copy.
4. Run `scripts/verify-d1-migration.sql`, `scripts/audit-d1-schema.sql`, Worker regression tests, and `GET /api/ready` against the migrated test copy. Confirm existing categories, projects, translations, media, admin records, audit logs, and enquiries are preserved; historical consent must remain `0`.
5. Reconcile the absence of a migration ledger before choosing how the candidate migration is tracked and applied; do not apply the baseline migrations wholesale.
6. Review the test evidence and obtain explicit approval before any production D1 write.
7. Only after database compatibility is established, configure Pages D1 binding `DB` and secret `ADMIN_SETUP_SECRET` for preview and production, then review/merge the API bridge and run the documented smoke tests.
8. Configure `MEDIA_BUCKET` only if uploads are explicitly enabled and the R2 free-tier/billing implications are reviewed.

## Current status

- Read-only live schema inspection: complete; no writes performed.
- Exact live `audit_logs` column definitions: verified read-only on 2026-10-29.
- Migration ledger: no `d1_migrations` table found in the live catalog; historical/manual migration status remains unknown.
- Candidate forward migration: handles nullable email, historical consent default, admin role, and CMS tables, but remains unverified against a real restored export.
- Full backup/export downloaded and restore-verified: not complete.
- Disposable restore plus exact migration/test suite: not complete.
- Production D1 migration: not performed.
- Pages D1 binding and `ADMIN_SETUP_SECRET`: not configured.
- Pages API bridge: remains draft PR #63 and is not active in the production route configuration.
- R2 bucket: not created; remain within the ₹0 budget unless explicitly authorized.
