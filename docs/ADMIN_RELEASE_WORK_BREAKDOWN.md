# Admin Release Work Breakdown

Status: in progress. This plan separates release blockers into small, verifiable gates. Production D1 and production deployment must remain unchanged until all required gates pass and explicit approval is received.

## Part 1 — Code and build contract (PASS)
- [x] Route Pages Functions `/api/*` through the shared Worker implementation.
- [x] Include Pages Functions in Worker TypeScript validation.
- [x] Pass frontend and Worker TypeScript checks, Worker regression tests, fresh-schema fixture, forward-migration fixture, and frontend production build in CI run #259 on current head `3c2940e` (run ID `41010685254`).
- [x] Confirm the latest preview deployment completed and reports Pages Functions enabled.

## Latest CI verification
- [x] CI run #259 passed all 9 main workflow steps on current head `3c2940e00f461f78c8e7726502e9d99c1c7d9c35` (run ID `41010685254`).
- [x] CI run #258 passed all 9 main workflow steps on prior head `e511861368119625ed05e26df90acbdb3cdb057c` (run ID `41010442022`).
- [x] CI run #257 passed all 9 main workflow steps on code head `899319fccb156e877d198c6e20bb11b0f0d0d9fb` (run ID `41010260519`).
- [x] The transactional initial-owner setup test expectations were corrected; the regression suite passes on the code head.

## Part 2 — Isolated preview database and config (CONFIGURED; LIVE API VERIFICATION BLOCKED)
- [x] Create separate D1 database `golden-films-preview-test`; do not use production D1.
- [x] Apply migrations 0001–0006 only to this isolated database.
- [x] Verify required Worker columns and category seed data; no admin user was created.
- [x] Bind Pages Preview `DB` to the isolated D1 database.
- [x] Configure a randomly generated preview-only `ADMIN_SETUP_SECRET` as a secret-text variable. The value is not stored in this document or exposed in output.
- [x] Redeploy after configuration: deployment `8a214e0f-7755-48d4-a967-7a2ae77c42ec` succeeded and reports `uses_functions: true`.
- [ ] Complete live API verification. Direct HTTP probes from the available execution environment are blocked with a tool/network policy 403, which is not an application response. Do not interpret this as an API failure or success.
- [ ] Verify all constraints, indexes, and foreign keys against the full Worker SQL contract, beyond the column checks already run.

## Part 3 — Authentication E2E (NOT YET VERIFIED)
- [ ] Verify unauthenticated `GET /api/admin/session` returns 401 and `{"authenticated":false}`.
- [ ] Verify owner setup rejects missing/wrong secret and invalid passwords.
- [ ] Verify first owner setup succeeds once and repeated setup is rejected.
- [ ] Verify login sets Secure, HttpOnly, SameSite=Strict cookie.
- [ ] Verify session works, logout invalidates token, and old session no longer works.
- [ ] Verify rate limiting and audit events on success/failure paths.
- [ ] Perform these tests only against the isolated preview database; do not create a production admin user.

## Part 4 — Admin feature E2E (NOT YET VERIFIED)
- [ ] Verify dashboard loads with authenticated session.
- [ ] Verify content draft/save/revision/publish behavior.
- [ ] Verify project/category/translation queries against representative seed rows.
- [ ] Verify media upload and retrieval only after an isolated preview R2 binding is deliberately configured.
- [ ] Verify editor/owner permission boundaries and unauthenticated rejection.

## Part 5 — Production-schema migration rehearsal (BLOCKED until approved backup/restore)
- [ ] Obtain an approved, recoverable production D1 export and checksum.
- [ ] Restore it into a separate disposable D1 database; never use production in-place restore for rehearsal.
- [ ] Inventory actual restored schema and representative data relationships.
- [ ] Design a forward-only migration preserving existing rows; never fabricate user consent.
- [ ] Test migration and API integration suite against the restored copy.
- [ ] Repeat from a fresh restored copy and record results.

## Part 6 — Release gate (NOT STARTED)
- [ ] All preview E2E checks pass.
- [ ] Production-copy migration rehearsal passes and is reviewed.
- [ ] Confirm production binding/configuration without changing it.
- [ ] Obtain explicit approval for any production binding/secret change, migration, merge, or deployment.
- [ ] Merge and deploy only after preceding gates pass.

## Safety rules
- Do not apply migrations 0001–0006 blindly to production.
- Do not point preview at production D1.
- Do not create a real owner account or write production data during verification.
- A green CI build or successful Pages deployment alone does not prove the backend works.
- The Pages deployment build logs show a non-fatal warning that `wrangler.toml` lacks `pages_build_output_dir`; the Functions directory was still found, compiled, uploaded, and the deployment succeeded. Do not change the production Worker configuration to silence this warning without a separate review.
