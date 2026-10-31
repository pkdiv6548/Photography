# Production D1 backup and disposable-restore preflight

Status: **procedure prepared; backup/restore not yet performed**.
Target database: `golden-films-db` (`0241231b-6e6c-410b-a5ac-958eeb424a78`).
Never run a migration or write query against the target during this preflight.

## Why this gate exists

The production database has a legacy schema that differs from the Worker contract. The forward migration is only a candidate until a real export has been restored and tested. The synthetic SQLite fixture in `scripts/test-forward-migration.py` is useful but is not proof that a production export can be restored.

## Required operator steps

1. **Schedule a maintenance window first.** Cloudflare D1 export may temporarily affect database availability. Do not start an export until the site owner has approved the window and the current traffic impact is understood.
2. In Cloudflare Dashboard, open the intended D1 database by both name and ID. Confirm it is `golden-films-db` / `0241231b-6e6c-410b-a5ac-958eeb424a78`. Do not rely on a display name alone.
3. Use Cloudflare's supported D1 export/download workflow to export the database. Save the raw export outside the repository in access-controlled storage. Do not upload it to GitHub, Notion, chat, or a public bucket: it can contain customer enquiries and authentication-related data.
4. Record the export timestamp, database ID, file size, and SHA-256 digest in a private operational record. Do not record credentials or the export contents in that record.
5. Verify that the export is non-empty and its digest is stable. Keep the original export unchanged as the recovery artifact.
6. Create or select a **disposable, non-production D1 database**. Verify its database ID separately. Never point the restore command at the production ID.
7. Restore/import the export into that disposable database using Cloudflare's currently documented D1 import/execute workflow. If the export format cannot be restored cleanly, stop and investigate; do not edit the only copy of the export.
8. On the disposable copy only, capture schema and row-count evidence before any candidate migration. Run `scripts/audit-d1-schema.sql` and save its output privately.
9. Apply the candidate `docs/forward-migrations/2026-10-29-live-schema-forward.sql` to the disposable copy only. Then run `scripts/verify-d1-migration.sql`, compare the before/after row counts and identity data, check all foreign keys, and run the Worker API regression suite against a test environment.
10. Confirm the intended nullable-email behavior, historical consent default of `0`, admin role defaults, CMS tables, monthly quota table, required unique conflict targets, and Worker readiness. Record pass/fail for every gate.
11. If any unexpected row-count difference, missing column/index, broken reference, import warning, or test failure occurs, stop. Preserve the disposable database and logs for diagnosis. Do not proceed to production.
12. Production migration requires a separate reviewed change, verified recovery artifact, passing disposable-restore evidence, approved maintenance window, and explicit go/no-go decision. This document does not authorize production writes.

## Acceptance checklist

- [ ] Correct production database identity confirmed (name and ID)
- [ ] Maintenance window approved before export
- [ ] Raw export downloaded successfully and kept private
- [ ] Export file size and SHA-256 recorded; original export unchanged
- [ ] Disposable database identity verified as non-production
- [ ] Restore/import completed without warnings or errors
- [ ] Pre-migration schema audit and row counts saved
- [ ] Candidate migration applied only to disposable database
- [ ] Post-migration verification SQL passed
- [ ] Data preservation and foreign-key checks passed
- [ ] Worker regression tests and readiness checks passed
- [ ] Independent review and explicit production go/no-go recorded

## Current result

No production export or restore has been performed as part of preparing this runbook. Production schema/data have not been changed. The next step requires an operator with Cloudflare account access to schedule and execute the export/restore; it is not safe to simulate this gate using only a synthetic fixture.
