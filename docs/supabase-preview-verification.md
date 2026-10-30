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

- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` as a Cloudflare Pages **server-side Secret** in Preview.
- [ ] Set a strong Preview-only `ADMIN_SETUP_SECRET` as a server-side Secret.
- [ ] Confirm Preview has the expected D1 binding and the additive migration `migrations/0099_gf_monthly_media_usage.sql`.
- [ ] Redeploy Preview after changing runtime settings, then confirm the deployment completed.

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
| Unsupported type / over 20 MiB | Preview | Request rejected; quota unchanged | Not run | Blocked | |
| Shared 100 MiB monthly quota | Disposable/test environment | Over-limit upload rejected across admins | Not run | Blocked | |
| Delete and unpublished-media access | Preview test assets | Deleted asset no longer served; draft asset inaccessible publicly | Not run | Blocked | |
| Enquiry validation and persistence | Preview | Valid test enquiry persists; invalid input rejected | Not run | Blocked | |
| Mobile and page-by-page regression | Preview | Layout/navigation/content behave as intended | Not run | Blocked | |

Use **Blocked** rather than **Pass** when a prerequisite such as secrets, D1 binding, migration, or deployment is not ready. Attach sanitized logs or screenshots where useful. Do not include production customer data in test evidence.
