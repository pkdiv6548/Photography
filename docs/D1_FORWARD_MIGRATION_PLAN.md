# D1 Forward-Migration Plan (Review Only)

Last reconciled: 2026-10-28. This document is a planning artifact, not an executable migration and does not authorize changes to the configured database.

## Decision

The Worker API currently targets the schema in `migrations/0001_initial_schema.sql`, while the configured `golden-films-db` has a legacy schema. Do not apply the baseline migration unchanged: `CREATE TABLE IF NOT EXISTS` does not alter existing tables.

The preferred target is to make the database match the current Worker contract, but only after reviewing the complete data mapping and validating it against a disposable database. Do not silently adapt the API to undocumented legacy semantics, and do not rename columns or tables in production as an exploratory fix.

## Read-only evidence captured

A Cloudflare D1 catalog audit was run against the configured database on 2026-10-28. The revised schema audit returned 42 checks: 21 `PRESENT`, 20 `MISSING`, and one `INCOMPATIBLE_NOT_NULL`. The query metadata reported zero rows written and `changed_db: false`.

The table catalog includes legacy tables `categories`, `projects`, `project_translations`, `project_media`, and `enquiries`, plus admin/auth tables including `admin_users`, `admin_sessions`, `admin_setup`, `auth_rate_limits`, `audit_logs`, and `site_settings`.

Counts captured at the same time:
- `categories`: 14 rows
- `projects`: 0 rows
- `enquiries`: 0 rows
- `project_media`: 0 rows
- `project_translations`: 0 rows
- `admin_users`: 0 rows
- `admin_sessions`: 0 rows
- `audit_logs`: 0 rows

These are point-in-time observations, not guarantees about the next migration window. Recheck counts immediately before any future write. A direct Cloudflare D1 database-details GET on 2026-10-28 returned `num_tables: 12`, matching the 12 application tables returned by `sqlite_master` when the internal `_cf_KV` table is excluded. An earlier metadata observation reported zero and was inconsistent; the direct metadata response and catalog now agree. Preserve this discrepancy in the audit trail and recheck both sources during preflight. This resolves the current table-count mismatch, but does not replace a verified export/restore.

## Mapping and blockers

| Legacy schema | Worker target | Required handling |
| --- | --- | --- |
| `categories.title_en/title_hi` and bilingual descriptions | `categories.is_published` plus `category_translations(language, name)` | Create translation rows from the existing English/Hindi fields; decide how descriptions are retained because the target baseline translation table has no description column. Set publication status only under an approved policy. Preserve category IDs, slugs, and sort order. |
| `projects.category_slug` | `projects.category_id` | Resolve every slug to a category ID and verify there are no orphan references. Current count is zero, but recheck before migration. |
| `projects.cover_image_url` | `projects.cover_object_key` | These are not equivalent values. Never copy a full URL into an object-key column. Current project count is zero; if rows appear, require a reviewed URL-to-object mapping or stop. |
| `projects.is_featured` | `projects.featured` | Map boolean/integer values and validate allowed values. |
| `projects.project_date` | `projects.event_date` | Confirm semantics and date format before copying. |
| `project_translations.locale` | `project_translations.language` | Map `en` and `hi`; preserve title and description. Review the target's `alt_text` default/meaning. |
| `project_media` | `media` | The columns are not one-to-one: `preview_url/original_key` do not automatically establish `object_key/mime_type/size_bytes`. Do not migrate media rows without a verified mapping. |
| `enquiries.preferred_date` | `enquiries.event_date` | Confirm meaning and date format. |
| `enquiries.email NOT NULL` | nullable `enquiries.email` | Rebuild the table using a reviewed copy-and-swap migration; SQLite cannot simply drop a NOT NULL constraint. Current enquiry count is zero, but recheck. |
| Legacy enquiry status `new/read/archived` | Target status `new/in_progress/closed/spam` | Define an explicit mapping. Do not silently map `read` or `archived` without product approval. |
| Legacy enquiries without `consent` | target requires `consent` | Do not fabricate consent for existing records. If any rows exist, migration is blocked until an approved preservation/compliance policy is documented. |
| Admin/auth/settings tables | No Worker admin API is currently implemented | Preserve these tables and all their constraints/indexes. Do not drop, rename, or recreate them as part of the API schema migration. |

## Required preflight

1. Confirm account ID, database UUID, and name against the intended environment.
2. Resolve the D1 metadata/catalog discrepancy with Cloudflare support or an independently verified export/catalog comparison.
3. Generate a supported SQL export/backup and verify that the export completed. Store it securely; never commit it to Git.
4. Restore the export into a **disposable** D1 database or an equivalent isolated SQLite test fixture. Never use the live database as the migration test target.
5. Capture table definitions, indexes, foreign keys, row counts, and data-quality checks from the restored copy.
6. Re-run the 42-column audit and compare results with the previously captured evidence.
7. Confirm that the live database has not gained projects, enquiries, media, translations, or admin/auth records since the last count.

## Test plan for a future migration PR

- Apply the proposed forward migration to a fresh disposable copy and check that it is repeatable only where intentionally designed.
- Verify all 14 category IDs/slugs/sort orders are preserved and English/Hindi names are populated correctly.
- Check all foreign keys with `PRAGMA foreign_key_check`; verify expected indexes and CHECK constraints.
- Test `/api/ready` against the migrated test schema.
- Test category and project read queries against representative fixtures.
- Test an enquiry with an email and a phone-only enquiry; confirm the latter stores SQL NULL for email. Use only disposable test data.
- Test date and status mappings, consent handling, and rate-limit table compatibility.
- Verify admin/auth/settings table definitions are unchanged.
- Run repository typecheck, Worker regression tests, frontend build, and the schema audit.
- Review the resulting export and row counts before considering any production change.

## Rollback and stop conditions

Prefer restore-from-verified-export or a documented recovery procedure over an untested reverse migration. A reverse migration may be lossy where new semantics cannot be represented in the legacy schema.

Stop without writing if the export cannot be verified, the account/database identity is uncertain, any unexpected live rows appear, the metadata/catalog discrepancy remains unexplained, a field mapping is ambiguous, a foreign-key check fails, or tests do not pass.

## Authorization boundary

No live migration, deployment, admin/auth change, paid resource, or billing change is authorized by this document. Keep the project at ₹0 unless explicitly approved. Do not run successful-enquiry tests against the live database because they create real records.


## Additional live category mapping finding (2026-10-28)

A read-only query of the 14 live category rows confirmed that the existing category IDs are legacy IDs such as `cat-wedding`, `cat-prewedding`, and `cat-other`; they are not the matching slugs. The slugs themselves match the baseline seed's 14 slugs.

This creates a specific foreign-key hazard: the baseline migration seeds `category_translations.category_id` with slug-like values such as `wedding-photography`. On the existing database, those values do not match the legacy category primary keys. Because the seed uses `INSERT OR IGNORE`, a migration could appear to run without error while leaving translations missing. Never infer category IDs from slugs. Translation rows must be generated by joining the approved category slug to the actual preserved category ID, and verified to yield exactly two locales per category (28 rows for the current 14 categories).

Read-only validation performed: selected `id, slug, sort_order, title_en, title_hi` from `categories`; Cloudflare reported `rows_written: 0` and `changed_db: false`. No category data was modified.

Required disposable-test assertions:
- All 14 category primary keys remain unchanged.
- All 14 slugs and sort orders remain unchanged.
- Exactly 28 category translation rows are produced, with one `en` and one `hi` row per category.
- Each translation's `category_id` equals the actual category primary key, not the slug unless those values happen to match.
- The migration fails loudly on missing or duplicate mappings instead of silently skipping rows.


## Follow-up read-only integrity inventory (2026-10-28)

PR #32 adds `scripts/audit-d1-integrity.sql`, a statement-by-statement diagnostic inventory for table definitions, category ID/slug invariants, point-in-time row counts, column definitions, foreign-key declarations, indexes, and `PRAGMA foreign_key_check`. It contains no DDL or DML. Run each statement separately because the D1 query endpoint may reject large compound statements.

The current direct database-details response confirmed:
- Database name: `golden-films-db`
- UUID: `0241231b-6e6c-410b-a5ac-958eeb424a78`
- `num_tables: 12`
- `file_size: 163840` bytes
- `read_replication.mode: disabled`

The current catalog query listed 12 application tables plus Cloudflare's internal `_cf_KV` table and indexes. Read-only queries again reported `rows_written: 0` and `changed_db: false`. The previously captured zero-row counts for projects, enquiries, media, translations, and admin/auth tables remain point-in-time only and must be refreshed before any migration.

This inventory does not constitute a backup, restore test, migration test, or authorization to write to the live database.
