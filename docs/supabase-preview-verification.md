# Supabase Storage Preview Verification Runbook

Use this checklist only in the **Preview** environment and a test admin account. Do not run write tests against Production until the Production D1 schema and binding are repaired and a backup is verified.

## Configure Preview secrets in the Cloudflare dashboard

1. Open the official Cloudflare dashboard: https://dash.cloudflare.com/ and choose the account containing the `golden-films` Pages project.
2. Open **Workers & Pages → golden-films → Settings → Variables and Secrets** (the exact label can vary slightly).
3. Select the **Preview** environment. Do not accidentally edit Production while testing.
4. Add `SUPABASE_SERVICE_ROLE_KEY` as a **Secret**, not plain text. Copy the service-role/secret key from the dedicated Supabase **Photography** project only. Never paste it into chat, source files, GitHub, client-side `VITE_*` variables, browser storage, or shared Postman environments.
5. Add `ADMIN_SETUP_SECRET` as a separate strong, random Preview-only **Secret**. Do not reuse the Supabase key or a production credential. Store it in a password manager.
6. Confirm the existing non-secret variables remain correct: `SUPABASE_URL=https://lxaqpktmnjzbhtcityyc.supabase.co` and `SUPABASE_STORAGE_BUCKET=golden-films-media`.
7. Save the changes and trigger/retry a Preview deployment for branch `feat/supabase-storage-free-tier`. Wait until both build and deploy report success. A secret change is not validated until the new deployment is active.

If the dashboard does not offer the Secret type, stop and resolve account permissions. Do not put a sensitive key into a plain-text variable as a workaround.

## Current prerequisite status

**Latest confirmed automated verification (2026-10-31):** GitHub Actions run [#370](https://github.com/pkdiv6548/Photography/actions/runs/41147511250) (`Golden Films checks`) completed with conclusion `success` for head commit `633c04873105c6e37693e54859319cdb8c44f548`. The workflow's typecheck, Worker API regression tests, forward-migration SQLite fixture, fresh-schema Worker contract fixture, and frontend build passed. Cloudflare Pages Preview deployment for this same commit also reports `success` and uses the branch alias `https://feat-supabase-storage-free-t.golden-films.pages.dev`. This is build/deployment evidence only; it does not confirm live API readiness, browser behavior, real Supabase Storage operations, or Production schema compatibility.

**Configuration and read-only D1 schema audit (Cloudflare API, 2026-10-30):**

- [x] Use the branch Preview alias `https://feat-supabase-storage-free-t.golden-films.pages.dev` to follow the latest successful deployment for this feature branch. Individual immutable deployment URLs change after each new commit. Deployment success confirms build/deploy only, not API readiness.
- [x] Preview D1 binding `DB` is configured to database `golden-films-preview-test` (`21f470cb-776a-4eb2-816e-16605139299a`).
- [x] Read-only schema inspection confirms Preview has `gf_monthly_media_usage`, `admin_users.role`, `enquiries.consent`, `site_content`, and `site_content_revisions`.
- [x] Preview non-secret variables `SUPABASE_URL` and `SUPABASE_STORAGE_BUCKET` are configured.
- [ ] **BLOCKED:** Preview `ADMIN_SETUP_SECRET` secret entry is present but has no configured value.
- [ ] **BLOCKED:** Preview `SUPABASE_SERVICE_ROLE_KEY` is absent from Pages environment configuration.
- [ ] **BLOCKED:** Production project config has no `DB` D1 binding and no `SUPABASE_SERVICE_ROLE_KEY` configured.
- [ ] **BLOCKED:** Read-only schema inspection of Production database `golden-films-db` (`0241231b-6e6c-410b-a5ac-958eeb424a78`) shows it lacks `admin_users.role`, `enquiries.consent`, `site_content`, `site_content_revisions`, and `gf_monthly_media_usage`. The current Worker upload/read routes use the legacy `project_media` table (columns required by the Worker include `id`, `project_id`, `media_type`, `preview_url`, `original_key`, `alt_en`, `alt_hi`, `sort_order`, and `is_public`); verify those exact columns in Production before any rollout. No Production schema or data was changed.
- [ ] **Migration review required:** Candidate forward-only SQL is in `docs/forward-migrations/2026-10-29-live-schema-forward.sql`; its SQLite fixture is `scripts/test-forward-migration.py`. The candidate now includes the shared monthly quota ledger and the fixture checks its schema/constraint, but this is not a Production-ready approval. Restore a verified Production export to a disposable database, run this exact migration and all verification scripts there, compare every Worker SQL query against the restored schema (especially `project_media`), and confirm all existing data is preserved before rollout. Do not execute against Production.
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` as a Cloudflare Pages server-side Secret in Preview and set a strong, Preview-only `ADMIN_SETUP_SECRET`.
- [ ] Validate the Production backup/restore and review the schema migration plan before any Production DB change; do not run the compatibility SQL blindly.
- [ ] Configure and verify Production D1 binding and server-side Supabase secret only after the schema plan is approved.
- [ ] Redeploy Preview after secret changes and rerun runtime verification.

**Runtime probe note:** An attempted API probe from the current verification environment was blocked by its outbound-request policy (HTTP 403 message stated requests to the Pages host are not allowed). This is **not** an observed response from the site's API. Treat `/api/health` and `/api/ready` as **Not verified / Blocked**, and run the smoke checks from a normal browser or permitted network.

## Smoke checks

1. Open the latest Preview deployment URL and check `GET /api/health`; expected HTTP 200 with `{"status":"ok","service":"golden-films-api"}`.
2. Check `GET /api/ready`; expected HTTP 200 only when D1 and all required schema columns/tables are present. A 503 means the API is not ready—do not proceed to upload tests.
3. Use the admin UI to complete first-admin setup with the Preview setup secret. Confirm login works, then sign out and confirm a protected admin route rejects unauthenticated requests.
4. Upload a small test JPEG (<1 MiB) from the admin UI. Confirm it appears in the private `golden-films-media` bucket and renders through the intended app media route; do not make the bucket public.
5. Upload a valid test video under 20 MiB and confirm it can be read through the app route.
6. Confirm an unsupported MIME type and a file larger than 20 MiB are rejected. Confirm failed uploads do not consume monthly quota.
7. In a disposable test environment, exercise the 100 MiB monthly cap with small uploads or controlled mocked quota values. Verify the request that would exceed the limit is rejected and the quota cannot be bypassed by another admin. Do not fill a real project quota with repeated large uploads.
8. Delete the test media through the admin flow and confirm the object is removed or no longer served. Verify draft/unpublished media is not publicly accessible.
9. Submit a clearly marked test enquiry and confirm it persists in Preview D1; then test invalid fields and repeated requests for expected validation/rate-limit behaviour.
10. Record each HTTP status, result, and deployment commit in the PR. Remove test assets and test admin credentials when finished.

## Stop conditions

- Any `/api/ready` 503, schema mismatch, unexplained 5xx, public access to draft media, quota overrun, or missing D1 binding: stop and fix Preview before continuing.
- Do not run the production compatibility SQL or alter Production D1 as part of this runbook.
- Do not merge PR #87 or claim launch readiness until the Preview checks pass and the Production backup/schema/binding plan has been independently verified.

## Verification results log template

Copy this table into the PR comment or a separate test report when running the checklist. Record only outcomes and non-sensitive metadata; **never record secrets, cookies, session tokens, or private media URLs**.

| Check | Environment / commit | Expected result | Actual status / result | Pass / fail / blocked | Notes |
|---|---|---|---|---|---|
| `GET /api/health` | Preview / `<commit SHA>` | HTTP 200, service status `ok` | Not run | Blocked | |
| `GET /api/ready` | Preview / `<commit SHA>` | HTTP 200 when dependencies/schema are ready | Not run | Blocked | |
| Admin login and protected-route denial | Preview test admin | Login succeeds; unauthenticated protected request denied | Not run | Blocked | |
| JPEG upload and media read | Preview test project | Upload succeeds; media served only through app route | Not run | Blocked | |
| MP4/WebM upload and read | Preview test project | Valid video under 20 MiB succeeds | Not run | Blocked | |
| Unsupported type / over 20 MiB | Preview | Request rejected; quota unchanged | Not run | Blocked |
| MIME/signature mismatch (e.g. text payload labelled `image/jpeg`) | Automated Worker test + Preview where practical | HTTP 415 `file_signature_mismatch`; no object or quota reservation | Not run | Blocked | |
| Shared 100 MiB monthly quota | Disposable/test environment | Over-limit upload rejected across admins | Not run | Blocked |
| Automated quota guard (mocked D1 fixture) | GitHub Actions run #370 / commit `633c04873105c6e37693e54859319cdb8c44f548` | Over-limit reservation returns 413 and storage is not contacted | Passed | Pass | Automated regression test only; does not replace live Preview quota verification | |
| Delete and unpublished-media access | Preview test assets | Deleted asset no longer served; draft asset inaccessible publicly | Not run | Blocked | |
| Enquiry validation and persistence | Preview | Valid test enquiry persists; invalid input rejected | Not run | Blocked | |
| Mobile and page-by-page regression | Preview | Layout/navigation/content behave as intended | Not run | Blocked | |

Use **Blocked** rather than **Pass** when a prerequisite such as secrets, D1 binding, migration, or deployment is not ready. Attach sanitized logs or screenshots where useful. Do not include production customer data in test evidence.
