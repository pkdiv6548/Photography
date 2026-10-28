# Golden Films — architecture notes

## Current phase

Bilingual frontend prototype plus a Cloudflare Workers API foundation. The API has not been deployed and has no live D1 binding. The frontend enquiry form has not yet been connected to it.

## Planned architecture

- React + TypeScript + Vite frontend
- Cloudflare Workers API
- Cloudflare D1 for category/project metadata, English/Hindi translations and enquiries
- Cloudflare R2 for media only after the account's free usage and billing setup are verified
- YouTube embeds for selected portfolio videos
- Postman collection and regression tests; Postman setup is not complete yet

## API baseline

The Worker exposes health/readiness checks, published category/project read endpoints and an enquiry endpoint. Enquiries are size-capped, validated server-side and stored through prepared D1 statements. The API rate limiter uses D1 and an HMAC of the trusted client IP; the plain IP is not stored. If the DB or RATE_LIMIT_SECRET is missing, enquiry submission fails closed.

The API returns only generic internal errors and adds baseline security headers. This is an initial application-layer baseline, not a completed security review. Cloudflare edge rate-limiting availability/configuration must be checked separately.

## Budget guardrails

- Target budget: ₹0.
- Never enable a paid plan, subscription, payment method or billable resource without explicit approval.
- If a service requires billing setup or exceeds free limits, pause and choose a free alternative or defer the feature.
- The Wrangler file is a template only. Do not deploy until the D1 database ID and exact website origin are configured and the free-tier/billing posture is verified.
- Do not store secrets in GitHub files. Configure RATE_LIMIT_SECRET through Wrangler secrets only after approving setup.
- No Cloudflare database, R2 bucket, paid plan, secret or production deployment has been created by this change.

## Demo media and privacy

- Portfolio images are remote demo/sample imagery and do not represent Sunil's confirmed client work.
- Real phone, WhatsApp, email and Instagram details have not been provided.
- Do not collect actual customer enquiries until the API is configured, connected to the frontend and privacy copy is ready.
- Email notifications are deferred pending verification of a genuinely free and suitable sender. Cloudflare Email Routing must not be assumed to send outbound transactional email.

## Security roadmap

- Admin APIs must enforce authorization server-side, with a reviewed session/token design and password reset safeguards.
- R2 uploads must be authorized server-side and use short-lived, narrowly scoped access; never expose account keys in the browser.
- Public previews and private originals need separate access paths.
- Add upload MIME/type/size checks, admin audit logs, Turnstile or another verified spam control if affordable, production deployment smoke tests and a Postman regression collection before launch.