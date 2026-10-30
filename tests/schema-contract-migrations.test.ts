import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migrationFiles = [
  "0001_initial_schema.sql",
  "0002_enquiry_rate_limits.sql",
  "0003_admin_auth_foundation.sql",
  "0004_site_content_cms.sql",
  "0005_admin_roles.sql",
  "0006_worker_schema_compat.sql",
];

const migrations = migrationFiles
  .map((file) => readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"))
  .join("\n");

const workerContract: Record<string, string[]> = {
  categories: ["id", "slug", "sort_order", "title_en", "title_hi"],
  projects: ["id", "slug", "category_slug", "cover_image_url", "status", "is_featured", "project_date", "updated_at", "demo_label"],
  project_translations: ["project_id", "locale", "title", "description"],
  project_media: ["id", "project_id", "media_type", "preview_url", "original_key", "alt_en", "alt_hi", "sort_order", "is_public"],
  enquiries: ["id", "name", "email", "phone", "service", "preferred_date", "budget_range", "message", "consent", "status", "created_at", "updated_at"],
  enquiry_rate_limits: ["ip_hash", "window_start", "request_count"],
  admin_users: ["id", "email", "password_hash", "password_salt", "role", "is_active"],
  admin_sessions: ["id", "admin_user_id", "token_hash", "expires_at"],
  admin_setup: ["id", "completed_at"],
  auth_rate_limits: ["rate_key", "window_started_at", "request_count"],
  audit_logs: ["id", "admin_user_id", "action", "target_type", "target_id", "created_at"],
  site_content: ["page_slug", "draft_json", "published_json", "status", "updated_at"],
  site_content_revisions: ["id", "page_slug", "content_json", "revision_status", "created_at"],
};

function tableBody(table: string): string | null {
  const escaped = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = migrations.match(new RegExp(
    `CREATE\\s+TABLE(?:\\s+IF\\s+NOT\\s+EXISTS)?\\s+["\x60]?${escaped}["\x60]?\\s*\\(([\\s\\S]*?)\\); `.trim(),
    "i",
  ));
  return match?.[1] ?? null;
}

function columnExists(table: string, column: string): boolean {
  const escapedTable = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedColumn = column.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const body = tableBody(table);
  const inCreate = body !== null && new RegExp(
    `(?:^|[,\\n])\\s*["\x60]?${escapedColumn}["\x60]?\\s+(?:TEXT|INTEGER|REAL|BLOB|NUMERIC|VARCHAR|BOOLEAN)\\b`,
    "i",
  ).test(body);
  const inAlter = new RegExp(
    `ALTER\\s+TABLE\\s+["\x60]?${escapedTable}["\x60]?\\s+ADD\\s+COLUMN\\s+["\x60]?${escapedColumn}["\x60]?\\b`,
    "i",
  ).test(migrations);
  return inCreate || inAlter;
}

test("repository migration sequence defines every Worker readiness table and column", () => {
  const missing: string[] = [];
  for (const [table, columns] of Object.entries(workerContract)) {
    if (!tableBody(table)) missing.push(`${table} (table)`);
    for (const column of columns) {
      if (!columnExists(table, column)) missing.push(`${table}.${column}`);
    }
  }
  assert.deepEqual(missing, [], `Worker schema contract missing from migrations: ${missing.join(", ")}`);
});

test("compatibility migration preserves key relationship and least-privilege guards", () => {
  assert.match(migrations, /CREATE\s+UNIQUE\s+INDEX[^;]*project_translations_project_locale/i);
  assert.match(migrations, /REFERENCES\s+projects\s*\(id\)\s+ON\s+DELETE\s+CASCADE/i);
  assert.match(migrations, /role\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+['"]editor['"]/i);
  assert.doesNotMatch(migrations, /UPDATE\s+enquiries\s+SET\s+consent\s*=\s*1\b/i);
});
