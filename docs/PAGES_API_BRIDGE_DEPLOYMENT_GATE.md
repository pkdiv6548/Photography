# Pages API bridge deployment gate

This runbook is intentionally a checklist, not an automatic deploy. Do not enable the bridge in production until the live D1 backup and forward migration have been verified.

## 1. Required code path

functions/api/[[path]].ts forwards /api/* requests to the single Worker handler in worker/index.ts. This avoids maintaining a separate API implementation inside Pages Functions.

## 2. Database gate — do not skip

1. Export the existing golden-films-db with a supported Cloudflare D1 export/backup method.
   - **Availability warning:** Cloudflare documents that a running D1 SQL export blocks other database requests until the export completes. Do not start this export under the no-downtime requirement without first confirming a supported non-blocking backup option, or obtaining explicit approval for a planned maintenance window. Never assume the export is harmless just because it is read-only.
   - Before any production export, confirm the current backup/time-travel options and database storage version with Cloudflare's current documentation and account configuration.
   - **Time Travel is not a disposable clone:** Cloudflare's Time Travel restore endpoint restores the selected point in time onto the specified database itself. Do not call restore against production to test a migration or to create a test copy; that can roll back live data. A read-only bookmark lookup is safe for inspection, but it does not produce a restorable export or clone.
   - Cloudflare's D1 backup Workflow example automates polling and storing the export in R2; it does not remove the documented export availability limitation. Do not create an R2 bucket or paid resources without explicit approval.
2. Download the export and restore it to a disposable database.
3. Run docs/forward-migrations/2026-10-29-live-schema-forward.sql against that restored copy.
4. Verify:
   - enquiries.consent exists and historical rows default to consent 0.
   - site_content and site_content_revisions exist.
   - Existing categories, projects, project_translations, project_media, admin tables and rows are preserved.
   - The Worker regression tests and GET /api/ready pass against the migrated test database.
5. Only after the restored copy passes, schedule and authorize the production migration. Do not apply the baseline migrations 0001–0004 to the existing database as a group: the migration history and live schema have drifted.

## 3. Cloudflare Pages bindings

Configure both preview and production environments in the Pages project:

- D1 binding name: DB
- D1 database ID: 0241231b-6e6c-410b-a5ac-958eeb424a78
- Secret binding: ADMIN_SETUP_SECRET using Cloudflare's secret-text setting, not a plain-text variable.

Do not copy a real secret into source code, a commit, a URL, or browser JavaScript. Generate a high-entropy value in a password manager and configure it as a Cloudflare secret. Keep preview and production secrets separate where possible.

R2 is optional. Only configure MEDIA_BUCKET after explicitly deciding to enable R2 and checking current free-tier limits and billing implications. Until then, file upload endpoints must remain fail-closed; hosted HTTPS URLs still work.

## 4. Deploy and verify

After the database gate and bindings are approved:

1. Merge the Pages API bridge.
2. Wait for the production Pages deployment to complete successfully.
3. Verify GET /api/health returns 200 and GET /api/ready returns the legacy-compatible ready response.
4. Verify GET /api/content?page=home returns published content only.
5. Create the first owner once, through POST /api/admin/setup with the x-admin-setup-secret header and a JSON body containing a valid email and a 14–128 character password. Do this from a trusted HTTPS client; never expose the secret in a public form or URL.
6. Sign in at /login, verify /api/admin/session includes the role, and test the enquiry inbox, draft/publish flow, revision restore, project manager, audit log and status panel.
7. As owner, create an editor account; verify editor access can save drafts but receives 403 for publishing, public-media controls, audit logs and admin-user management.
8. Submit a test enquiry and verify the consent field, rate limit, status, and audit data. Do not use a real visitor's data for the smoke test.


## Latest live-schema preflight (2026-10-29)

Read-only Cloudflare D1 API queries were run against the configured production database. These queries made no writes.

- The live database has the legacy application tables; no `d1_migrations` table was found, so the applied migration history cannot be inferred from that table.
- `admin_users` currently has 0 rows.
- `admin_setup` currently has 1 row with `completed_at IS NULL`; owner setup has not been completed.
- `enquiries.consent` is absent.
- `site_content` and `site_content_revisions` are absent.
- The reviewed forward migration has not been applied to production.
- The latest Cloudflare Pages deployment on `main` is a production static deployment with `uses_functions: false`; the API bridge exists on the preview branch deployment with `uses_functions: true`.
- The Pages project API response showed `deployment_configs.preview.env_vars` and `deployment_configs.production.env_vars` as null, while the latest deployment's `env_vars` was empty. This response alone does **not** prove whether runtime D1 bindings or secrets are configured; verify those in the Cloudflare Pages runtime/bindings configuration before calling the API gate passed.
- Direct HTTPS smoke requests from the current execution environment could not resolve the preview hostname (DNS/network restriction). Treat API runtime checks as **not verified**, not as passing or as proof the service is down.

### Current gate result

The backup/restore gate remains blocked: no verified SQL export has been downloaded and restored to a disposable database. Do not run the forward migration on production, do not use Time Travel restore against production as a test, and do not merge this bridge until the required safety gates pass.

## Current state

The bridge is in a draft PR. No Pages bindings were changed, no Worker was deployed, no secret was configured, no R2 bucket was created, and no production D1 migration was applied.

## Operator decision — 2026-10-29 (P0 continuation)

The operator has explicitly chosen **not to create a backup at this time**. Until that decision changes:

- Do not start a D1 export, backup, restore, Time Travel restore, or production migration.
- Do not bind the production D1 database to a preview deployment just to make preview readiness pass; preview write-capable routes could affect live data.
- Do not merge or enable the Pages API bridge in production while the schema and runtime binding gates remain unverified.
- Continue only with repository-level checks, code/test improvements, read-only configuration inspection, and isolated synthetic tests that do not connect to production.
- Keep the production site on its existing deployment until a safe database migration path is explicitly approved.

This decision does not count as backup/restore progress; that gate remains at its prior status and is intentionally paused.

## Repository verification update — 2026-10-29

- Commit `f6860ab2de11209244d01b9796b1e95104f0bf19` added a Worker health-response regression test asserting `Cache-Control: no-store` and JSON `Content-Type`.
- GitHub Actions run [40868771741](https://github.com/pkdiv6548/Photography/actions/runs/40868771741) completed successfully. The frontend/Worker typecheck, Worker API regression tests, forward-migration SQLite fixture test, and frontend build all passed.
- This is repository/fixture evidence only. It does not verify the deployed preview API runtime, production D1 compatibility, or authorize production activation.
