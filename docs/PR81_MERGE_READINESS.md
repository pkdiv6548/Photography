# PR #81 Merge Readiness Checklist

Current reviewed head: `undefined`

## Verified
- GitHub Actions workflow "Golden Films checks" passed for the reviewed head.
- Admin login, owner setup, and dashboard static pages are included in PR #81.
- The production Pages deployment is separate from this branch preview.

## Not verified — merge remains blocked
- [ ] Fresh database: apply all migrations from zero and test the actual Worker SQL contract.
- [ ] Legacy database: restore a verified production backup into a disposable D1 database.
- [ ] Forward-only migration reviewed and tested on that disposable database.
- [ ] Confirm existing records and relationships are preserved; do not fabricate historical consent.
- [ ] Run end-to-end API tests against the migrated disposable database: readiness, owner setup (including repeat rejection), login, session, logout, CMS save/revision/publish, rate limits, and unauthenticated access.
- [ ] Verify Pages preview is connected to the intended Worker and D1 binding.
- [ ] Re-run CI after any schema/Worker changes.
- [ ] Obtain explicit approval before production database writes or production deployment.

## Decision
Do not merge this PR solely on the basis of passing CI or a static Pages preview. The repository audit documents a material mismatch between `worker/index.ts` and migration `0001_initial_schema.sql`, plus legacy production schema gaps. Keep PR #81 open until the unchecked integration gates above are satisfied.
