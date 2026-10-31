# Cloudflare Pages and Supabase configuration readiness

Review date: 2026-10-31
Branch: `feat/supabase-storage-free-tier`

Status: **configuration checklist prepared; live configuration remains partially unverified**.

This document is an operator checklist, not authorization to change Production. Never paste secrets into issues, pull requests, source files, logs, or chat.

## Required bindings and variables

| Setting | Preview | Production | Safe verification |
|---|---|---|---|
| Cloudflare Pages Worker / Functions code | Confirm feature branch deployment | Confirm intended release deployment | Inspect deployment commit and build result |
| D1 binding `DB` | Bind only the designated preview/test database | Must point to the approved production D1 ID | Inspect binding name and database ID in dashboard; do not run writes |
| `SUPABASE_URL` | Set the project URL for the test project | Set the approved Supabase project URL | Confirm URL/project identity; never log auth headers |
| `SUPABASE_STORAGE_BUCKET` | `golden-films-media` or approved test bucket | Confirm intended private bucket exists | Check bucket privacy and exact name |
| `SUPABASE_SERVICE_ROLE_KEY` | Missing in last recorded review; configure securely before upload integration tests | Not confirmed; configure securely before production upload | Check only presence via dashboard; never print or expose value |
| `ADMIN_SETUP_SECRET` | Missing in last recorded review; configure securely before initial admin setup | Not confirmed; configure securely before production admin setup | Check only presence; use a strong unique secret stored in secret manager |
| Admin owner account | Use test-only account | Create only after schema and secret gates pass | Verify role and login using an authorized private session |

## Preview acceptance gates

- [ ] Confirm Pages project and preview deployment commit.
- [ ] Confirm `DB` points to the intended disposable/test database, not Production.
- [ ] Configure `SUPABASE_URL`, bucket name, and service-role key in Preview environment settings.
- [ ] Configure `ADMIN_SETUP_SECRET` in Preview environment settings.
- [ ] Confirm the Supabase bucket is private and upload size policy matches the Worker limit.
- [ ] Run readiness endpoint and verify it reports expected blockers only.
- [ ] Verify unauthenticated upload and admin calls are rejected.
- [ ] Verify a test upload, quota reservation, public proxy publication check, and deletion/cleanup with test data only.
- [ ] Do not copy production secrets or customer data into Preview.

## Production acceptance gates

- [ ] Confirm Pages project, custom domain, deployment commit, and Production environment.
- [ ] Confirm D1 binding identity against the approved production database ID.
- [ ] Complete the backup/disposable-restore and schema compatibility gates documented in the companion runbooks.
- [ ] Set production variables/secrets through Cloudflare's secret management UI; never commit values.
- [ ] Confirm the private Supabase bucket and project identity with an authorized operator.
- [ ] Run read-only health/readiness checks and record sanitized status codes.
- [ ] Verify admin authentication, enquiry submission, upload quota, and media visibility using an approved controlled test plan.
- [ ] Obtain a separate explicit go/no-go approval before any production migration, deployment promotion, or customer-facing write test.

## Known outstanding items from the last recorded review

- Preview `SUPABASE_SERVICE_ROLE_KEY` was not configured.
- Preview `ADMIN_SETUP_SECRET` was not configured.
- Production `DB` binding and the two secrets were not confirmed.
- Live endpoint checks were blocked by the available outbound request policy; this is not evidence that the endpoints themselves failed.
- No Production secrets, database migrations, or configuration values were changed by preparing this checklist.

## Stop conditions

Stop and ask the authorized operator for review if a database ID is unexpected, the bucket is public, any secret value appears in logs, readiness reports an incompatible schema, or any test would mutate Production without an approved change window.
