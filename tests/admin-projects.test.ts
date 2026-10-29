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

test("admin project list requires a verified session", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/projects"), { DB: mockDb() });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("admin project save requires a verified session", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/projects/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug: "sample-project", categorySlug: "wedding-photography", titleEn: "Sample", titleHi: "नमूना" })
  }), { DB: mockDb() });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("external media URL management requires a verified session", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/projects/media", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId: "project-1", mediaType: "image", previewUrl: "https://images.example.test/photo.jpg" })
  }), { DB: mockDb() });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("media replacement and hiding require a verified session", async () => {
  for (const path of ["/api/admin/projects/media/replace", "/api/admin/projects/media/hide"]) {
    const response = await worker.fetch(new Request("https://example.test" + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "media-1", previewUrl: "https://images.example.test/new.jpg" })
    }), { DB: mockDb() });
    assert.equal(response.status, 401, path);
    assert.deepEqual(await response.json(), { error: "unauthorized" }, path);
  }
});

test("R2 upload route requires an admin session before checking storage configuration", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/projects/media/upload", {
    method: "POST",
    headers: { "content-type": "multipart/form-data; boundary=invalid" },
    body: "--invalid--"
  }), { DB: mockDb() });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("public media route fails closed when R2 is not configured", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/media/projects/00000000-0000-0000-0000-000000000000/00000000-0000-0000-0000-000000000001.jpg"), { DB: mockDb() });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "media_storage_not_configured" });
});
