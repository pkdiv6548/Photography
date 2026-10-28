import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const worker = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");

test("enquiry POST checks database schema before the rate limiter can write", () => {
  const enquiryRoute = worker.indexOf('if ((url.pathname === "/api/enquiries"');
  assert.ok(enquiryRoute >= 0, "enquiry route must exist");
  const schemaGate = worker.indexOf("Fail closed before the rate limiter performs any writes", enquiryRoute);
  const limiter = worker.indexOf("const rateLimitResponse = await enforceEnquiryRateLimit(request, env);", enquiryRoute);
  assert.ok(schemaGate > enquiryRoute, "enquiry route must have a schema compatibility gate");
  assert.ok(limiter > schemaGate, "schema gate must run before rate-limit database writes");
});

test("enquiry schema gate checks required tables and nullable email", () => {
  const enquiryRoute = worker.indexOf('if ((url.pathname === "/api/enquiries"');
  const routeEnd = worker.indexOf('if (url.pathname.startsWith("/api/")) return json({ error: "not_found" }, 404);', enquiryRoute);
  assert.ok(enquiryRoute >= 0 && routeEnd > enquiryRoute, "enquiry route boundaries must be found");
  const route = worker.slice(enquiryRoute, routeEnd);
  for (const fragment of [
    "category_translations",
    "enquiry_rate_limits",
    "PRAGMA table_info(enquiries)",
    "emailColumn.notnull !== 0",
    'json({ error: "database_schema_incompatible" }, 503)'
  ]) assert.ok(route.includes(fragment), `schema gate must contain: ${fragment}`);
});
