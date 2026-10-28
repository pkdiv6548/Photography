# Golden Films

A premium cinematic, bilingual (English/Hindi) photography, videography, photo-editing and video-editing portfolio for Sunil.

## Current milestone

The first frontend foundation is being prepared in the `feat/premium-portfolio` branch. The current preview is a portfolio UI prototype. Admin authentication, uploads, D1-backed APIs, enquiry persistence, and deployment integration are future implementation phases and are not presented as already working.

## Budget policy

- Project budget: ₹0.
- Do not enable paid plans, paid services, subscriptions, or billing without explicit user approval.
- Check current free-tier limits before using Cloudflare Workers, D1, R2, GitHub Actions, or Postman automation.
- If a feature is not feasible within available free limits, use another free approach or defer/reduce the feature.

## Demo portfolio media

Images use remote sample-photo URLs for this initial UI prototype. Every portfolio tile is labelled as demo/sample content; images are not claimed to be Sunil's real work. Replace these placeholders with approved, licensed or AI-generated portfolio assets before treating the gallery as a real portfolio. Do not upload client originals without authorization.

## Local development

Requires Node.js 22 or a compatible supported Node.js version.

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run preview
```

## Stack direction

- React + TypeScript + Vite for the web UI.
- Cloudflare Workers for backend APIs (planned).
- Cloudflare D1 for project/category/enquiry data (an existing empty database was observed during setup; schema migration has not yet been applied).
- Cloudflare R2 for media only after it is enabled in the dashboard and the free-tier/billing setup is verified.
- YouTube embeds for approved demo/showreel video links.
- GitHub feature branches and pull requests.
- Postman collection for API checks.

## Safety and implementation notes

- Never store credentials or secrets in this public repository.
- Do not include private phone numbers, email addresses, client data, or original media in commits.
- The contact form in the initial UI is a preview only and does not send or save enquiries.
- Public images can be copied; the site cannot guarantee copy-proof delivery.
- Backend/admin operations must be authorized server-side, not only hidden in the UI.
