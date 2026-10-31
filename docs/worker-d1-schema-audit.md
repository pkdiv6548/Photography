# Worker / D1 schema audit

Date: 2026-10-30. Static repository audit only; not a live Production verification.

## Critical finding

The Worker SQL contract in `worker/index.ts` does not match `migrations/0001_initial_schema.sql`. The Worker appears to target a legacy D1 schema. CI passing against a legacy-compatible fixture does not prove that a fresh database created from migration 0001 will work.

Confirmed mismatches:

- Categories: Worker expects `title_en`, `title_hi`, `description_en`, `description_hi`; migration 0001 stores names in `category_translations(name, language)`.
- Projects: Worker expects `category_slug`, `cover_image_url`, `is_featured`, `project_date`, and `demo_label`; migration 0001 uses `category_id`, `cover_object_key`, `featured`, and `event_date`, and lacks `demo_label`.
- Translations: Worker queries `project_translations.locale` and writes both `language` and `locale`; migration 0001 only has `language` and keys rows by `(project_id, language)`.
- Media: Worker uses `project_media` and columns `preview_url`, `original_key`, `alt_en`, `alt_hi`, `is_public`; migration 0001 creates a different `media` table with `object_key`, `mime_type`, `size_bytes`, and `is_public_preview`.
- Enquiries: Worker supports legacy date/status variants; migration 0001 and the candidate forward migration use different date/status contracts. Verify the exact Production CHECK constraints before any migration.

## Minimum required validation

The Worker's `/api/ready` endpoint checks presence of columns in categories, projects, project_translations, project_media, enquiries, enquiry_rate_limits, admin_users, admin_sessions, admin_setup, auth_rate_limits, audit_logs, site_content, site_content_revisions, and gf_monthly_media_usage. Column presence alone does not validate constraints, unique keys, indexes, foreign keys, or every SQL statement.

## Safe next steps

1. Export Production D1 and verify the backup, without modifying Production.
2. Restore the export to a disposable database.
3. Run `scripts/audit-d1-schema.sql`, `scripts/verify-d1-migration.sql`, and the exact candidate migration on that disposable copy.
4. Compare all Worker queries against the restored schema, especially projects, translations, media, enquiry status/date, auth rate limits, and audit logs.
5. Do not merge or apply SQL to Production until the mismatch is resolved and Preview runtime tests pass.

## Verification limits

Automated CI success proves only that the configured fixtures and build pass. Live Supabase Storage, admin login, Production schema compatibility, and live endpoint checks remain unverified. Preview secrets setup remains on hold. No database was changed by this audit.

## Additional SQL-contract checks from a second pass

- **Admin login writes admin_users.last_login_at** after a successful login. The readiness audit's expected-column list does not include this column, and the candidate forward migration only adds role. If the intended D1 schema lacks last_login_at, login can fail after password verification when it tries to persist the timestamp.
- **Failed-login audit rows omit admin_user_id** (NULL is intentionally used) while successful-login/setup/content/admin actions populate it. The actual audit_logs.admin_user_id column must therefore allow NULL or the failed-login audit insert will fail; that insert is best-effort today, so the login response may still be 401 while the audit event silently disappears.
- **Project translation writes rely on a unique conflict target (project_id, locale)**, while the initial migration's primary key is (project_id, language). Adding a locale column alone is insufficient: the unique index/constraint must match the conflict target, and existing translations need a verified mapping before any migration.
- **Media writes and deletes depend on project_media.original_key** and the public media proxy checks original_key, is_public, and project publication status. A migration that merely renames the old media table without a verified key mapping could break private-object retrieval or publication checks.
- **The readiness endpoint is a shallow gate.** It checks selected tables/columns, but does not validate unique conflict targets, NOT NULL/CHECK constraints, required indexes, or the full query contract. A ready response cannot substitute for exercising login, project save, media upload/read/hide, and enquiry create/status-change flows.

## Expanded acceptance checklist

Before calling the schema compatible, verify against a restored disposable Production export:

1. admin_users.last_login_at exists and is writable.
2. audit_logs.admin_user_id permits NULL, or change the failed-login audit insert and test its intended behavior.
3. project_translations has a UNIQUE constraint/index on (project_id, locale) and the language/locale mapping is consistent.
4. Every ON CONFLICT(...) target in the Worker matches a real UNIQUE/PRIMARY KEY constraint.
5. Required nullable columns and status CHECK values match every API write path.
6. Execute all relevant Worker SQL paths against the disposable copy; a schema-column audit alone is not enough.

These are static contract findings, not evidence that Production currently lacks any particular column or constraint. No live database was queried or modified for this second pass.


## Latest branch validation (2026-10-31)

- Commit `9b8767a8e7fdc2c8083ff63819ee847d73f1ba69` adds checks for the Worker write-path columns `projects.location`, `projects.demo_label`, CMS editor/publish fields, revision author, and quota ledger fields.
- GitHub Actions run #350 completed successfully: typecheck, Worker API regression tests, forward-migration SQLite fixture, fresh-schema Worker contract fixture, and frontend build all passed.
- This is fixture-based CI only. The expanded audit SQL has not been run against a verified Production export or a disposable restore of that export. Production compatibility and live Preview flows remain unverified.
- The audit script is diagnostic: a `PRESENT` column result does not prove type, CHECK, foreign-key, index, or data-mapping compatibility. Follow the disposable-copy acceptance checklist above before any production change.


## Follow-up CI verification (2026-10-31)

- GitHub Actions run [#351](https://github.com/pkdiv6548/Photography/actions/runs/41140877461) completed successfully on the current documentation commit. The job passed Worker/frontend typecheck, Worker API regression tests, forward-migration fixture, fresh-schema contract fixture, and frontend production build.
- Pull request #87 was rechecked: it remains open and Draft, with no submitted reviews or inline review threads returned by GitHub at the time of this check.
- This follow-up is still fixture/build validation only. It does not resolve the production-schema mismatch or verify Preview secrets, admin login, or real Supabase Storage operations.


## Quota audit coverage update (2026-10-31)

- The read-only D1 schema audit now explicitly checks `gf_monthly_media_usage.updated_at` alongside `month_key` and `used_bytes`; all three are required by the Worker readiness/accounting contract.
- This is a diagnostic-script coverage improvement only. It has not been run against a verified Production export or disposable restore, and it does not validate quota ledger CHECK constraints, types, or transactional behavior.

## Follow-up verification (2026-10-31, commit 890aaf4)

- GitHub Actions run [#355](https://github.com/pkdiv6548/Photography/actions/runs/41141397630) completed successfully for commit `890aaf4b261ebc2508ebb40685950955a26acfe2`. All job steps passed: dependency installation, frontend/Worker typecheck, Worker API regression tests, forward-migration SQLite fixture, fresh-schema Worker contract fixture, and frontend production build.
- A static comparison of Worker `ON CONFLICT(...)` clauses against `scripts/audit-d1-schema.sql` found each target represented in the audit's expected unique-target list: `gf_monthly_media_usage(month_key)`, `enquiry_rate_limits(ip_hash, window_start)`, `auth_rate_limits(rate_key)`, `site_content(page_slug)`, category/project `slug`, and `project_translations(project_id, locale)`. The audit also checks unique targets used by admin tables.
- The above is a source-level coverage check only. It does not execute the audit SQL against the real D1 schema and does not establish that the expected unique indexes exist in Production.
- Pull request #87 remains open and Draft; no submitted reviews or inline review threads were returned in this check.
- No Production database, secret, or deployment setting was changed. Live Preview/Production API behavior and Supabase Storage upload/read/delete remain unverified.


## CI follow-up (2026-10-31, run #356)

- GitHub Actions run [#356](https://github.com/pkdiv6548/Photography/actions/runs/41141669239) completed successfully for commit `45d05e8f9e6ccf5b5ba9d24d9f5a1e89c7d188bf`.
- Confirmed successful steps: dependency installation, frontend/Worker TypeScript checks, Worker API regression tests, candidate forward-migration SQLite fixture, fresh-schema Worker contract fixture, and frontend production build.
- This is another CI/build confirmation, not a Production D1 export/restore test and not a live Preview API or Supabase Storage test. No Production database, secret, or deployment setting was changed.
- PR #87 remains open and Draft. Keep it unmerged until the real schema baseline is reconciled, Preview secrets are configured through the dashboard, and the end-to-end acceptance checks pass.


## Blocker-first continuation update (2026-10-31, CI run #379)

- CI run [#379](https://github.com/pkdiv6548/Photography/actions/runs/41150472267) completed successfully on commit `aa97c1d789750c5b61bbd65523a41658c5e1f263`. All steps passed: dependency install, frontend/Worker typecheck, Worker API regression tests, forward-migration SQLite fixture, fresh-schema Worker contract fixture, and frontend production build.
- The readiness contract now explicitly requires the write-path columns `admin_users.last_login_at` and `site_content.published_at`; regression tests verify that readiness returns HTTP 503 when either is missing.
- **This does not clear the launch blockers.** CI runs against fixtures, not a verified Production D1 export or a live Preview deployment. The production schema/binding gap, Preview secrets, live endpoint checks, admin authentication, and actual Supabase Storage upload/read/delete remain unresolved.
- Blocker-first route:
  1. Keep Production untouched; obtain and verify a Production D1 export, then restore it to a disposable database.
  2. Run the audit and candidate forward migration only on that disposable copy; reconcile every Worker SQL statement, unique conflict target, nullable field, CHECK constraint, index, and data mapping.
  3. In Preview only, configure the missing server-side secrets through the Cloudflare dashboard, then deploy the feature branch.
  4. Execute the documented runtime smoke tests against Preview and record evidence in PR #87.
  5. Only after all prior checks pass, review Production binding/migration rollout and request explicit approval before any Production change or PR merge.
- No Production database, secret, deployment setting, or PR merge was changed as part of this update.


## Live account inspection (read-only, 2026-10-31)

The Cloudflare account connection was used to inspect the real D1 metadata and run SELECT/PRAGMA-only checks; no database writes were made.

- Preview D1 database `golden-films-preview-test` (`21f470cb-776a-4eb2-816e-16605139299a`) contains the expected Worker tables, including `site_content`, `site_content_revisions`, `gf_monthly_media_usage`, `media`, and `category_translations`.
- A read-only required-column comparison against the Preview D1 found two missing fields: `categories.description_en` and `categories.description_hi`. The readiness contract should continue to fail closed until these are present or the Worker contract is deliberately reconciled.
- Production D1 (`golden-films-db`, `0241231b-6e6c-410b-a5ac-958eeb424a78`) is not empty: a read-only `sqlite_master` query returned 13 non-internal tables, including `site_settings`, but not `site_content`, `site_content_revisions`, `gf_monthly_media_usage`, `media`, or `category_translations`. Cloudflare's database metadata reported `num_tables: 0`, which disagrees with the direct read-only query; treat metadata count as unreliable and use SQL inventory as the evidence.
- Production has a real schema compatibility gap, but no Production migration was attempted. Preview schema is closer to the Worker contract and still has the two missing category description fields.
- The Cloudflare Pages project API confirms the latest feature-branch Preview deployment of commit `14ab6097de6d2f5e68cd3c07a77f7363a8e08ec5` succeeded. Preview configuration still shows `ADMIN_SETUP_SECRET` empty and no `SUPABASE_SERVICE_ROLE_KEY`. Production has no D1 binding shown in the Pages environment configuration.
- Attempts to request `/api/health` and `/api/ready` from the connected execution environment were blocked by the outbound request policy (HTTP 403 policy denial). This is not evidence that the website itself returns 403; live endpoint behavior remains unverified.
- Supabase project `Photography` is ACTIVE_HEALTHY, but its `public` schema has no tables. This is consistent with the application core using Cloudflare D1; Supabase Storage must be verified separately.
- Next safe steps: inspect the exact schema migration history and existing Production D1 schema with read-only SQL; reconcile the Preview's two missing category fields through an additive Preview-only migration after checking current migrations; then use a permitted real browser/session to test endpoints and Storage. Production remains protected pending backup/export + disposable restore + explicit approval.


## Production schema recheck and migration safety correction (2026-10-31)

A direct read-only Cloudflare D1 query plus PRAGMA table_info was repeated against `golden-films-db`. This corrects an over-broad interpretation in the earlier table-inventory note:

- Production `categories` already contains `description_en` and `description_hi` as NOT NULL with empty-string defaults. The candidate forward migration begins by adding these same columns, so **it would fail on Production with duplicate-column errors** and must not be applied there as-is.
- Production has `project_media` (the table used by the current Worker) and `project_translations` with `(project_id, locale)` as its composite primary key. The absence of tables named `media` and `category_translations` in Production is not by itself a Worker blocker; do not create them merely to match names from a different schema design.
- Read-only PRAGMA checks confirm Production `projects` includes the Worker fields `category_slug`, `cover_image_url`, `is_featured`, `location`, `project_date`, `demo_label`, and `updated_at`; `project_translations` includes `project_id`, `locale`, `title`, `description`; and `project_media` includes the expected `preview_url`, `original_key`, bilingual alt text, sort order, and `is_public`.
- Production `enquiries` still has `email TEXT NOT NULL` and no `consent` column. `admin_users` has `last_login_at` but no `role`. `audit_logs.admin_user_id` is nullable and target fields default to empty strings. These are confirmed schema facts from read-only PRAGMA checks.
- The confirmed table-inventory gap remains `site_content`, `site_content_revisions`, and `gf_monthly_media_usage`; other Worker-required columns, indexes, and constraints still need a full contract comparison. Production Pages D1 binding/configuration and secrets also remain separate deployment blockers.
- The candidate migration is a legacy-schema fixture migration, not a production-ready universal migration. Do not run it against Production. Derive a production-specific migration from a verified export restored to a disposable database, and test the exact script against that baseline.
- No rows were written and no Production settings were changed during this recheck.
