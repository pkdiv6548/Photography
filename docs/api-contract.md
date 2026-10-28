# Golden Films API contract

This documents the Cloudflare Workers API scaffold. The Worker is not deployed. The configured `golden-films-db` D1 database exists, but a read-only inspection on 2026-10-28 found a legacy schema that does not match the current migration and Worker query contracts.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /api/health | Liveness response; does not prove D1 is available |
| GET | /api/ready | Readiness check; requires the D1 binding |
| GET | /api/v1/categories?lang=en or hi | Published categories, returning English and Hindi labels |
| GET | /api/v1/projects?category=slug&limit=24 | Published projects only, optionally filtered |
| POST | /api/v1/enquiries | Validate and save an enquiry to D1 |

## Enquiry JSON

Required keys: name (2–80 characters), service, message and consent=true; provide at least one of email or phone. Optional keys: eventDate in YYYY-MM-DD format and budgetRange. The service key must be one of the UI's canonical values: `photography`, `videography`, `photo-editing`, or `video-editing`.

The server rejects non-JSON requests, enforces a 16 KiB request-body limit while reading the stream (including requests without Content-Length), validates fields and dates, and stores the enquiry before returning success. It applies a database-backed limit of five valid submissions per client IP per 15-minute window. The client IP is represented in the rate-limit table by a SHA-256 digest; the raw IP is not stored. The current implementation does not use a `RATE_LIMIT_SECRET`; this digest is not a keyed HMAC and should not be described as one.

## Setup status

- The Wrangler configuration points to `golden-films-db`. Read-only SQL catalog inspection found existing tables and 14 category rows, despite Cloudflare metadata reporting `num_tables: 0`.
- Existing schema examples include `categories(title_en, title_hi)`, `projects(category_slug, cover_image_url)`, and `project_media`; current Worker queries expect `category_translations`, `projects.category_id`, and `cover_object_key`. The baseline migration uses `CREATE TABLE IF NOT EXISTS`, so applying it would not reshape these existing tables and is not a safe migration plan.
- Do not apply the baseline migrations to this database. First establish the schema/migration history, confirm ownership, and create/test an explicit forward migration that preserves existing data. No writes were made during inspection.
- Never commit API tokens or secret values.
- The API stores enquiries but does not send email notifications. Email delivery remains deferred until a genuinely free and suitable provider is verified.
- R2 uploads, admin authentication, password recovery, email verification and the actual admin UI are not implemented in this milestone.
- Production edge/WAF rate limiting is a separate deployment configuration and must be checked against the chosen account plan. The database-backed limiter is the application-level baseline, not a replacement for Cloudflare edge controls.
- Keep the project at ₹0: do not enable paid plans, subscriptions, billing, or billable resources without explicit approval.
