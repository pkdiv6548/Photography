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


function mockDbWithAuthenticatedSession() {
  const queries: string[] = [];
  return {
    queries,
    prepare(query: string) {
      return {
        bind(..._args: unknown[]) { queries.push(query); return this; },
        async first<T>() {
          if (query.includes("JOIN admin_users u ON u.id = s.admin_user_id")) {
            return { id: "admin-1", email: "owner@example.test", role: "owner" } as T;
          }
          return null as T | null;
        },
        async run() { return { success: true, meta: { changes: 1 } }; },
        async all<T>() { return { success: true, results: [] as T[] }; }
      };
    }
  };
}

function mockDbWithOwnerSetupBatch(insertChanges = 1) {
  const statements: string[] = [];
  return {
    statements,
    prepare(query: string) {
      return {
        bind(..._args: unknown[]) { statements.push(query); return this; },
        async first<T>() {
          if (query.includes("INSERT INTO auth_rate_limits")) return { request_count: 1 } as T;
          return null as T | null;
        },
        async run() { return { success: true, meta: { changes: 0 } }; },
        async all<T>() { return { success: true, results: [] as T[] }; }
      };
    },
    async batch(_batchStatements: unknown[]) {
      return [
        { success: true, meta: { changes: insertChanges } },
        { success: true, meta: { changes: insertChanges } },
        { success: true, meta: { changes: insertChanges } }
      ];
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

test("authenticated admin logout revokes the session and expires the secure cookie", async () => {
  const db = mockDbWithAuthenticatedSession();
  const response = await worker.fetch(new Request("https://example.test/api/admin/logout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: "__Host-gf_admin=sample-session-token"
    },
    body: "{}"
  }), { DB: db });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  const cookie = response.headers.get("set-cookie") ?? "";
  assert.match(cookie, /__Host-gf_admin=;/);
  assert.match(cookie, /Max-Age=0/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.ok(db.queries.some(query => query.includes("DELETE FROM admin_sessions")));
  assert.ok(db.queries.some(query => query.includes("'logout'")));
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


test("initial owner setup fails closed when transactional D1 batch is unavailable", async () => {
  const db = mockDbWithAvailableAuthRateLimit();
  const response = await worker.fetch(new Request("https://example.test/api/admin/setup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-setup-secret": "expected-secret"
    },
    body: JSON.stringify({ email: "owner@example.test", password: "long-secure-password-123" })
  }), { DB: db, ADMIN_SETUP_SECRET: "expected-secret" });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "admin_setup_unavailable" });
});

test("initial owner setup explicitly grants owner only when no admin exists and setup is incomplete", async () => {
  const db = mockDbWithOwnerSetupBatch(1);
  const response = await worker.fetch(new Request("https://example.test/api/admin/setup", {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-setup-secret": "expected-secret" },
    body: JSON.stringify({ email: "owner@example.test", password: "long-secure-password-123" })
  }), { DB: db, ADMIN_SETUP_SECRET: "expected-secret" });
  assert.equal(response.status, 201);
  const setupInsert = db.statements.find(query => query.includes("INSERT INTO admin_users"));
  assert.ok(setupInsert);
  assert.match(setupInsert, /'owner'/);
  assert.match(setupInsert, /NOT EXISTS \(SELECT 1 FROM admin_users\)/);
  assert.match(setupInsert, /completed_at IS NULL/);

  const setupCompletion = db.statements.find(query => query.includes("UPDATE admin_setup"));
  assert.ok(setupCompletion);
  assert.match(setupCompletion, /completed_at IS NULL/);
  assert.match(setupCompletion, /EXISTS \(SELECT 1 FROM admin_users WHERE id = \?\)/);

  const setupAudit = db.statements.find(query => query.includes("INSERT INTO audit_logs"));
  assert.ok(setupAudit);
  assert.match(setupAudit, /SELECT \?/);
  assert.match(setupAudit, /WHERE EXISTS \(SELECT 1 FROM admin_users WHERE id = \?\)/);
});

test("initial owner setup rejects when the guarded owner insert creates no row", async () => {
  const db = mockDbWithOwnerSetupBatch(0);
  const response = await worker.fetch(new Request("https://example.test/api/admin/setup", {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-setup-secret": "expected-secret" },
    body: JSON.stringify({ email: "owner@example.test", password: "long-secure-password-123" })
  }), { DB: db, ADMIN_SETUP_SECRET: "expected-secret" });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "initial_setup_already_completed" });
});
