# Cloudflare Deployment Readiness

Last checked: 2026-10-28

## Current status

- Cloudflare Pages project: `golden-films`
- Expected Pages hostname: `https://golden-films.pages.dev`
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Repository root: `/`
- Latest deployment: none at last check
- The GitHub Actions CI workflow on `main` passed after the latest origin-policy test merge.
- The Cloudflare project exists, but its Git source integration previously returned HTTP 401. Do not treat the hostname as live until a deployment is visible and the site is smoke-tested.

## Unblock Git integration

1. Sign in to the Cloudflare dashboard using the account that owns the `golden-films` Pages project.
2. Open **Workers & Pages → golden-films → Settings → Builds & deployments** (dashboard wording may vary).
3. Check whether a Git provider/repository is connected. If the source connection is missing or unauthorized, reconnect GitHub and authorize the account/repository `pkdiv6548/Photography`.
4. Confirm production branch is `main`, build command is `npm run build`, build output directory is `dist`, and root directory is `/`.
5. Trigger a deployment from `main`. Wait for the build and deployment to complete successfully.
6. Verify the deployment appears under Deployments and the production URL serves the site. A project/subdomain existing by itself is not proof of a live deployment.

## Post-deploy smoke checks

- Open the production hostname over HTTPS and confirm the portfolio renders without a blank page or asset 404s.
- Check `GET /api/health` returns HTTP 200 and `{"status":"ok","service":"golden-films-api"}`.
- Check `GET /api/ready`. A 503 `database_schema_incompatible` is an expected blocker until the legacy D1 schema has been safely migrated; do not bypass this readiness gate.
- Confirm API and static asset responses include security headers.
- Do not submit a real enquiry until the schema is verified. Use test data only after the database migration has been validated.

## D1 safety gate — mandatory

The configured `golden-films-db` contains a legacy schema that does not match the current Worker contract. The Wrangler config points to that existing database. Do **not** run `wrangler d1 migrations apply`, execute DDL/DML, or deploy a write-capable Worker against it until all of the following are complete:

1. Export the intended database and verify the export completed.
2. Restore the export into a disposable database or equivalent isolated SQLite fixture.
3. Review and test the forward migration against that disposable copy.
4. Verify category IDs/slugs/order and English/Hindi translations are preserved.
5. Verify foreign keys, nullable `enquiries.email`, and all admin/auth/settings tables and data.
6. Recheck live counts and database identity immediately before any approved migration.
7. Keep a rollback plan and do not invent consent or object-storage keys during mapping.

The read-only verifier at `scripts/verify-d1-migration.sql` is a checklist of queries, not a migration and not evidence that a restore has already passed.

## Budget and credentials

- Keep the workflow within the existing ₹0 budget; use free-tier resources only.
- Never commit API tokens, database credentials, or secrets to the repository.
- Do not add paid services or create billable resources without explicit approval.
