# Production D1 Migration Gate — Golden Films

Status: BLOCKED — do not apply migrations to production yet.

## Known facts

- Production D1 database: `golden-films-db`.
- The production schema has no `d1_migrations` history table; the original migration sequence cannot be assumed.
- Production `enquiries` is missing `consent`; current Worker code expects the current contract.
- Production `admin_users` is missing `role`; migration `0005_admin_roles.sql` assumes `admin_users` already exists.
- Production is missing `site_content` and `site_content_revisions`, which are created by `0004_site_content_cms.sql`.
- `0001_initial_schema.sql` is not a safe blanket migration for an existing database: it contains baseline table/index creation and seed inserts, while production already has legacy data/schema.
- `0003_admin_auth_foundation.sql` and `0004_site_content_cms.sql` are marked additive, but still require a verified restore and schema review before use.

## Mandatory preflight

1. Confirm the target database ID and account, and ensure the production site remains unchanged.
2. Obtain a recoverable backup/export using an approved maintenance plan; record its timestamp and checksum.
3. Restore the backup into a separate disposable D1 database. Never use a production in-place Time Travel restore as a test.
4. Capture `sqlite_master` and `PRAGMA table_info(...)` for every table touched by the Worker and migrations.
5. Compare the restored schema to the actual SQL statements in `worker/index.ts`; specifically inspect `enquiries`, `admin_users`, `admin_sessions`, `admin_setup`, `auth_rate_limits`, `audit_logs`, `site_content`, and `site_content_revisions`.
6. Design a forward-only migration that preserves all existing rows, handles legacy nullable email values, adds consent without fabricating user consent, and adds role without weakening access controls.
7. Apply the candidate migration only to the disposable database; verify table definitions, foreign keys, indexes, and data counts before and after.
8. Run Worker API integration tests against that disposable database: readiness, enquiry submission, owner setup (including second setup rejection), login, session, logout, content read/save/revision/publish, rate limits, and unauthenticated access rejection.
9. Repeat restore and migration tests from a fresh copy. Document exact commands, expected results, and rollback/recovery limits.
10. Obtain explicit approval before any production migration, secret change, Worker binding change, PR merge, or production deployment.

## Release gates

- [ ] Verified backup/restore into isolated D1.
- [ ] Forward migration reviewed and tested against restored production schema.
- [ ] Existing records preserved; no fabricated consent values.
- [ ] Worker API tests pass against the migrated disposable database.
- [ ] Preview API is verified end-to-end with real bindings.
- [ ] Production D1 binding and Worker deployment configuration are confirmed.
- [ ] Explicit production-change approval received.

## Current decision

Keep PR #81 open and unmerged. A successful static Pages preview and build/test run do not prove that Worker routes or D1 bindings work. No production writes or migrations have been performed as part of this validation.
