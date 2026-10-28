# Golden Films — Manual Setup Checklist

This file records only account actions that may require the repository owner. Keep the project at ₹0.

## Confirmed account state (2026-10-28)

- GitHub: `pkdiv6548/Photography` is public, default branch `main`, and the connected integration has push/admin permission.
- Cloudflare: the connected account is accessible. A D1 database named `golden-films-db` exists and has zero tables. No Workers script or Pages project was listed during the read-only check.
- Cloudflare R2: API access returned “Please enable R2 through the Cloudflare Dashboard.” R2 is not ready for this project yet. The current frontend demo uses remote sample images, so R2 is not required for the UI preview.
- Cloudflare Pages Git setup: creating a Git-connected Pages project through the connector failed with Cloudflare error 8000011 (“internal issue with your Cloudflare Pages Git installation”). No Pages project was created by that failed request.
- Billing: the connected integration cannot read the billing profile because it lacks Billing Read scope. Do not infer that billing is enabled or disabled from this error; owner must check the Dashboard.
- Postman: workspace `Prem Pk's Workspace` exists and has a `Golden Films API Tests` collection. Its base URL remains a placeholder until a Worker/API URL is deployed.
- GitHub CI: the React/Vite TypeScript frontend type-check and production build passed on the feature branch after correcting one unused import.

## Manual action needed for a Cloudflare preview

1. Open the Cloudflare Dashboard and select **Workers & Pages**.
2. Find the Git integration / GitHub installation settings and reconnect or reinstall the Cloudflare Pages GitHub integration if it shows an error.
3. Authorize access to the existing public repository `pkdiv6548/Photography`. Do not create a second repo.
4. Do not add a paid plan or accept a paid billing commitment. If a page asks for card/billing confirmation, stop and ask before continuing.
5. Once the Pages Git integration is healthy, the repository owner can authorize the Pages project to use this repository. Build command: `npm install --no-audit --no-fund && npm run build`; build output directory: `dist`; root directory: `/`.
6. Keep the feature branch as a preview until the site has been reviewed. Do not enable production deployment from `main` until the owner approves merging the website branch.

## R2 manual action — defer for now

R2 is only needed for the later media-upload phase, not for the current frontend preview. Do not enable it just to view the UI. When uploads are ready, inspect the R2 setup screen; proceed only if the setup can be completed without paid commitments. If it requests billing/payment setup, stop and ask first.

## Public demo content

The current portfolio cards use remote Unsplash sample imagery and are labelled as demo/sample work. They are not Sunil's real client projects. Replace with owner-approved, licensed, or AI-generated assets before using them as a real-work portfolio.

## Never do these manually

- Do not place passwords, API tokens, secrets, client data, or private media in the public GitHub repository.
- Do not activate paid plans or enable paid services without explicit approval.
- Do not expose R2 credentials or Admin credentials in browser code.
