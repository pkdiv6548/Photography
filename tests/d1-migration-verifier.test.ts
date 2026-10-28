import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../scripts/verify-d1-migration.sql", import.meta.url), "utf8");
const statements = sql
  .replace(/--[^\n]*/g, "")
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

test("D1 migration verifier contains only read-only SELECT and PRAGMA statements", () => {
  assert.ok(statements.length >= 10, "expected a useful set of verification statements");
  for (const statement of statements) {
    assert.match(statement, /^(SELECT|PRAGMA)\b/i, `unexpected non-read-only statement: ${statement.slice(0, 80)}`);
  }
  assert.doesNotMatch(sql, /^\s*(INSERT|UPDATE|DELETE|REPLACE|CREATE|ALTER|DROP|ATTACH|DETACH)\b/im);
});

test("translation check counts rows and requires both English and Hindi per category", () => {
  assert.match(sql, /SUM\(locale_count\)\s+AS translation_rows/i);
  assert.match(sql, /ct\.language\s*=\s*'en'/i);
  assert.match(sql, /ct\.language\s*=\s*'hi'/i);
  assert.match(sql, /categories_with_two_locales/i);
  assert.match(sql, /categories_with_wrong_locale_count/i);
  assert.match(sql, /categories_missing_locale/i);
});

test("verifier covers key Worker contract and foreign-key checks", () => {
  for (const table of ["categories", "category_translations", "projects", "project_translations", "media", "enquiries", "enquiry_rate_limits"]) {
    assert.match(sql, new RegExp(`PRAGMA table_info\\(['"]${table}['"]\\)`, "i"), `missing schema check for ${table}`);
  }
  assert.match(sql, /PRAGMA foreign_key_check/i);
  assert.match(sql, /LEFT JOIN categories c ON c\.id = p\.category_id/i);
});
