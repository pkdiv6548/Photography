import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const worker = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");

test("enquiry POST checks database schema before the rate limiter can write", () => {
  const enquiryRoute = worker.indexOf('if ((url.pathname === "/api/enquiries"');
  const schemaGate = worker.indexOf("// Fail closed before the rate limiter performs any writes", enquiryRoute);
  const limiter = worker.indexOf("const rateLimitResponse = await enforceEnquiryRateLimit(request, env);", enquiryRoute);
  assert.notEqual(enquiryRoute, -1, "enquiry route must exist");
  assert.notEqual(schemaGate, -1, "enquiry route must have a schema compatibility gate");
  assert.ok(limiter > schemaGate, "schema gate must run before rate-limit database writes");
});

test("enquiry schema gate checks required joined tables and nullable email", () => {
  const enquiryRoute = worker.indexOf('if ((url.pathname === "/api/enquiries"');
  const routeEnd = worker.indexOf('if (url.pathname.startsWith("/api/"))', enquiryRoute);
  const route = worker.slice(enquiryRoute, routeEnd);
  assert.match(route, /category_translations/);
  assert.match(route, /enquiry_rate_limits/);
  assert.match(route, /PRAGMA table_info\(enquiries\)/);
  assert.match(route, /emailColumn\.notnull !== 0/);
  assert.match(route, /database_schema_incompatible/);
  assert.match(route, /status = 503|json\(\{ error: "database_schema_incompatible" \}, 503\)/);
});
