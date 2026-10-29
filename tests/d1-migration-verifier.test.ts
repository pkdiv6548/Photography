import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../scripts/verify-d1-migration.sql", import.meta.url), "utf8");
const audit = await readFile(new URL("../scripts/audit-d1-schema.sql", import.meta.url), "utf8");
const statements = sql
  .replace(/--[^\n]*/g, "")
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

test("D1 migration verifier contains only read-only SELECT and PRAGMA statements", () => {
  assert.ok(statements.length >= 12, "expected a useful set of verification statements");
  for (const statement of statements) {
    assert.match(statement, /^(SELECT|PRAGMA)\b/i, `unexpected non-read-only statement: ${statement.slice(0, 80)}`);
  }
  assert.doesNotMatch(sql, /^\s*(INSERT|UPDATE|DELETE|REPLACE|CREATE|ALTER|DROP|ATTACH|DETACH)\b/im);
});

test("migration verifier compares the actual live Golden Films tables", () => {
  for (const table of ["categories", "projects", "project_translations", "project_media", "enquiries", "admin_users", "admin_sessions", "audit_logs"]) {
    assert.match(sql, new RegExp(`FROM ${table}\\b`, "i"), `missing row-count or data check for ${table}`);
  }
  assert.match(sql, /p\.category_slug/i);
  assert.match(sql, /pm\.project_id/i);
  assert.match(sql, /PRAGMA foreign_key_check/i);
});

test("migration verifier checks additive consent, role and CMS schema without writing", () => {
  assert.match(sql, /consent NOT IN \(0,1\)/i);
  assert.match(sql, /role NOT IN \('owner','editor'\)/i);
  assert.match(sql, /PRAGMA table_info\('site_content'\)/i);
  assert.match(sql, /PRAGMA table_info\('site_content_revisions'\)/i);
  assert.match(sql, /email is still NOT NULL/i);
});

test("schema audit matches live table and column names", () => {
  assert.match(audit, /pragma_table_info\(e\.table_name\)/i);
  for (const table of ["categories", "projects", "project_translations", "project_media", "enquiries", "enquiry_rate_limits", "admin_users", "admin_sessions", "admin_setup", "auth_rate_limits", "audit_logs", "site_content", "site_content_revisions"]) {
    assert.match(audit, new RegExp(`\\["${table}","`, "i"), `missing live schema table ${table}`);
  }
  assert.match(audit, /\["enquiries","email",1\]/i);
  assert.match(audit, /INCOMPATIBLE_NOT_NULL/i);
  assert.doesNotMatch(audit, /category_translations|cover_object_key|is_public_preview/);
});

test("schema audit is read-only and reports missing required columns", () => {
  assert.match(audit, /^\s*--[\s\S]*WITH expected/i);
  assert.match(audit, /WHEN a\.column_name IS NULL THEN 'MISSING'/i);
  assert.doesNotMatch(audit, /^\s*(INSERT|UPDATE|DELETE|REPLACE|CREATE|ALTER|DROP|ATTACH|DETACH)\b/im);
});
