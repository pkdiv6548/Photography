# Golden Films

Premium cinematic photography and videography portfolio for Sunil.

## Current status

The bilingual English/Hindi portfolio prototype and the first Cloudflare Workers API foundation are on a feature branch. The API includes liveness/readiness endpoints, published-category/project read routes, validated enquiry submission, a D1 migration and regression tests. It is not deployed and is not connected to a live database.

## Local development

Install dependencies with npm install.
Start the frontend with npm run dev.
Typecheck frontend and Worker API with npm run typecheck.
Run API regression tests with npm test.
Build the frontend with npm run build.

The Worker test command requires Node.js 22 with TypeScript type stripping support.

## Planned architecture

- React + TypeScript + Vite frontend
- Cloudflare Workers API
- Cloudflare D1 for categories, projects, translations and enquiries
- Cloudflare R2 for media, only after free-tier and billing requirements are checked
- GitHub feature branches, pull requests and checks
- Postman API and regression testing, to be added after the API contract stabilizes

## Budget requirement

The project must remain at ₹0. Do not enable paid plans, subscriptions or billable resources without explicit approval. If a feature cannot be delivered safely within the free tier, defer it or choose a free alternative.

## Demo media

Placeholder/demo media must be clearly labeled as sample content and must not be represented as Sunil's real work. Current remote sample images are temporary; verify source terms and replace with licensed, generated or owner-provided assets before production launch.

## Current limitations

- No real phone, WhatsApp, email or Instagram details have been provided.
- The frontend enquiry form is still a prototype and is not yet connected to the API.
- The Worker API does not have a live D1 binding, and no real enquiries can be submitted until configuration is completed.
- Enquiry records can be stored by the API once configured, but email notifications are not implemented.
- Admin login/setup, password recovery, email verification, R2 uploads, and the production admin UI are future milestones.
- No Cloudflare resources, billing changes, secrets or production deployment have been created by this change.