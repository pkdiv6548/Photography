# Worker / D1 Schema Contract

Status: **audit baseline only — not a migration and not approval to change production**.

This document separates the schema the current Worker expects from the schema created by repository migrations. Resolve this contract before applying any migration or enabling the API against production.

## 1. Worker-required contract

The following table/column names are referenced by the current `worker/index.ts` implementation and its readiness check. This is a minimum contract, not a substitute for reviewing every SQL statement.

| Table | Required fields / contract | Used for |
|---|---|---|
| `categories` | `id`, `slug`, `sort_order`, `title_en`, `title_hi` | Category listing and localized labels |
| `projects` | `id`, `slug`, `category_slug`, `cover_image_url`, `status`, `is_featured`, `project_date`, `updated_at`; some queries also use `demo_label` | Public portfolio and admin project/content operations |
| `project_translations` | `project_id`, `locale`, `title`, `description` | Localized project copy |
| `project_media` | Worker queries refer to `preview_url`, `original_key`, `alt_en`, `alt_hi`, `is_public` plus project association/order fields | Public media and project galleries |
| `enquiries` | `id`, `name`, `email`, `phone`, `service`, `preferred_date`, `budget_range`, `message`, `consent`, `status`, `created_at`, `updated_at` (some fields are inspected dynamically) | Contact/enquiry submission |
| `enquiry_rate_limits` | `ip_hash`, `window_start`, `request_count` | Enquiry abuse prevention |
| `admin_users` | `id`, `email`, `password_hash`, `password_salt`, `role`, `is_active` | Owner/editor authentication |
| `admin_sessions` | `id`, `admin_user_id`, `token_hash`, `expires_at` | Server-side session validation |
| `admin_setup` | `id`, `completed_at` | One-time initial owner setup |
| `auth_rate_limits` | `rate_key`, `window_started_at`, `request_count` | Login/setup rate limiting |
| `audit_logs` | `id`, `admin_user_id`, `action`, `target_type`, `target_id`, `created_at` | Administrative audit trail |
| `site_content` | `page_slug`, `draft_json`, `published_json`, `status`, `updated_at` and fields used by save/publish statements | CMS draft/published content |
| `site_content_revisions` | `id`, `page_slug`, `content_json`, `revision_status`, `created_at` and fields used by revision writes | Content history |

Before a schema is accepted, extract **all** table and column references from the Worker SQL, including conditional branches and writes; confirm foreign keys, unique constraints, indexes, nullability, and defaults too.

## 2. Known repository migration mismatches

| Contract area | Worker expects | Migration `0001_initial_schema.sql` creates |
|---|---|---|
| Category labels | `categories.title_en/title_hi` | Separate `category_translations(name, language)` table |
| Project category relationship | `projects.category_slug` | `projects.category_id` foreign key |
| Project cover / feature / date | `cover_image_url`, `is_featured`, `project_date`, and Worker code also refers to `demo_label` | `cover_object_key`, `featured`, `event_date`; no `demo_label` in the baseline definition |
| Project translation locale | `project_translations.locale` | `project_translations.language` |
| Project media | `project_media` with URL/key/alt/public fields | `media` with `object_key`, `is_public_preview`, and different fields |
| Admin role | Setup/login/session flow expects `role` | Migration 0003 creates `admin_users` without role; migration 0005 adds it later |
| Enquiry consent | Explicit consent semantics | Baseline migration has a consent column, but existing production rows may predate it |

Migrations 0002–0005 do not reconcile the category/project/translation/media model differences. Merely adding the admin tables is not sufficient to make the complete Worker schema compatible.

## 3. Required validation before release

1. **Fresh-install test:** apply the full migration sequence to an empty disposable D1/SQLite-compatible database and run every Worker endpoint against that database.
2. **Contract test:** enumerate every Worker SQL table/column and assert it exists in the selected canonical schema.
3. **Relationship test:** seed representative categories, projects, translations, and media; verify joins and localized output for English and Hindi.
4. **Production-copy test:** use a verified backup restored to a separate disposable database. Capture row counts and key relationships before/after migration.
5. **Enquiry data integrity:** never invent affirmative consent for historical enquiries. Preserve nullable email/phone semantics and existing records.
6. **Admin security tests:** first owner setup succeeds only once; second setup fails; login/session/logout work; expired sessions and unauthorized CMS requests are rejected; rate limits fail closed.
7. **CMS tests:** content read, save draft, create revision, preview and publish paths all work with real D1 constraints.
8. **Recovery test:** demonstrate restoring the disposable copy and document any loss window or operational limits.
9. **Preview binding test:** verify the deployed preview uses the expected Worker, D1 binding, and setup secret without exposing secrets.
10. **Production gate:** no production migration, secret/binding changes, merge, or activation until tests pass and explicit approval is recorded.

## 4. Decision

Do not treat the existing migration filenames as proof that they form a compatible schema for the current Worker. Choose one canonical data model, then either (a) revise migrations for fresh installs and design a forward-only data-preserving migration for legacy data, or (b) change the Worker to match the canonical migration schema. Validate both paths on disposable databases before selecting one.

This file is a review artifact only. It performs no database operations.
