# Admin Release Work Breakdown

## Latest continuation update — 2026-10-30 (authenticated logout CI)

- [x] Added an authenticated logout regression test that verifies session deletion, a logout audit insert, and expiration of the `__Host-gf_admin` cookie with `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/`, and `Max-Age=0`.
- [x] Added the missing authenticated-session D1 test fixture so the logout test exercises the authenticated route path.
- [x] GitHub Actions run #285 passed on head `6273866e635390bdb8154e6bd605ae913b8cc75c`: https://github.com/pkdiv6548/Photography/actions/runs/41047499943. All nine main workflow steps passed, including typecheck, Worker regression tests, both SQLite fixtures, and frontend build.
- [ ] This CI pass does not prove Preview browser/API E2E or compatibility against a restored production D1 export.
- [ ] Authenticated browser E2E, CMS E2E, isolated Preview R2 media E2E, and production-copy migration rehearsal remain release blockers. PR #81 stays Draft/unmerged; production D1 and production deployment remain untouched.


## Latest continuation update — 2026-10-30 (least-privilege role regression CI)

- [x] CI run #280 passed on current application/test head `986374f9e72e613893b1cb5d5d27aff134d8da52`: https://github.com/pkdiv6548/Photography/actions/runs/41042707694.
- [x] All 9 main workflow steps passed: dependency install, frontend/Worker typecheck, Worker API regression tests, forward-migration SQLite fixture, fresh-schema Worker contract fixture, and frontend build.
- [x] Fresh-schema fixture now checks both the `admin_users.role` column default and the actual inserted value when a new admin omits the role; expected value is `editor`.
- [ ] Passing synthetic SQLite/CI fixtures does not verify deployed Preview login/API E2E or a restored production D1 schema.
- [ ] Production-copy migration rehearsal, isolated Preview R2 media E2E, and authenticated browser tests remain release blockers. PR #81 stays Draft/unmerged; no production database changes were made.

## Latest continuation update — 2026-10-30 (initial-owner regression coverage)

- [x] Added regression coverage for the initial owner setup success path: the SQL explicitly inserts role `owner` and guards the insert on an empty `admin_users` table plus incomplete setup state.
- [x] Added regression coverage that a zero-row guarded insert returns HTTP 409 `initial_setup_already_completed` and uses a transactional D1 batch.
- [x] GitHub Actions run #274 passed on head `0f66f3828c4d92d4dc595ae31cc8aec2942d9221`: https://github.com/pkdiv6548/Photography/actions/runs/41038818256. Dependency installation, frontend/Worker typecheck, Worker API regression tests, forward-migration SQLite fixture, fresh-schema Worker contract fixture, and frontend build all passed.
- [x] Cloudflare Pages reported Preview deployment successful for commit `0f66f38`: https://ab6ce6e9.golden-films.pages.dev. This confirms deployment status only, not live API/D1 end-to-end behavior.
- [ ] Still blocked on browser E2E of setup/login/session/dashboard against isolated Preview, full schema/constraint contract verification, isolated R2 media checks, and migration rehearsal against a verified production export restored to disposable D1.
- [ ] PR #81 remains Draft and unmerged. No production database writes, migration, binding/secret changes, or production deployment were performed.

## Security review update — 2026-10-30

- [x] Identified and corrected a least-privilege issue in the candidate production-copy migration: legacy `admin_users` now receive `role='editor'` by default instead of being silently elevated to owner.
- [x] Updated the SQLite forward-migration fixture to assert that existing legacy accounts remain editors and that the new column default is editor.
- [x] Documented the required deliberate, audited owner promotion path in `docs/PRODUCTION_D1_MIGRATION_GATE.md`.
- [x] GitHub Actions run #272 passed on current head `ba3238e8def242ef264105220b5010ff0cceb9a9`: https://github.com/pkdiv6548/Photography/actions/runs/41031213282. All 9 main steps passed, including frontend/Worker typecheck, Worker API regression tests, least-privilege forward-migration SQLite fixture, fresh-schema Worker contract fixture, and frontend build.
- [ ] Still requires testing against a verified export restored into a disposable D1 database. No production database was modified.

## Latest continuation update — 2026-10-30 (migration security CI)

- [x] Forward migration now defaults legacy admin accounts to `role='editor'`, not `owner`, avoiding silent privilege escalation.
- [x] Regression fixture verifies both the migrated legacy account role and the column default are `editor`.
- [x] CI run #272 passed on current head `ba3238e8def242ef264105220b5010ff0cceb9a9`: https://github.com/pkdiv6548/Photography/actions/runs/41031213282.
- [x] All 9 main workflow steps completed successfully: dependency install, frontend/Worker typecheck, Worker API regression tests, forward-migration fixture, fresh-schema contract fixture, and frontend production build.
- [ ] Still requires testing against a verified production export restored into a disposable D1 database; CI's synthetic SQLite fixture is not a substitute.
- [ ] Live Preview authentication/API browser E2E remains unverified; the latest PR head is not confirmed deployed to Preview.
- [ ] PR #81 remains Draft/unmerged. No production database write or migration was performed.

## Latest continuation update — 2026-10-30

- [x] Fixed the contact form service values so the frontend submits the exact service slugs accepted by the Worker API; unsupported `Other` was removed from the selectable values.
- [x] Latest code head: `e41a00255f9fb1288fad2f2d0af419a0ce9212f6`.
- [x] GitHub Actions run #267 succeeded on this head: https://github.com/pkdiv6548/Photography/actions/runs/41017710044. All nine workflow steps completed, including dependency installation, frontend/Worker typecheck, Worker API regression tests, forward-migration fixture, fresh-schema contract fixture, and production frontend build.
- [x] Cloudflare Pages Preview deployment for the contact-form fix was reported successful: https://15ebebd8.golden-films.pages.dev.
- [ ] Do not treat a green build or successful static deployment as proof of live API functionality. The available HTTP probe environment blocks requests by policy; Preview browser/API E2E remains unverified.
- [ ] Production-copy migration rehearsal, admin/auth/CMS E2E, and media tests with an isolated R2 binding remain release blockers.
- [ ] PR #81 remains Draft and unmerged. No production database writes, migrations, secrets/bindings changes, or production deployment were performed.

Status: in progress. This plan separates release blockers into small, verifiable gates. Production D1 and production deployment must remain unchanged until all required gates pass and explicit approval is received.

## Part 1 — Code and build contract (PASS)
- [x] Route Pages Functions `/api/*` through the shared Worker implementation.
- [x] Include Pages Functions in Worker TypeScript validation.
- [x] Pass frontend and Worker TypeScript checks, Worker regression tests, fresh-schema fixture, forward-migration fixture, and frontend production build through CI run #261 on head `8098179` (run ID `41011104006`).
- [x] Confirm the latest preview deployment completed and reports Pages Functions enabled.

## Earlier CI verification
- [x] CI run #259 passed all 9 main workflow steps on code head `3c2940e00f461f78c8e7726502e9d99c1c7d9c35` (run ID `41010685254`).
- [x] CI run #258 passed all 9 main workflow steps on prior head `e511861368119625ed05e26df90acbdb3cdb057c` (run ID `41010442022`).
- [x] CI run #257 passed all 9 main workflow steps on code head `899319fccb156e877d198c6e20bb11b0f0d0d9fb` (run ID `41010260519`).
- [x] The transactional initial-owner setup test expectations were corrected; the regression suite passes on the code head.

## Latest CI verification (2026-10-30)
- [x] CI run #261 passed all main workflow steps on head `8098179b39e243473303a79a638d81c564dbea93` (run ID `41011104006`): https://github.com/pkdiv6548/Photography/actions/runs/41011104006.
- [x] The translation-save SQL now sets both legacy `language` and `locale` columns to satisfy the original schema's `language NOT NULL` constraint.
- [x] CI run #260 passed on documentation head `483a8f4ab0f840de17f4c4d804abdc083d406171` (run ID `41011057822`).
- [x] CI run #259 passed on prior code head `3c2940e00f461f78c8e7726502e9d99c1c7d9c35` (run ID `41010685254`).
- [ ] Live Preview API and browser E2E remain unverified; deployment is still on older code head `b9c5301`.

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
