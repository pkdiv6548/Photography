# Golden Films API milestone and current status

Last reconciled: 2026-10-28.

## Implemented in the repository

- Cloudflare Worker API scaffold with same-origin origin checks and baseline security headers.
- `GET /api/health`: Worker liveness response. It does not prove that D1 is available or schema-compatible.
- `GET /api/ready`: checks the D1 binding and the schema contract expected by the current Worker. Returns 503 if required tables/columns or the nullable-email constraint are incompatible.
- `GET /api/v1/categories?lang=en|hi`: bilingual category API.
- `GET /api/v1/projects?category=slug&limit=24`: published-project API.
- `POST /api/v1/enquiries`: server-side validation, consent requirement, size limit, database-backed rate limiting, and enquiry persistence when the database schema is compatible.
- SQL baseline migrations and Worker regression tests.
- Postman collection and API contract documentation.

## Verified database status

A read-only SQL catalog audit of the configured Cloudflare D1 database `golden-films-db` on 2026-10-28 found existing tables and 14 category rows. Cloudflare's database metadata reported `num_tables: 0`, which conflicts with the direct `sqlite_master` query; the discrepancy remains unresolved.

The live schema is **not compatible** with the current Worker and baseline migration:

- `categories` stores bilingual fields such as `title_en` and `title_hi`; it does not have `is_published`.
- The live database has no `category_translations` table.
- `projects` uses `category_slug`, `cover_image_url`, and `is_featured`, rather than the current Worker contract's `category_id`, `cover_object_key`, and `featured`.
- `project_translations` uses `locale`, not `language`.
- `enquiries.email` is `NOT NULL`, but the API supports phone-only enquiries and binds SQL NULL when email is absent. The live table also uses `preferred_date` and a different status constraint.
- `project_media` exists instead of the baseline migration's `media` table.
- The read-only audit found 14 categories and zero rows in `projects`, `enquiries`, `admin_users`, `project_media`, and `project_translations`.

The readiness endpoint is expected to reject this schema. This is a deliberate fail-closed signal, not evidence that the production API is ready. `CREATE TABLE IF NOT EXISTS` does not reshape existing tables, so applying `migrations/0001_initial_schema.sql` unchanged is unsafe.

## Enquiry rate limiting

- The Worker limits submissions to five attempts per client IP per fixed 15-minute window.
- It stores a SHA-256 digest of the IP rather than the raw IP. This is a plain digest, not a keyed HMAC.
- Exceeding the limit returns HTTP 429 with `Retry-After`; rate-limit storage errors fail closed with HTTP 503.
- Old rate-limit rows are opportunistically cleaned up after 48 hours.
- The `enquiry_rate_limits` table exists in the inspected database and matches the expected rate-limiter shape.
- Do not run successful-enquiry regression tests against a live database: they create real enquiry rows.

## Not implemented / not verified

- The Worker has not been deployed. Live endpoint smoke tests have not been performed.
- Admin setup/login endpoints, secure session management, and admin UI are not implemented in the verified Worker.
- R2 is not enabled for this account; no bucket was created.
- Enquiry email notifications are not implemented.
- Frontend categories, projects, and enquiry form still use local demo data / are not yet fully integrated with the API.
- A production CSP remains deferred until external image/font origins are inventoried.

## Safe next steps

1. Confirm the intended Cloudflare account/database and investigate the metadata/catalog discrepancy.
2. Create and verify a supported backup/export before any database writes.
3. Choose one schema strategy: adapt Worker queries to the legacy schema, or prepare a forward migration that preserves existing records and admin/auth tables.
4. Test the selected strategy against a disposable D1 database seeded from a verified export, including foreign keys, enquiry email nullability, date/status mappings, and admin/auth tables.
5. Run typecheck, Worker regression tests, frontend build, and schema contract tests.
6. Only after review and explicit authorization should any migration be applied to the configured database. Do not deploy until schema compatibility and security prerequisites are verified.

## Zero-budget guardrail

Keep the project at ₹0. Do not enable paid services, subscriptions, billing, or billable resources without explicit approval. Never commit API tokens, credentials, or secret values.
