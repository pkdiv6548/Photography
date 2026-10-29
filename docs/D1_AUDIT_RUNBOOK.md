# D1 schema audit and migration safety runbook

Last reviewed: 2026-10-29

## Purpose

scripts/audit-d1-schema.sql is a read-only diagnostic query. It compares the current Worker API's required tables and columns with the D1 schema. It reports PRESENT, MISSING, and INCOMPATIBLE_NOT_NULL. It does not migrate, repair, or certify the database.

## Run the audit safely

1. Confirm the intended Cloudflare account, database name, and database ID.
2. Open the database SQL console and run scripts/audit-d1-schema.sql.
3. Save the schema-only results for review. The query reads SQLite metadata using pragma_table_info; it does not select application records or perform writes.
4. Treat every MISSING and INCOMPATIBLE_NOT_NULL result as a blocker.
5. The audit checks required column presence and email nullability only. It does not fully validate CHECK constraints, foreign keys, indexes, uniqueness, status values, date semantics, or whether data can be mapped without loss.

## Current schema findings

The read-only catalog inspection on 2026-10-29 confirmed the current bilingual slug-based schema: categories use title_en/title_hi, projects use category_slug/cover_image_url/is_featured, and media is stored in project_media. Do not use older audit scripts that expect category_translations, projects.category_id, cover_object_key, or a separate media table.

The confirmed blockers are:

- enquiries.email is NOT NULL, but the API supports phone-only enquiries.
- enquiries.consent is missing.
- admin_users.role is missing.
- site_content and site_content_revisions are missing.
- Cloudflare Pages has no DB binding or ADMIN_SETUP_SECRET in either preview or production, so the Pages API bridge cannot work yet.

The current candidate forward migration rebuilds enquiries to make email nullable while preserving its columns and rows, assigns historical consent=0, adds role with default owner, and creates the CMS tables. This is still a candidate only; local SQLite simulation is not a substitute for a verified production export restored to disposable D1.

## Migration safety checklist

Do not run the baseline migrations against the existing database as a repair strategy. CREATE TABLE IF NOT EXISTS does not add missing columns to an existing table.

Before production migration:

- Confirm the correct account, database name, and database ID.
- Obtain a supported backup/export using an approved maintenance window. Cloudflare documents that an in-progress export can temporarily make D1 unavailable and must be polled to completion.
- Restore the export into a disposable database and verify table definitions, row counts, indexes, foreign keys, and constraints.
- Run the candidate forward migration against that restored copy.
- Run scripts/verify-d1-migration.sql and scripts/audit-d1-schema.sql against the disposable copy.
- Verify all existing records remain present, historical consent is 0, email is nullable, roles default safely, CMS tables exist, and PRAGMA foreign_key_check returns zero rows.
- Run Worker regression tests and exercise GET /api/ready against the migrated test database.
- Review migration SQL and restore evidence in a pull request.
- Apply to the configured database only after explicit production authorization and a verified recovery plan.

## Deployment gate

A successful static Pages deployment does not mean API routes are live. The API bridge is still in draft PR #63, and Pages DB/secret bindings are absent. Do not merge the bridge or enable production API traffic until the database compatibility gate is passed and the bindings are configured safely.

Keep the project within the ₹0 budget; do not enable paid services or billing without explicit approval.

## Current status

Read-only live schema inspection is complete. Audit/verifier SQL and the forward migration candidate are being aligned to the observed schema. No production export was started, no backup has been produced or verified, no production D1 migration was applied, no Pages binding or secret was changed, and no R2 bucket was created.
