# D1 schema audit and migration safety runbook

Last reviewed: 2026-10-28

## Purpose

`scripts/audit-d1-schema.sql` is a read-only diagnostic query. It compares selected tables and columns used by the current Worker API with the schema in the D1 database where it is executed. It does not migrate, repair, or certify the database.

## Run the audit safely

1. Open Cloudflare Dashboard and select the intended account and D1 database. Confirm the database name and database ID before running any query.
2. Open that database's SQL console and run the contents of `scripts/audit-d1-schema.sql`.
3. Save/export the results for review. The query only reads SQLite schema metadata through `pragma_table_info`; it does not insert, update, delete, or alter application data.
4. Treat every `MISSING` and `INCOMPATIBLE_NOT_NULL` result as a blocker for the current Worker contract.
5. This audit checks required column presence and the email nullability rule only. It does **not** fully validate CHECK constraints, foreign keys, indexes, uniqueness, status values, date semantics, or whether old data can be mapped without loss.

## Known compatibility risks

The last recorded audit found significant drift between the existing D1 schema and the current Worker contract, including legacy bilingual category fields, different project category/media columns, and `enquiries.email NOT NULL` despite the API allowing phone-only enquiries. Re-run the audit against the intended database to verify the current state; do not assume the earlier snapshot is still complete.

## Migration safety checklist

Do not run the baseline migration against the existing database as a repair strategy. `CREATE TABLE IF NOT EXISTS` does not add missing columns to an existing table.

Before proposing a forward migration:

- Confirm the correct account, database name, and database ID.
- Obtain and verify a backup/export using a supported Cloudflare workflow.
- Inspect all tables, indexes, triggers, foreign keys, CHECK constraints, and current row counts.
- Design explicit mappings from legacy category/project/media fields to the target schema.
- Decide how phone-only enquiries map to the email constraint, and preserve existing enquiry statuses and dates.
- Test migration and rollback/recovery procedures on a disposable D1 database with a verified copy of representative data.
- Verify row counts, foreign-key integrity, unique constraints, and application-level read/write behavior in that test database.
- Review the proposed SQL in a pull request and require CI to pass.
- Apply to the configured database only after explicit authorization and a verified recovery plan.

## Deployment gate

The Worker is not considered production-ready merely because `/api/ready` responds. Do not deploy until the live schema is compatible, the frontend/API integration is tested, and security requirements are reviewed. Keep the project within the ₹0 budget; do not enable paid services or billing without explicit approval.

## Supported D1 SQL export: operational preflight

Cloudflare provides a D1 SQL export endpoint at `POST /accounts/{account_id}/d1/database/{database_id}/export`. **Do not trigger it casually against production.** Cloudflare documents that a larger export can make the database unavailable to serve queries while the export runs; the export must be polled until it completes or it can cancel automatically.

Before initiating a live export:

1. Schedule an approved maintenance window and confirm the database name and UUID with a fresh metadata GET.
2. Confirm the expected impact and timing with the application owner; ensure no deployment or migration is running.
3. Use the Cloudflare-supported export flow with `output_format: "polling"`. Poll using the returned bookmark until the status is complete; preserve the completion result and filename.
4. Download the returned signed URL promptly (it is time-limited) to a secure location outside Git. Do not paste signed URLs, credentials, or exported customer data into issues, PRs, logs, or chat.
5. Verify the downloaded SQL is non-empty, record a cryptographic checksum and file size, and inspect the SQL header/content without executing it against production.
6. Restore the export into a newly created **disposable** D1 database or an isolated SQLite fixture. Confirm the restore/import completed, expected table definitions are present, and row counts plus foreign-key checks match the source snapshot.
7. Retain the backup and restore evidence securely according to the project's data-retention policy.

An export completion alone is not a verified backup: a successful isolated restore and integrity comparison are required. Do not run the import endpoint against the live database as a restore test. The Cloudflare import flow writes to its target database and can block it while running.

### Current status

As of this runbook update, the export endpoint has been confirmed in the Cloudflare API specification, but **no export has been started and no backup file has been produced or verified**. This is intentional: initiating a production export may temporarily interrupt D1 query availability and requires an approved maintenance window. The live database has not been changed.

