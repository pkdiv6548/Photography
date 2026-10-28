# Golden Films

A premium cinematic, bilingual (English/Hindi) photography, videography, photo-editing and video-editing portfolio for Sunil.

## Current milestone

The responsive portfolio UI prototype and Cloudflare Workers API foundation are in the main branch. The UI includes 14 portfolio categories, services, sample-labelled demo imagery, an English/Hindi switcher, and an enquiry form wired to `POST /api/enquiries`.

The API validates enquiry input and is designed to store submissions in D1. It is not deployed, and the repository's Wrangler configuration deliberately retains a placeholder database ID. The public form will not work against a live service until a real D1 binding is intentionally configured and the Worker is deployed. No production deployment was performed.

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
- The Worker is not deployed and no production D1 binding is configured in the repository.
- Email notifications, Admin authentication, password recovery, email verification, R2 uploads and the production admin UI are not implemented.
- No paid Cloudflare resource or production deployment is enabled.
