# Golden Films — Project Plan

## Goals
- Brand: Golden Films
- Photographer/creator: Sunil
- Languages: English and Hindi, with a manual language switcher and remembered preference where practical.
- Visual direction: premium cinematic, luxury + editorial.
- Initial release: public photography, videography, photo editing, and video editing portfolio plus contact/enquiry form.
- Future scope: online bookings and photo/video editing orders, deferred until the portfolio release is stable.
- Budget: ₹0. Do not enable paid plans, paid services, or billing without explicit user approval. If a feature is not possible at ₹0, use another free approach or defer/reduce the feature.

## Portfolio categories
1. Wedding Photography
2. Pre-Wedding Photography
3. Portrait & Personal Photography
4. Fashion & Model Photography
5. Event Photography
6. Product Photography
7. Commercial Photography
8. Cinematic Wedding Films
9. Event Videography
10. Promotional & Commercial Videos
11. Photo Editing & Retouching
12. Video Editing & Color Grading
13. Reels & Short-Form Videos
14. Other Projects

## Public website
- Homepage: cinematic hero, featured projects, services, category links, About Sunil placeholder, showreel, contact links, footer.
- Portfolio listing, category pages, project detail pages, services, about, showreel, contact/enquiry, privacy policy, terms, 404.
- Responsive mobile/tablet/desktop layouts.
- SEO basics: titles, descriptions, clean URLs, sitemap, robots.txt, canonical URLs, suitable structured data, alt text and social preview metadata.
- Accessibility: keyboard navigation, clear focus states, usable contrast, semantic headings, alt text, form error messages and reduced-motion support.
- Demo media should be realistic and relevant to each category but must be clearly marked as demo/sample and never represented as Sunil's actual work.

## Admin and content management
- Admin-only dashboard with secure authentication and server-side authorization.
- Create/edit/delete projects; publish/unpublish; choose featured projects.
- Manage categories and English/Hindi titles and descriptions.
- Manage media and enquiries.
- Never store passwords in plaintext or expose secrets in client code.
- Initial admin setup and account recovery must not require a paid service; if secure free verification/delivery isn't feasible, document and defer that part rather than enabling paid services.

## Proposed stack (subject to free-tier verification)
- React + TypeScript for frontend.
- Cloudflare Workers for server-side APIs and deployment approach.
- Cloudflare D1 for structured project/category/enquiry data.
- Cloudflare R2 for media only after confirming the account's free usage and billing requirements.
- YouTube embeds for portfolio videos where appropriate.
- GitHub for source control, branches, PRs and free checks.
- Postman for API collections and regression tests.
- No custom domain purchase in phase 1; use a suitable free subdomain if available.

## Data and security
- Proposed entities: admins/auth metadata, projects, translations, categories, project media metadata, enquiries, settings and minimal audit events.
- Public previews and protected original media must be separated. Public media cannot be guaranteed copy-proof.
- Validate all inputs server-side. Validate allowed file types, file sizes and authorization for uploads.
- Use rate limiting/spam protection where free-tier features allow.
- Do not commit secrets, credentials, private client data or real contact details to the public repository.
- Enquiries must be saved before attempting email notification; email failure must not lose the enquiry.
- Enquiry retention policy to be finalized; provide admin delete/archive controls.
- Backups and restore instructions must be included, with storage choices constrained to ₹0.

## Contact/enquiry form
- Name, email, phone/WhatsApp, requested service, optional date, optional budget, message.
- Save valid enquiries in D1.
- Attempt email notification only if a suitable free option is verified. Otherwise, keep enquiries accessible in the Admin Panel.
- No payment or booking confirmation in initial release.

## Engineering workflow
1. Work on feature branches; avoid routine direct commits to main.
2. Each meaningful change should be delivered through a pull request.
3. Run available lint, typecheck, build, and tests before merge.
4. Use Postman collections for API validation and regression testing as free-tier capabilities allow.
5. Run deployment smoke tests and document recovery/rollback steps.
6. Check current free-tier limits before creating or enabling Cloudflare resources. Do not activate a paid plan or billing without explicit approval.

## Delivery phases
1. Verify account/resource readiness and free-tier feasibility.
2. Establish project structure and local validation scripts.
3. Implement design system and responsive public pages.
4. Implement portfolio/category/project data model and bilingual rendering.
5. Implement backend API and D1 schema.
6. Implement admin authentication and server-side authorization.
7. Implement project/category/media management.
8. Implement enquiry submission and admin enquiry management.
9. Implement SEO, accessibility and performance measures.
10. Create Postman test collection and regression suite.
11. Configure GitHub PR workflow and any free checks available.
12. Deploy only after verification and required account permissions; smoke-test and document all limits.

## Acceptance criteria
- All 14 categories are navigable.
- Both English and Hindi interface/content fields work.
- Demo assets are clearly labeled.
- Public visitors cannot access admin-only APIs or original protected media.
- Admin can manage projects and categories securely.
- Enquiries are persisted and visible in the admin panel.
- Validation, responsive layout, accessibility checks and API tests are run and documented.
- Deployment succeeds within approved free-tier constraints; no paid billing is enabled.
