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
        async all<T>() { return { success: true, results: [] as T[] }; },
      };
    },
  };
}

test("public media route fails closed when Supabase Storage is not configured", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/media/projects/00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002.jpg"),
    { DB: mockDb() },
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "media_storage_not_configured" });
});

test("media upload requires an authenticated admin before checking Supabase Storage configuration", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/admin/projects/media/upload", {
      method: "POST",
      body: new FormData(),
    }),
    { DB: mockDb() },
  );
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("media upload rejects an invalid session before checking Supabase Storage configuration", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/admin/projects/media/upload", {
      method: "POST",
      headers: { cookie: "__Host-gf_admin=invalid-session" },
      body: new FormData(),
    }),
    { DB: mockDb() },
  );
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});
