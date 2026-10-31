# Live API smoke-test runbook

Date: 2026-10-31
Branch: `feat/supabase-storage-free-tier`

Purpose: provide a low-risk, read-only first pass for verifying the deployed Golden Films API. A successful CI run does not prove the deployed Pages URL points to the same commit or that production secrets are configured.

## 1. Confirm the target

Before testing, verify in Cloudflare Pages:
- the production project name and custom domain;
- the most recent successful production deployment commit;
- that the URL below is the actual assigned production URL, not a guessed preview URL.

Replace `https://YOUR-PRODUCTION-DOMAIN` below with the confirmed domain.

## 2. Read-only checks

Run from a trusted terminal:

```sh
BASE_URL='https://YOUR-PRODUCTION-DOMAIN'
curl --fail-with-body --silent --show-error --max-time 15 -D /tmp/gf-health.headers "$BASE_URL/api/health" -o /tmp/gf-health.json
curl --fail-with-body --silent --show-error --max-time 15 -D /tmp/gf-ready.headers "$BASE_URL/api/ready" -o /tmp/gf-ready.json
cat /tmp/gf-health.headers
cat /tmp/gf-health.json
cat /tmp/gf-ready.headers
cat /tmp/gf-ready.json
```

Do not publish raw logs if they contain cookies, tokens, email addresses, or internal infrastructure identifiers. The readiness endpoint must never return secret values.

## 3. Interpret readiness

- HTTP 200 alone is not enough. Inspect the JSON body and its `blockers` array.
- `mediaStatus: "blocked"` or `supabase_storage_not_configured` means media uploads must not be treated as launch-ready.
- Missing `ADMIN_SETUP_SECRET` means first-time admin setup is blocked.
- `admin_setup_already_completed` is informational for an already-initialized site; do not rerun setup.
- A compatible schema status is not proof that the configured database is the intended production database.

Record only: timestamp, confirmed deployment commit, HTTP status codes, boolean readiness fields, and blocker names.

## 4. Authentication negative checks

These requests should be rejected without changing data:

```sh
curl --silent --show-error --max-time 15 -i "$BASE_URL/api/admin/content"
curl --silent --show-error --max-time 15 -i "$BASE_URL/api/admin/content/revisions?page=home"
```

Expected outcome: HTTP 401 with an unauthorized error. If either request returns protected content, stop release activity and investigate.

## 5. Not covered by this read-only runbook

Do not test live enquiry creation, media upload/delete, admin setup, database migrations, or publishing against production without an approved change window and a controlled test plan. Use a disposable preview environment for write-path tests and clean up test data afterward.

## Current known limitation

The prior verification attempt could not access the candidate `golden-films.pages.dev` URL from the available environment. This is an access limitation, not proof that the deployment is down. Confirm the actual Pages URL and deployment commit in the Cloudflare dashboard before recording live verification as passed.
