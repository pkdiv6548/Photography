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

test("admin user listing requires a verified owner session", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/users"), { DB: mockDb() });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("creating an editor account requires a verified owner session", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/users/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "editor@example.test", password: "a-secure-temporary-password" })
  }), { DB: mockDb() });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("disabling an editor account requires a verified owner session", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/users/disable", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "editor-1" })
  }), { DB: mockDb() });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});
