# Golden Films — Implementation Plan

## Product scope
- Brand: Golden Films
- Creator: Sunil (individual photographer, videographer, photo editor, and video editor)
- Languages: English and Hindi, with a manual language switcher and preference persistence where practical
- Design: Premium Cinematic, Luxury + Editorial
- Initial goal: public portfolio and service enquiries; bookings and online editing orders are future scope
- Budget: INR 0. No paid subscription, upgrade, purchase, or billing setup without explicit permission

## Public pages
- Home: hero, featured portfolio, services, categories, About Sunil placeholder, showreel, contact, footer
- Portfolio and category pages
- Detailed project page (title, category, cover, gallery/video, bilingual descriptions, optional location/date, featured flag)
- Services, About, Showreel, Contact, Enquiry Form
- Privacy Policy, Terms and Conditions, 404 page

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

## Admin scope
- One-time initial admin setup; public registration stays closed
- Email/password login, verification and password recovery only where a secure, no-cost mail flow is available
- Server-side authorization and secure session handling
- Projects: create/edit/delete, categories, bilingual text, media, featured selection, publish/unpublish
- Media: multi-file uploads, previews, progress/errors, validation and resumable/direct uploads where safely supported
- Enquiries: view/manage/delete/archive; save to D1 even when notification delivery fails

## Architecture proposal
- React + TypeScript frontend
- Cloudflare Workers for backend/API and static asset hosting
- Cloudflare D1 for project/category/enquiry metadata
- R2 only after the actual checkout/billing requirements are verified and confirmed compatible with ₹0; otherwise defer original-media storage and use a free-safe media approach
- YouTube embeds for portfolio video where appropriate
- GitHub for version control and feature branches/PRs
- Postman Free for manual collections and regression testing within its plan limits

## Budget and safety controls
- Do not enable Cloudflare R2 subscription checkout or attach a paid plan without explicit approval.
- Workers Free currently lists 100,000 requests/day and 10 ms CPU/request; D1 Free is available under documented limits. Re-check official limits before deployment.
- Keep secrets out of the public repository; use secret configuration for credentials.
- Treat all demo/synthetic imagery as clearly labeled sample content; never represent it as Sunil's genuine work.
- Public portfolio previews cannot be made completely copy-proof.
- Do not claim email verification/notifications are implemented unless a suitable free delivery mechanism has been tested.

## GitHub workflow
- Work on feature branches
- Open pull requests for changes where feasible
- Add automated checks where available without paid plan requirements
- Do not force-merge untested code
- Deploy only after tests and an explicit deployment readiness check

## Acceptance criteria
- Responsive premium editorial homepage and all 14 categories
- English/Hindi language switcher and graceful translation fallback
- Public-only published project display
- Admin-protected management APIs and upload validation
- Enquiries persist in D1
- Useful 404 and error states, basic SEO and accessibility support
- Postman tests for auth, projects, categories, enquiry, invalid input and authorization
- Free-tier and billing constraints documented; no unapproved paid services
