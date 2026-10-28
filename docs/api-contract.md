# Golden Films API contract

This is a scaffold for the Cloudflare Workers API. It is not deployed and is not connected to a live D1 database yet.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /api/health | Liveness response; does not prove D1 is available |
| GET | /api/ready | Readiness check; requires the D1 binding |
| GET | /api/v1/categories?lang=en or hi | Published categories with language fallback |
| GET | /api/v1/projects?lang=en or hi&category=slug&limit=24 | Published projects only, optionally filtered |
| POST | /api/v1/enquiries | Validate and save an enquiry to D1 |

## Enquiry JSON

Required keys: name, email, service, message and consent=true. Optional keys: phone, eventDate in YYYY-MM-DD format, and budgetRange. The service key must be one of the canonical values: wedding-photography, pre-wedding, portrait-fashion, event-coverage, product-commercial, cinematic-video, photo-editing, video-editing or other.

The server caps request bodies at 16 KiB, validates the input, stores the record before returning success, and applies a database-backed limit of five valid submissions per client-IP per minute. Client IPs are HMAC-hashed with RATE_LIMIT_SECRET and are not stored as plain IP addresses. If D1 or the rate-limit secret is not configured, the endpoint fails closed instead of accepting unprotected submissions.

## Setup status

- No Cloudflare resources were created by this change.
- Copy wrangler.toml.example to wrangler.toml only after confirming the account stays on free usage and you intentionally create a D1 database.
- Replace the sample database ID with the real ID returned by Cloudflare. Never commit account IDs, API tokens, or secret values.
- Configure RATE_LIMIT_SECRET using Wrangler's secret command; do not add it to the repository or commit a local environment file.
- The API stores enquiries but does not send email notifications. Email delivery remains deferred until a genuinely free and suitable provider is verified.
- R2 uploads, admin authentication, password recovery, email verification and the actual admin UI are not implemented in this milestone.
- Production edge/WAF rate limiting is a separate deployment configuration and must be checked against the chosen account plan. The database-backed limiter is the application-level baseline, not a replacement for Cloudflare edge controls.
