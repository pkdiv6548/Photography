import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const worker = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");

test("enquiry POST validates the legacy D1 schema before any rate-limit write", () => {
  const enquiryRoute = worker.indexOf('if ((url.pathname === "/api/enquiries"');
  assert.ok(enquiryRoute >= 0, "enquiry route must exist");
  const schemaGate = worker.indexOf("Verify the legacy live schema before any rate-limit or enquiry write", enquiryRoute);
  const limiter = worker.indexOf("const rateLimitResponse = await enforceEnquiryRateLimit(request, env);", enquiryRoute);
  assert.ok(schemaGate > enquiryRoute, "enquiry route must have a schema compatibility gate");
  assert.ok(limiter > schemaGate, "schema gate must run before rate-limit database writes");
});

test("enquiry schema gate requires consent and compatible legacy date/rate-limit columns", () => {
  const enquiryRoute = worker.indexOf('if ((url.pathname === "/api/enquiries"');
  const routeEnd = worker.indexOf('if (url.pathname.startsWith("/api/")) return json({ error: "not_found" }, 404);', enquiryRoute);
  assert.ok(enquiryRoute >= 0 && routeEnd > enquiryRoute, "enquiry route boundaries must be found");
  const route = worker.slice(enquiryRoute, routeEnd);
  for (const fragment of [
    "PRAGMA table_info(enquiries)",
    '"consent"',
    '"preferred_date"',
    "PRAGMA table_info(enquiry_rate_limits)",
    'json({ error: "database_schema_incompatible" }, 503)'
  ]) assert.ok(route.includes(fragment), `schema gate must contain: ${fragment}`);
});
