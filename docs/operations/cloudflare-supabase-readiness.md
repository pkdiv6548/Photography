# Cloudflare Pages and Supabase configuration readiness

Review date: 2026-10-31
Branch: `feat/supabase-storage-free-tier`

Status: **read-only configuration check completed; Production is blocked pending operator verification/configuration; live API remains unverified**.

This document is an operator checklist, not authorization to change Production. Never paste secrets into issues, pull requests, source files, logs, or chat.

## Required bindings and variables

| Setting | Preview | Production | Safe verification |
|---|---|---|---|
| Cloudflare Pages Worker / Functions code | Confirm feature branch deployment | Confirm intended release deployment | Inspect deployment commit and build result |
| D1 binding `DB` | Bind only the designated preview/test database | Must point to the approved production D1 ID | Inspect binding name and database ID in dashboard; do not run writes |
| `SUPABASE_URL` | Set the project URL for the test project | Set the approved Supabase project URL | Confirm URL/project identity; never log auth headers |
| `SUPABASE_STORAGE_BUCKET` | `golden-films-media` or approved test bucket | Confirm intended private bucket exists | Check bucket privacy and exact name |
| `SUPABASE_SERVICE_ROLE_KEY` | Not present in the latest Pages project variable-name listing; configure securely before upload integration tests | Not present in the latest Pages project variable-name listing; configure securely before production upload | Check only presence via dashboard; never print or expose value |
| `ADMIN_SETUP_SECRET` | Variable name is present in the latest Pages project listing; verify its secret value is set and valid before initial admin setup | Not present in the latest Pages project variable-name listing; configure securely before production admin setup | Check only presence; use a strong unique secret stored in secret manager |
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

## Latest read-only Cloudflare configuration check

Checked on 2026-10-31 using the Cloudflare Pages project configuration API for `golden-films`. Only variable names and binding presence were inspected; no secret values or database IDs were read or exposed.

- Production deployment currently points to commit `de77fe22b606ec64b2c5ba290cf7fde21b218120` (deployment created `2026-10-30T12:11:07Z`); the latest feature-branch Preview deployment is a separate deployment and is not Production.
- Project subdomain is `golden-films.pages.dev`; Cloudflare returned no custom domains for this project.
- Preview configuration lists a `DB` binding. Production configuration does not list a `DB` binding. This is a confirmed configuration discrepancy; verify the intended production database identity in the dashboard before making any change.
- `SUPABASE_SERVICE_ROLE_KEY` is absent from the variable-name listing in both environments. Do not run upload integration tests until an authorized operator configures it securely.
- Preview lists `ADMIN_SETUP_SECRET` by name; Production does not. Presence of a name alone does not prove the secret value is valid.
- `SUPABASE_URL` and `SUPABASE_STORAGE_BUCKET` names are present in both environments, but the project identity and private bucket settings have not been independently verified.
- Live `/api/health` and `/api/ready` requests remain unverified because the available outbound request environment could not access the endpoints. This is not evidence that the endpoints themselves failed.
- No Production secrets, database migrations, bindings, or configuration values were changed during this check.

## Stop conditions

Stop and ask the authorized operator for review if a database ID is unexpected, the bucket is public, any secret value appears in logs, readiness reports an incompatible schema, or any test would mutate Production without an approved change window.
