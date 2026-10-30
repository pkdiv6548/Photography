import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.ts";

function mockDb() {
  return {
    prepare(_query: string) {
      return {
        bind(..._args: unknown[]) { return this; },
        async first<T>() { return null as T | null; },
        async run() { return { success: true, meta: { changes: 0 } }; },
        async all<T>() { return { success: true, results: [] as T[] }; }
      };
    }
  };
}

function mockDbWithAvailableAuthRateLimit() {
  return {
    prepare(query: string) {
      return {
        bind(..._args: unknown[]) { return this; },
        async first<T>() {
          if (query.includes("INSERT INTO auth_rate_limits")) {
            return { request_count: 1 } as T;
          }
          return null as T | null;
        },
        async run() { return { success: true, meta: { changes: 0 } }; },
        async all<T>() { return { success: true, results: [] as T[] }; }
      };
    }
  };
}

test("admin setup is unavailable until a server-side setup secret is configured", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/setup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "owner@example.test", password: "long-secure-password-123" })
  }), { DB: mockDb() });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "admin_setup_not_configured" });
});

test("admin setup rejects a wrong server-side setup secret before parsing owner data", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/setup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-setup-secret": "incorrect-secret"
    },
    body: JSON.stringify({ email: "owner@example.test", password: "long-secure-password-123" })
  }), { DB: mockDbWithAvailableAuthRateLimit(), ADMIN_SETUP_SECRET: "expected-secret" });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "setup_not_authorized" });
});

test("admin session endpoint never authenticates without a valid server-side session", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/session"), { DB: mockDb() });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { authenticated: false });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("admin login does not accept GET requests", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/login"), { DB: mockDb() });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "POST");
});

test("admin logout requires an authenticated session", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/logout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}"
  }), { DB: mockDb() });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("admin CMS content is never exposed without an authenticated session", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/content"), { DB: mockDb() });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("admin system status requires an authenticated session", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/system-status"), { DB: mockDb() });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("public content endpoint rejects unknown page slugs", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/content?page=admin"), { DB: mockDb() });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_page" });
});

