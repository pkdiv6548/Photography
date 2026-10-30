# Supabase Storage Preview Verification Runbook

Use this checklist only in the **Preview** environment and a test admin account. Do not run write tests against Production until the Production D1 schema and binding are repaired and a backup is verified.

## Current prerequisite status

- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` as a Cloudflare Pages **server-side Secret** in Preview. Never put it in Vite/client variables, GitHub, Postman shared environments, or chat.
- [ ] Set a strong Preview-only `ADMIN_SETUP_SECRET` as a server-side Secret.
- [ ] Confirm Preview has the expected D1 binding and the additive migration `migrations/0099_gf_monthly_media_usage.sql`.
- [ ] Redeploy Preview after changing runtime settings, then confirm the deployment completed.

## Smoke checks

1. Open the Preview site and check `GET /api/health`; expected HTTP 200 with `{"status":"ok","service":"golden-films-api"}`.
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
