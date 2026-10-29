# Worker ↔ D1 Schema Reconciliation

This is an implementation gate, not a claim that the schema is compatible.

## Current mismatches observed in `worker/index.ts` vs `migrations/0001_initial_schema.sql`

| Area | Worker contract | Initial migration contract | Required resolution |
| --- | --- | --- | --- |
| Category labels | `categories.title_en/title_hi` | `category_translations(category_id, language, name)` | Use joins in Worker or a reviewed compatibility view. |
| Project category | `projects.category_slug` | `projects.category_id` foreign key | Join by ID; avoid duplicated slug without an integrity strategy. |
| Project cover | `cover_image_url` | `cover_object_key` | Define public preview URL vs private object key and R2 access rules. |
| Featured flag | `is_featured` | `featured` | Standardize one name. |
| Project date | `project_date` | `event_date` | Standardize semantics and nullability. |
| Project translations | `locale` | `language` | Standardize column and uniqueness constraints. |
| Media table | `project_media` | `media` | Map object keys, preview URLs, visibility, alt text and media type; preserve relationships. |
| Enquiry date | compatibility logic references `preferred_date` | initial schema uses `event_date` | Confirm actual production column and migration deliberately. |
| Consent | Worker requires `consent` | initial schema requires it; legacy production was reported without it | Never infer consent for historical enquiries. |
| Rate limiting | `enquiry_rate_limits`, `auth_rate_limits` | separate migrations create them | Verify both are applied and readiness errors are precise. |
| Admin roles | login/session reads `role`; setup insert omits it | role added in migration 0005 | Make owner role assignment explicit and test exact schema. |

## Required implementation sequence

1. Inspect a verified export of production schema and representative row counts. Do not write to production during inspection.
2. Decide canonical names and relationships before editing SQL.
3. Add a forward-only migration for the observed legacy schema, with explicit mappings and preservation checks. Do not edit historical migrations to make them appear applied.
4. Preserve IDs, foreign-key relationships, timestamps, publication state, object keys, and enquiry statuses. Never fabricate historical consent.
5. Test against a disposable database restored from a verified backup, asserting row counts and referential integrity before and after.
6. Test a clean database by applying every migration in order.
7. Run endpoint integration tests for public categories/projects, enquiries, readiness, owner setup (first call succeeds, second fails), login, session, logout, CMS save/revision/publish, media permissions and rate limits.
8. Verify Pages/Worker routing and bindings on a preview before production rollout.

## Merge gate

Keep PR #81 draft until fresh-schema and restored-legacy-schema integration tests pass. Passing TypeScript/unit CI alone does not prove D1 SQL compatibility. Production migration or deployment requires explicit approval after disposable-restore results are reviewed.


## Canonical-to-Worker field mapping (review before implementation)

This mapping is a target for a coordinated adapter/migration change. It is **not** evidence that the current Worker can run on the canonical schema.

| Worker concept / legacy field | Canonical D1 source | Mapping decision needed |
| --- | --- | --- |
| Category title (title_en, title_hi) | category_translations.name keyed by category_id and language | Join translations for the requested language; define fallback behavior when a translation is missing. |
| Category description (description_en, description_hi) | No description column in initial category schema | Decide whether descriptions are required; add a deliberate migration if part of the product contract. |
| Project category (category_slug) | projects.category_id -> categories.id -> categories.slug | Join through the foreign key; do not backfill duplicated slugs without a consistency constraint. |
| Project cover (cover_image_url) | projects.cover_object_key | Resolve through the approved public-preview delivery path; never expose private R2 object keys as public URLs. |
| Featured (is_featured) | projects.featured | Map to the canonical integer boolean and preserve ordering semantics. |
| Project date (project_date) | projects.event_date | Confirm whether the UI means event date or publication date; do not silently conflate them. |
| Translation locale (locale) | project_translations.language | Use canonical en/hi values and preserve the composite key. |
| Project media (project_media) | media | Map original_key to object_key; map visibility to is_public_preview; derive preview URLs through the media delivery layer; map alt text to translated project_translations.alt_text unless a reviewed per-media schema is added. |
| Enquiry date (preferred_date) | enquiries.event_date | Use one canonical field in reads and writes, with a reviewed legacy migration for old data. |
| Enquiry consent | enquiries.consent | Historical records without a recorded consent value must remain unknown; never backfill them as consented. |
| Admin role | admin_users.role from migration 0005 | Ensure existing admin rows receive an explicitly reviewed role before role-gated routes are enabled. |
| Admin email/password/active state | admin_users.email/password_hash/password_salt/is_active | Verify production nullability and constraints; do not assume the legacy table matches fresh migrations. |
| Sessions | admin_sessions.admin_user_id/token_hash/expires_at | Verify foreign key, token hash uniqueness, expiry format, and cleanup policy against both schema fixtures. |
| Setup gate | admin_setup.id/completed_at | Verify singleton row exists and setup remains one-time under concurrent requests. |
| Audit trail | audit_logs | Confirm referenced columns and nullable actor behavior for failed logins before enabling audit writes. |
| CMS content and revisions | site_content, site_content_revisions from migration 0004 | Verify JSON shape, revision status values, publish transaction semantics, and rollback behavior. |
| Enquiry rate limiting | enquiry_rate_limits | Validate unique conflict key (ip_hash, window_start) matches the Worker upsert. |
| Admin rate limiting | auth_rate_limits | Validate unique key rate_key and window_started_at reset logic match the Worker upsert. |

## Acceptance evidence required before closing this gate

- A checked-in schema fixture for the fresh migration chain and a separate fixture copied from a verified legacy export.
- Integration tests executing real SQLite/D1-compatible SQL against both fixtures, not only mocks returning column names from PRAGMA table_info.
- Data-preservation assertions: per-table row counts, category/project/media/enquiry IDs, foreign-key checks, publication status, object keys, and enquiry consent values.
- Endpoint coverage for every row above, including admin login/session/logout, owner setup (including concurrent attempts), CMS revision/publish, and media authorization.
- A preview environment with actual Pages/Worker routes and bindings verified before production rollout.

Until that evidence exists, keep readiness fail-closed and keep both schema and admin-auth PRs unmerged.


## Verified repository migration chain

The repository's current migration directory contains these ordered files on the default branch:

1. `migrations/0001_initial_schema.sql` — canonical categories/translations, projects/translations, media, and enquiries.
2. `migrations/0002_enquiry_rate_limits.sql` — enquiry rate-limit table.
3. `migrations/0003_admin_auth_foundation.sql` — admin authentication foundation, sessions, setup state, audit log, and auth rate limits.
4. `migrations/0004_site_content_cms.sql` — CMS content and revision tables.
5. `migrations/0005_admin_roles.sql` — admin role column for a fresh migration chain.

This list confirms the repository files only. It does **not** prove that production applied any of them; the production database was previously reported without a `d1_migrations` history. Treat the deployed schema as unknown until a verified, read-only schema export and table/column audit are available.

## Current work status

- The schema mismatch and intended mappings are documented.
- Worker conversion to the canonical schema is not complete.
- The existing readiness checks are not a substitute for executing the endpoint SQL.
- The migration chain must not be applied directly to the production database as a test.
- Do not close or merge the admin-auth work until schema-backed integration tests and the preview routing check pass.
