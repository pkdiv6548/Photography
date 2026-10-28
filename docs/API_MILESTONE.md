# Golden Films API milestone

## Included in this branch

- Cloudflare Worker entry point with same-origin API routes.
- `GET /api/health`: verifies the Worker can query D1.
- `GET /api/categories`: returns published categories from D1.
- `POST /api/enquiries`: validates and stores an enquiry in D1 using a parameterized statement.
- Initial D1 migration for categories, projects and enquiries.
- Wrangler configuration with a deliberate placeholder for the database ID.

## Important: not production-ready yet

- The enquiry API stores data in D1, but email notifications are not implemented. An email failure cannot lose an enquiry because no email attempt is made yet.
- Admin authentication and protected enquiry management are not implemented in this milestone.
- Add platform-level rate limiting and abuse monitoring before public production exposure. The honeypot and input checks are only baseline protections, not a substitute for rate limiting.
- No category seed data is included yet; `/api/categories` returns an empty array until published rows are inserted.
- No R2 binding or media upload endpoint is included.
- The placeholder D1 database ID must be replaced with the real ID before deployment. Do not deploy with the placeholder.
- Do not commit credentials, API tokens, private client data, or real portfolio originals.

## Local verification

1. Install dependencies with `npm install`.
2. Build the frontend with `npm run typecheck` and `npm run build`.
3. Install Wrangler as a development dependency in the next toolchain change, then use `wrangler dev` with a local D1 database.
4. Apply migrations locally first; test invalid and valid enquiry payloads before any remote migration.
5. Use Postman to cover health, categories, validation failures, honeypot behavior, and successful enquiry persistence.

## Zero-budget guardrail

Do not enable paid services, add billing, or deploy to a paid plan without explicit approval. Verify the current Cloudflare dashboard limits and billing state before creating or using remote resources.


## D1 schema compatibility follow-up (2026-10-28)

The connected Cloudflare account's `golden-films-db` already contained the Golden Films schema, including admin/session/audit tables, project media tables, and the 14 seeded categories. The baseline migration and Worker were aligned to the existing schema without dropping or overwriting records.

- Categories API derives the display group from the existing category slug because the current categories table has no `group_name` or `is_published` columns.
- Enquiry inserts now use `preferred_date`, and empty strings for email/phone when the alternate contact method is supplied, matching the existing D1 constraints.
- Direct read-only verification confirmed 14 categories and 0 existing enquiries; no test enquiry was inserted into the database.
- No Worker deployment was performed. Live endpoint checks still require a deployed Worker.
