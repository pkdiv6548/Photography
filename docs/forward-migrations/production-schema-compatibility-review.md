# Production D1 schema compatibility review

Review date: 2026-10-31
Branch: `feat/supabase-storage-free-tier`
Target: `golden-films-db` (`0241231b-6e6c-410b-a5ac-958eeb424a78`)

## Review outcome

**Static review only — production compatibility is NOT verified.** No production write or migration was performed. The live database has not been exported and restored to a disposable database; the current synthetic SQLite fixture is not evidence of the exact live schema.

## Known compatibility changes in the candidate forward migration

1. `categories.description_en` and `categories.description_hi` are added with empty-string defaults. This avoids inventing translated descriptions.
2. `enquiries` is rebuilt because the legacy `email` column is NOT NULL while the current API supports phone-only enquiries. Existing column values are copied; historical `consent` is set to `0` because prior consent was not recorded.
3. `admin_users.role` is added with the least-privilege `editor` default. Existing accounts must not automatically become owners.
4. `site_content`, `site_content_revisions`, and `gf_monthly_media_usage` are added for CMS/revision history and monthly upload quota enforcement.
5. The enquiry status/created timestamp index is recreated after the enquiry table rebuild.
6. Existing project/media data and all other legacy table/index relationships must be verified from a real export; the synthetic fixture only models the catalog snapshot currently documented in the repository.

## Required before any production migration

- [ ] Confirm current production schema using a fresh read-only catalog audit.
- [ ] Schedule an approved maintenance window before export.
- [ ] Export the exact target D1 database and verify the original artifact's size and SHA-256 digest.
- [ ] Restore the export into a separate disposable D1 database; verify the disposable ID before importing.
- [ ] Capture pre-migration schema, row counts, key identities, and index definitions.
- [ ] Apply only `docs/forward-migrations/2026-10-29-live-schema-forward.sql` to the disposable copy.
- [ ] Run `scripts/verify-d1-migration.sql` and `scripts/audit-d1-schema.sql` on the disposable copy.
- [ ] Compare before/after row counts and all preserved legacy values; inspect foreign-key checks and unique conflict targets.
- [ ] Exercise Worker read/write paths in a non-production environment with test data.
- [ ] Have a second reviewer approve the evidence and record an explicit go/no-go decision.

## Important distinction

`migrations/0006_worker_schema_compat.sql` reconciles the **fresh-install** schema and is not a substitute for the forward-only production migration. Do not apply the fresh-install migration to the existing production database. Likewise, passing `scripts/test-forward-migration.py` means the candidate SQL passes the synthetic fixture; it does not prove the live export matches that fixture.

## Current evidence

- Latest synthetic fixture CI: [Run #429](https://github.com/pkdiv6548/Photography/actions/runs/41202495347) — passed.
- Real production export and disposable restore: **not performed**.
- Production schema compatibility: **pending**.
- Production migration: **not authorized and not performed**.
