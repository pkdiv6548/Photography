# Admin Release Work Breakdown

Status: in progress. This plan separates the release blockers into small, verifiable gates. Production D1 and production deployment must remain unchanged until all required gates pass and explicit approval is received.

## Part 1 — Code and build contract (PASS)
- [x] Route Pages Functions `/api/*` through the shared Worker implementation.
- [x] Include Pages Functions in Worker TypeScript validation.
- [x] Pass frontend build, Worker regression tests, fresh-schema fixture, and forward-migration fixture in CI run #248.
- [x] Confirm the preview deployment completed and reports Pages Functions enabled.

## Part 2 — Isolated preview database (SCHEMA APPLIED; VERIFICATION IN PROGRESS)
- [x] Create a separate D1 database named `golden-films-preview-test`; do not use production D1.
- [x] Apply the repository's fresh-install migrations 0001–0006 to this isolated database only.
- [x] Verify expected tables exist, category seeds are present, and no admin account was created.
- [ ] Verify all Worker-required columns, constraints, indexes, and foreign keys against the code contract.
- [ ] Configure the Pages **preview** environment to bind `DB` to the isolated database.
- [ ] Configure a preview-only `ADMIN_SETUP_SECRET`; never reuse a production secret.

## Part 3 — Authentication E2E
- [ ] Verify unauthenticated session returns 401 / authenticated=false without leaking data.
- [ ] Verify owner setup rejects missing/wrong secret and invalid passwords.
- [ ] Verify first owner setup succeeds once and repeat setup is rejected.
- [ ] Verify login sets Secure, HttpOnly, SameSite=Strict cookie.
- [ ] Verify session works, logout invalidates the token, and the old session no longer works.
- [ ] Verify rate limiting and audit events on success/failure paths.

## Part 4 — Admin feature E2E
- [ ] Verify dashboard loads with authenticated session.
- [ ] Verify content draft/save/revision/publish behavior.
- [ ] Verify project/category/translation queries against seeded representative rows.
- [ ] Verify media upload and retrieval only after an isolated preview R2 binding is deliberately configured.
- [ ] Verify editor/owner permission boundaries and unauthenticated rejection.

## Part 5 — Production-schema migration rehearsal (BLOCKED until approved backup/restore)
- [ ] Obtain an approved, recoverable production D1 export and checksum.
- [ ] Restore it to a separate disposable D1 database; never use production in-place restore for rehearsal.
- [ ] Inventory the actual restored schema and representative data relationships.
- [ ] Design a forward-only migration for the legacy schema; preserve records and never fabricate consent.
- [ ] Test migration and API integration suite against the restored copy.
- [ ] Repeat from a fresh restored copy and record results.

## Part 6 — Release gate (NOT STARTED)
- [ ] All preview E2E checks pass.
- [ ] Production-copy migration rehearsal passes and is reviewed.
- [ ] Confirm production binding/configuration without changing it.
- [ ] Obtain explicit approval for any production binding/secret change, migration, merge, or deployment.
- [ ] Merge and deploy only after the preceding gates pass.

## Safety rules
- Do not apply migrations 0001–0006 blindly to production.
- Do not point preview at production D1.
- Do not create a real owner account or write production data during verification.
- A green CI build or successful Pages deployment alone does not prove the backend works.
