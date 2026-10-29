# Pages API bridge deployment gate

This runbook is intentionally a checklist, not an automatic deploy. Do not enable the bridge in production until the live D1 backup and forward migration have been verified.

## 1. Required code path

functions/api/[[path]].ts forwards /api/* requests to the single Worker handler in worker/index.ts. This avoids maintaining a separate API implementation inside Pages Functions.

## 2. Database gate — do not skip

1. Export the existing golden-films-db with a supported Cloudflare D1 export/backup method.
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
6. Sign in at /login, verify /api/admin/session, and test the enquiry inbox, draft/publish flow, revision restore, project manager, audit log and status panel.
7. Submit a test enquiry and verify the consent field, rate limit, status, and audit data. Do not use a real visitor's data for the smoke test.

## Current state

The bridge is in a draft PR. No Pages bindings were changed, no Worker was deployed, no secret was configured, no R2 bucket was created, and no production D1 migration was applied.
