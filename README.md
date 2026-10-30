# Golden Films

A premium cinematic, bilingual (English/Hindi) photography, videography, photo-editing and video-editing portfolio for Sunil.

## Current milestone

The responsive portfolio UI prototype and Cloudflare Workers API foundation are in the main branch. The UI includes 14 portfolio categories, services, sample-labelled demo imagery, an English/Hindi switcher, and an enquiry form wired to `POST /api/enquiries`.

The API validates enquiry input and is designed to store submissions in D1. The Wrangler configuration references the existing `golden-films-db` database in the connected Cloudflare account. A read-only inspection on 2026-10-28 found a pre-existing/legacy schema (including 14 category rows and tables such as `project_media`, `admin_users`, and `site_settings`) whose column names and constraints do not match the current `migrations/0001_initial_schema.sql` and Worker queries. The latest direct database-details response reports `num_tables: 12`, matching the 12 application tables in the SQL catalog when Cloudflare's internal `_cf_KV` table is excluded; an earlier metadata response reported zero, so that discrepancy remains documented for preflight. The SQL catalog is the current direct schema evidence. Do not apply the current baseline migration to this database until schema ownership, migration history, a verified export/restore, and a compatibility plan have been reviewed. **No D1 export was started during the 2026-10-29 read-only audit; the SQL export has not been downloaded or restore-verified.** A D1 export may temporarily make the database unavailable, so do not start one without a deliberately planned maintenance window. No data was written during inspection. The Worker is not deployed.

## Local development

Requires Node.js 22.

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
```

Run the Worker locally only after configuring a test database and the required environment secrets. The Postman collection defaults to `http://127.0.0.1:8787`; its valid-enquiry request writes to the configured database, so use a test database rather than production.

## Planned architecture

- React + TypeScript + Vite frontend
- Cloudflare Workers API
- Cloudflare D1 for categories, projects, translations and enquiries
- Supabase Storage (private bucket) for media, with Cloudflare D1 enforcing the monthly upload quota
- GitHub feature branches, pull requests and CI checks
- Postman collection for API regression tests

## Budget requirement

The project must remain at ₹0. Do not enable paid plans, subscriptions, billing, or billable resources without explicit approval. If a feature cannot be delivered safely within the free tier, defer it or choose a free alternative.

## Demo media

All placeholder/demo media must be clearly labeled as sample content and must not be represented as Sunil's real work. Replace remote sample images with licensed, generated, or owner-provided assets before production launch.

## Current limitations

- Real phone, WhatsApp, email and Instagram details have not been provided.
- The static Cloudflare Pages portfolio is deployed, but the Worker API is not yet verified as connected to the production Pages routes. The Production Pages runtime is missing its D1 binding; `ADMIN_SETUP_SECRET` is not configured with a usable value, and `SUPABASE_SERVICE_ROLE_KEY` is missing from both Preview and Production. The preview D1 binding exists. Do not treat a successful frontend build as proof that the API is ready. The live D1 database has a legacy schema mismatch; do not apply migrations until a verified export has been restored and the exact forward migration passes against a disposable copy.
- Admin authentication, owner/editor authorization, the CMS, revision history, admin audit view and Supabase Storage upload code exist in the feature branch, but they are not confirmed working in Preview or Production until runtime secrets, API routing, D1 schema compatibility, login, and real upload/read/delete tests pass. Production Pages is missing its D1 binding. Password recovery, email verification and email notifications remain unimplemented.
- No paid Cloudflare resource is enabled. The static site deployment does not establish API or database readiness.

## Supabase Storage integration (free-budget target)

The Worker uses only Supabase Storage for media; the R2 fallback has been removed so a missing Supabase configuration fails closed rather than accidentally using a potentially billable R2 binding. The selected Supabase project is the dedicated `Photography` project (`lxaqpktmnjzbhtcityyc`, Mumbai region). The private `golden-films-media` bucket has been created/verified in that project, with a 20 MiB provider-level file cap and JPEG, PNG, WebP, GIF, MP4 and WebM allowed. The application enforces a 20 MiB per-file cap and a shared 100 MiB monthly upload budget in D1. Do not substitute credentials from another project.

Before enabling uploads in any environment, configure these as **server-side Pages Function secrets/environment variables** (never in Vite/client variables or committed files):

- `SUPABASE_URL`: project URL for the Supabase project that owns the bucket.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only secret key. Do not expose it in the browser, repository, build output, or Postman shared environments.
- `SUPABASE_STORAGE_BUCKET`: `golden-films-media`.

The service-role key bypasses Storage RLS, so requests must only originate from the authenticated Worker. The bucket is private; the Worker checks the D1 project/media publication state before streaming a public portfolio asset. Draft media is not exposed by the public media route.

The quota ledger is additive and lives in `gf_monthly_media_usage`; apply `migrations/0099_gf_monthly_media_usage.sql` to the target D1 database before enabling the new upload route. The quota is a shared 100 MiB per UTC calendar month across all admins. Failed uploads release their reservation. Provider free-tier storage and egress limits still apply, and free-tier terms can change.

### Supabase / Worker rollout checklist

1. Verify the intended Supabase project and confirm the `golden-films-media` bucket exists and is private.
2. Set `SUPABASE_URL` and `SUPABASE_STORAGE_BUCKET` in both Preview and Production Pages settings (already configured at last check). Add `SUPABASE_SERVICE_ROLE_KEY` as a server-side Secret in both environments; never commit or expose it. Also set a strong `ADMIN_SETUP_SECRET` separately for Preview and Production.
3. Confirm the Preview D1 binding and apply the additive quota migration to the **preview/test D1 database first**, then test uploads, media reads, rejection at the monthly cap, and rollback on failure.
4. Before any production migration, verify a D1 export/restore and apply a reviewed compatibility plan to a disposable copy. Production Pages currently has no D1 binding and its database schema is legacy; do not apply migrations until both issues are resolved and preview tests pass.
5. Do not merge to `main` or claim launch readiness until the live API routing, D1 schema compatibility, admin setup secret, admin login, enquiry submission, media upload/read/delete, and Postman regression checks pass.

### Production D1 compatibility repair (manual review only)

The inspected production D1 schema predates parts of the current Worker API contract. A reviewed additive repair draft is in `docs/production-d1-compatibility.sql`. It is intentionally **not** auto-run by deployment. Before executing it, export and verify a D1 backup, re-check that production schema matches the documented target, and review the existing admin accounts. Existing accounts default to the least-privilege `editor` role; promote only the verified owner account after review. Historical enquiries receive `consent = 0` because their prior consent was not recorded. Do not run the script if the live schema has changed, and do not merge the PR until post-migration API checks pass.
