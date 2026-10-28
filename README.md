# Golden Films

A premium cinematic, bilingual (English/Hindi) photography, videography, photo-editing and video-editing portfolio for Sunil.

## Current milestone

The responsive portfolio UI prototype and the first Cloudflare Workers API foundation are now in the main branch. The UI includes sample-labelled demo imagery, 14 portfolio categories, services, a showreel preview, and an English/Hindi switcher. The Worker API has health/readiness checks, category/project read routes, validated enquiry handling, D1 schema migrations and regression tests.

The website and API are not deployed. The enquiry form remains a preview at this milestone and does not yet send/save enquiries from the public UI. A live D1 binding, deployment configuration, admin authentication, media uploads, and email notifications remain future work.

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
- The public enquiry form is not yet connected to the Worker API.
- The Worker API is not deployed and does not have a production D1 binding.
- Email notifications are not implemented.
- Admin login/setup, password recovery, email verification, R2 uploads, and the production admin UI are future milestones.
- No production deployment or paid Cloudflare resource is enabled by this milestone.
