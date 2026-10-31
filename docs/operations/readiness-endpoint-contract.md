# API Readiness Endpoint Contract

## Purpose

`GET /api/health` is a lightweight process/route health check. A `200` response confirms that the Worker can answer the request; it does **not** prove the database schema, admin configuration, or media storage is ready for launch.

`GET /api/ready` checks whether the D1 binding is present and whether required legacy-compatible table columns can be queried. If D1 is absent it returns `503 database_not_configured`; if required columns are missing it returns `503 database_schema_incompatible`.

When schema checks pass, `/api/ready` currently returns HTTP `200` with `status: "ready"` and a `blockers` array. Consumers and release operators must treat a non-empty `blockers` array as **not launch-ready**, even though the HTTP status is 200. Current blocker values include:

- `admin_setup_secret_missing`: the admin bootstrap secret is not configured.
- `supabase_storage_not_configured`: one or more of `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or `SUPABASE_STORAGE_BUCKET` is missing.
- `admin_setup_already_completed`: initial admin setup is already complete, so the one-time setup operation should not be repeated. This is a setup-operation guard, not proof that the normal admin login is broken.

The endpoint returns configuration booleans only. It must never return secret values or authorization headers.

## Launch acceptance checks

Before declaring the site launch-ready:

1. Confirm the Production Pages project has the intended `DB` binding pointing to the approved Production D1 database.
2. Confirm Production secrets `ADMIN_SETUP_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` are configured through the provider dashboard/secret manager. Never put secret values in Git, issue comments, logs, or chat.
3. Confirm `SUPABASE_URL` and `SUPABASE_STORAGE_BUCKET` point to the intended Supabase project and private media bucket.
4. Call `/api/ready` from an authorized environment and inspect the JSON body; do not use `/api/health` alone as acceptance evidence.
5. Verify admin login, portfolio CRUD, media upload/download/delete, publication privacy, enquiry submission, and the 100 MiB UTC-calendar-month upload quota in a safe test environment.
6. Confirm a current Production backup and a successful restore to a disposable database before applying any Production schema migration.
7. Record the response status, blocker list, tested deployment/commit, and test results without recording secrets or personal data.

## Important limitation

A passing unit test validates the Worker contract against a test double. It does not verify the actual Cloudflare Production bindings, secrets, live D1 schema/data, Supabase credentials, or browser behavior. Keep launch status blocked until those external checks are independently completed.
