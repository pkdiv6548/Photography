# Golden Films Admin Panel Implementation Plan

## Status and non-negotiable safety boundaries

This document defines the implementation sequence; it does not claim these features are already live. The existing production D1 database has a legacy schema that differs from the Worker API contract. Do not apply migrations or deploy write-enabled admin APIs until an export is verified and the migration has been tested against an isolated restored database. Keep the current production database unchanged.

## Phase 0 — unblock enquiry safety checks

- Resolve PR #48's failing Worker API regression test before merging.
- Confirm `GET /api/ready` checks every table/column used by the active API and returns 503 on mismatch.
- Verify schema compatibility without exposing private database values.
- Restore-test a verified export in a disposable database before any migration.

## Phase 1 — secure authentication foundation

- Add an `admins` table with stable ID, email (unique, normalized), password hash, role, active flag, created/updated timestamps, and last-login timestamp.
- Store only a modern password hash (e.g. PBKDF2/WebCrypto with per-user random salt and reviewed parameters, or a supported audited password-hashing library). Never store plaintext passwords.
- Implement one-time initial-owner setup protected by a server-side secret/configuration gate; close setup permanently after the first owner is created. Do not provide public admin registration.
- Use opaque, cryptographically random server-side sessions. Store only a hash of session tokens in D1; issue cookies with HttpOnly, Secure, SameSite=Strict (or a documented compatible policy), Path=/, and bounded lifetime.
- Rotate session ID on login and privilege changes; revoke session on logout, password change, account disable, and owner revocation.
- Protect state-changing requests with same-origin checks and CSRF protection. Rate-limit login and setup attempts. Return generic login errors.
- Enforce authorization in every API handler, not merely by hiding UI controls.
- Roles: owner, content_manager, enquiry_manager, reviewer. Start with least privilege.
- Add audit events for login success/failure (without secrets), logout, role changes, content publish/unpublish, enquiry status changes, and media deletion.

## Phase 2 — enquiry inbox

- Keep customer enquiries private; never display a raw enquiry publicly.
- Store name, optional email/phone, service, event date, budget range, message, consent, created timestamp, status, and optional internal note. Validate and limit all fields server-side.
- Statuses: new, in_progress, replied, qualified, rejected, archived. Status changes are audited.
- Authenticated API endpoints: list with pagination/search/filter; view one enquiry; update status/internal note; archive. No public list endpoint.
- Dashboard counters should be derived from server-side counts. A successful form response must mean the enquiry was persisted.
- Email notifications are optional and require explicit provider configuration; the inbox must work without email.
- Testimonials are a separate entity/workflow: pending, approved/published, rejected, unpublished. Publishing requires consent and must not expose enquiry messages.

## Phase 3 — media library and portfolio

- Use Cloudflare R2 only after confirming account entitlement, bucket configuration, and cost/free-tier fit; do not enable paid resources without approval. A provider-hosted video URL can be supported first.
- Store media metadata in D1 and file bytes in object storage; never treat a user-supplied URL as an uploaded file.
- Validate MIME type and file signatures, enforce size limits, randomize object keys, and authorize upload/delete actions. Generate thumbnails or use approved external thumbnails where supported.
- Media metadata: ID, object key or external video URL, kind, title, alt text, caption, category/project, sort order, draft/published state, creator, timestamps.
- Admin workflow: upload/enter URL -> preview -> save draft -> publish. Replace media without deleting the prior object until the new version is confirmed. Unpublish before permanent deletion and log destructive actions.
- Do not permit arbitrary HTML or script embeds. Allowlist video providers and sanitize URLs.

## Phase 4 — editable pages and publishing

- Keep editable content in typed, validated content records rather than allowing arbitrary code/HTML edits.
- Pages: Home, About, Services, Portfolio, Showreel, Contact, Footer and site settings.
- Workflow: draft -> preview -> publish/unpublish. Public routes only read published content; admin routes require authorization.
- Add server-side validation, revision history, rollback, and audit trail for publishing.
- Add categories and project management with stable slugs, ordering, bilingual fields where supported, and referential integrity.

## Phase 5 — verification and release gates

- Unit tests for password hashing/verification, session expiry/rotation/revocation, CSRF, role permissions, rate limiting, and generic login errors.
- API tests: unauthenticated requests return 401; insufficient role returns 403; cross-origin/state-changing requests are rejected; public APIs never return enquiries or admin data.
- D1 integration tests run against a disposable database restored from a verified export and migrated forward.
- End-to-end tests: first owner setup exactly once; login/logout; inbox view/status updates; upload/replace/preview/publish; unpublish and recovery; mobile layout.
- Check `/api/health` and `/api/ready`, then smoke-test production after a reviewed deployment.
- No deployment or production D1 migration until CI passes and the schema/export gates are satisfied.

## Admin UX acceptance criteria

- `/login` is a real secure login only after the authentication API is deployed; otherwise it must clearly say setup is not available.
- `/admin` redirects unauthenticated users to login and never serves private data without server authorization.
- On mobile, admin can read enquiries and update their status.
- Image/video changes show a preview and require explicit publish action.
- Customer enquiry messages remain private; testimonials require separate approval and explicit permission to publish.
- Every privileged mutation is audited and recoverable where practical.
