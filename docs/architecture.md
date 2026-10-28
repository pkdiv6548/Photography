# Golden Films — architecture notes

## Current phase
Frontend foundation and design prototype. No production deployment or Cloudflare resources have been created by this commit.

## Planned architecture
- React + TypeScript + Vite frontend
- Cloudflare Workers API
- Cloudflare D1 for project metadata, translations, admin metadata and enquiries
- Cloudflare R2 for media, only after the account's billing/setup requirements are verified
- YouTube embeds for selected portfolio video
- Postman collection for API and regression tests

## Budget guardrails
- Target budget: ₹0.
- Never enable a paid plan, subscription, payment method or billable resource without explicit user approval.
- If a service requires billing setup or exceeds free limits, pause and choose a free alternative or defer the feature.
- Cloudflare Workers Free currently documents 100,000 requests/day and 10 ms CPU time per invocation; verify current limits before deployment.
- Cloudflare R2 has a free usage allowance, but setup/billing requirements must be checked before creating a bucket.

## Demo media
The portfolio currently uses remotely hosted Unsplash sample imagery. It is labeled as demo/sample work and must not be presented as Sunil's actual client work. Before launch, verify each image's license and source terms, then replace with licensed/generated assets or Sunil's own work. Remote image URLs are a temporary prototype choice, not a production asset strategy.

## Contact and privacy
- Real phone, WhatsApp, email and Instagram details have not been provided.
- The enquiry form is a prototype and does not store submissions in D1.
- The form currently opens the visitor's default email client with a draft; it must not be described as a live enquiry backend.
- Do not collect real customer data until the secure backend and privacy copy are ready.

## Security notes
- No secrets belong in the repository.
- Admin APIs must enforce authorization server-side.
- R2 upload authorization must be short-lived and scoped; never expose account keys in the browser.
- Public previews and private originals should be separate access paths.
