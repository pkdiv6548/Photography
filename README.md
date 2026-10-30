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
- Cloudflare R2 for media only after free-tier limits and billing requirements are verified
- GitHub feature branches, pull requests and CI checks
- Postman collection for API regression tests

## Budget requirement

The project must remain at ₹0. Do not enable paid plans, subscriptions, billing, or billable resources without explicit approval. If a feature cannot be delivered safely within the free tier, defer it or choose a free alternative.

## Demo media

All placeholder/demo media must be clearly labeled as sample content and must not be represented as Sunil's real work. Replace remote sample images with licensed, generated, or owner-provided assets before production launch.

## Current limitations

- Real phone, WhatsApp, email and Instagram details have not been provided.
- The static Cloudflare Pages portfolio is deployed, but the Worker API is not deployed/connected to the production Pages routes. The Wrangler configuration references the D1 database, but Pages runtime D1 binding and `ADMIN_SETUP_SECRET` are not configured. The live D1 database has a legacy schema mismatch; do not apply migrations until a verified export has been restored and the exact forward migration passes against a disposable copy.
- Admin authentication, owner/editor authorization, the CMS, revision history, admin audit view and optional R2 upload code exist in the repository, but they are not confirmed working in production because the API bridge and runtime bindings are not active. Password recovery, email verification and email notifications remain unimplemented.
- No paid Cloudflare resource is enabled. The static site deployment does not establish API or database readiness.

## Supabase Storage integration (free-budget target)

The Worker can use the private Supabase Storage bucket `golden-films-media` for media. The bucket is configured for JPEG, PNG, WebP, GIF, MP4 and WebM, with a 50 MB provider-level file cap. The application currently enforces a stricter 20 MB per-file cap and a shared 100 MiB monthly upload budget in D1.

Before enabling uploads in any environment, configure these as **server-side Pages Function secrets/environment variables** (never in Vite/client variables or committed files):

- `SUPABASE_URL`: project URL for the Supabase project that owns the bucket.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only secret key. Do not expose it in the browser, repository, build output, or Postman shared environments.
- `SUPABASE_STORAGE_BUCKET`: `golden-films-media`.

The service-role key bypasses Storage RLS, so requests must only originate from the authenticated Worker. The bucket is private; the Worker checks the D1 project/media publication state before streaming a public portfolio asset. Draft media is not exposed by the public media route.

The quota ledger is additive and lives in `gf_monthly_media_usage`; apply `migrations/0099_gf_monthly_media_usage.sql` to the target D1 database before enabling the new upload route. The quota is a shared 100 MiB per UTC calendar month across all admins. Failed uploads release their reservation. Provider free-tier storage and egress limits still apply, and free-tier terms can change.

### Supabase / Worker rollout checklist

1. Verify the intended Supabase project and confirm the `golden-films-media` bucket exists and is private.
2. Add the three server-side variables above to both Preview and Production Pages Functions settings, using the same bucket-owning project.
3. Apply the additive quota migration to the **preview/test D1 database first**, then test uploads, media reads, rejection at the monthly cap, and rollback on failure.
4. Apply the same migration to production only after preview tests pass.
5. Do not merge to `main` or claim launch readiness until the live API routing, D1 schema compatibility, admin setup secret, admin login, enquiry submission, media upload/read/delete, and Postman regression checks pass.
