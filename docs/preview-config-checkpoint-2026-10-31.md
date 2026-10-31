# Golden Films Preview configuration checkpoint

Date: 2026-10-31

## Configuration evidence

- Cloudflare Pages project: `golden-films`.
- Environment selected in the dashboard: **Preview**.
- Preview D1 binding: `DB` → `golden-films-preview-test`.
- Preview variables visible in the dashboard:
  - `SUPABASE_URL` (plain text) → project URL for Supabase project `Photography`.
  - `SUPABASE_STORAGE_BUCKET` (plain text) → `golden-films-media`.
  - `SUPABASE_SERVICE_ROLE_KEY` (Secret; value encrypted in dashboard).
  - `ADMIN_SETUP_SECRET` (Secret; value encrypted in dashboard).
- The Supabase API Keys page shows a legacy `service_role` key exists. Never record its value in source control, chat, or this report.
- Cloudflare API lists both secret names as `secret_text`; secret values are intentionally redacted and cannot be verified through this read-only configuration response.

## Deployment status and limitation

The latest observed successful Preview deployment was for commit `c3f0e6d2521ca57000b58214d505273cfdc74e5a`. That deployment was recorded before the most recent dashboard secret configuration was verified, so it must not be treated as proof that the newly configured secret values are active in the running deployment. A new Preview deployment is required after the secret change.

## Known blockers

- Runtime probes for `/api/health` and `/api/ready` have not been completed from an allowed network.
- Preview D1 schema is incompatible with some Worker SQL contracts; notably, `categories.description_en` and `categories.description_hi` are expected by the Worker but absent in the inspected Preview schema.
- Supabase Storage upload/read/delete has not been verified end-to-end.
- Production D1 and Production environment configuration remain out of scope for changes until schema review and explicit approval.

## Safe next steps

1. Trigger a new Preview deployment for branch `feat/supabase-storage-free-tier` so the current Preview secrets are applied.
2. Run runtime checks against the new deployment from an allowed browser/network.
3. Resolve Worker/D1 schema incompatibility using a reviewed code/migration change and a disposable database fixture; do not apply speculative SQL to Production.
4. Exercise admin setup/login, enquiry submission, media upload/read/delete, invalid MIME/signature, size limit, and quota enforcement in Preview.
5. Keep PR #87 Draft and unmerged until all rollout gates pass.

No Production database, Production secret, or Production deployment setting was changed for this checkpoint.
