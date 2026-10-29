#!/usr/bin/env node
/**
 * Read-only smoke test for a deployed Golden Films Pages API.
 *
 * Usage:
 *   node scripts/smoke-pages-api.mjs https://<preview-deployment>.golden-films.pages.dev
 *
 * This script sends GET requests only. It never creates an admin, submits an
 * enquiry, changes content, or performs any database write.
 */
const rawBaseUrl = process.argv[2] ?? process.env.PAGES_BASE_URL;
if (!rawBaseUrl) {
  console.error("Usage: node scripts/smoke-pages-api.mjs <https-pages-deployment-url>");
  process.exit(2);
}
let baseUrl;
try {
  baseUrl = new URL(rawBaseUrl);
} catch {
  console.error("Base URL is invalid.");
  process.exit(2);
}
if (baseUrl.protocol !== "https:") {
  console.error("Refusing to test a non-HTTPS URL. Use the deployed HTTPS Pages URL.");
  process.exit(2);
}
baseUrl.pathname = baseUrl.pathname.replace(/\/$/, "");
baseUrl.search = "";
baseUrl.hash = "";
const checks = [
  {
    name: "GET /api/health",
    path: "/api/health",
    validate: async (response) => {
      const body = await response.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new Error("expected a JSON object");
      }
      if (body.status !== "ok" || body.service !== "golden-films-api") {
        throw new Error(`expected status="ok" and service="golden-films-api", got ${JSON.stringify(body)}`);
      }
    },
  },
  {
    name: "GET /api/ready",
    path: "/api/ready",
    validate: async (response) => {
      const body = await response.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new Error("expected a JSON object");
      }
      if (body.status !== "ready") {
        throw new Error(`expected status="ready", got ${JSON.stringify(body.status)}`);
      }
    },
  },
  {
    name: "GET /api/content?page=home",
    path: "/api/content?page=home",
    validate: async (response) => {
      const body = await response.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new Error("expected a JSON object");
      }
    },
  },
];
let failures = 0;
for (const check of checks) {
  const url = new URL(check.path, baseUrl);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
      redirect: "error",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      throw new Error(`expected JSON content-type, got ${contentType || "(missing)"}`);
    }
    await check.validate(response);
    console.log(`PASS ${check.name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${check.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
if (failures > 0) {
  console.error(`Smoke test failed: ${failures} of ${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`Smoke test passed: all ${checks.length} read-only checks succeeded.`);
