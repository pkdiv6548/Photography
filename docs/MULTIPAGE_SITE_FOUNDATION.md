# Multi-page site foundation

## Routes added
- `/` — existing bilingual landing page
- `/portfolio` — category grid and featured demo projects
- `/services` — separate service page
- `/about` — about page with honest placeholder copy
- `/showreel` — showreel placeholder until an approved video is supplied
- `/contact` — contact page linking to the enquiry form
- `/login`, `/register`, `/admin` — explicit admin-area placeholders

Cloudflare Pages is configured for SPA fallback, so direct requests to these paths should return the frontend entry point. Verify every path against the deployed Pages URL after merge.

## Security and implementation status
The login, registration/setup and dashboard routes are intentionally non-functional placeholders. They do not collect passwords and must not be presented as working authentication. The Worker is not deployed and the existing D1 database schema is incompatible with the current Worker contract. Before implementing authentication or enquiry storage:
1. Download and restore-verify a D1 export in a disposable environment.
2. Review and test a forward-only schema migration against the restored copy.
3. Deploy the Worker with verified bindings and test `/api/health` and `/api/ready`.
4. Implement password hashing, secure server-side sessions, CSRF protections where applicable, rate limiting, initial-admin setup and authorization checks.
5. Add protected admin APIs and UI, then test login, logout, unauthorized access and enquiry creation.
6. Keep production D1 unchanged until the restore and migration are reviewed.

No paid resources should be enabled without explicit approval. Demo images remain clearly labelled and should be replaced with owner-approved media before launch.