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
