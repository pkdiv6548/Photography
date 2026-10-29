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

test("public content API returns an explicit error if the database is unavailable", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/content?page=home"), {});
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "database_not_configured" });
});

test("admin content list requires a verified session", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/content"), { DB: mockDb() });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("saving homepage content requires a verified session", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/content/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ page: "home", content: { heroTitleEn: "A new title" } })
  }), { DB: mockDb() });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("publishing page content requires a verified session", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/content/publish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ page: "home" })
  }), { DB: mockDb() });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("draft preview endpoint requires a verified admin session", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/content/preview?page=home"), { DB: mockDb() });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("content revision history requires a verified admin session", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/content/revisions?page=home"), { DB: mockDb() });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("restoring a content revision requires a verified admin session", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/content/restore", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ revisionId: "revision-1" })
  }), { DB: mockDb() });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});
