import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import worker from "../worker/index.ts";

const token = "unit-test-editor-session";
const tokenHash = createHash("sha256").update(token).digest("hex");

function editorDb() {
  return {
    prepare(query: string) {
      return {
        bind(..._args: unknown[]) { return this; },
        async first<T>() {
          if (query.includes("FROM admin_sessions s JOIN admin_users u")) {
            return { id: "editor-1", email: "editor@example.test", role: "editor" } as T;
          }
          return null as T | null;
        },
        async run() { return { success: true, meta: { changes: 0 } }; },
        async all<T>() { return { success: true, results: [] as T[] }; }
      };
    }
  };
}

function editorRequest(url: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("cookie", "__Host-gf_admin=" + token);
  return new Request(url, { ...init, headers });
}

test("editor cannot publish CMS content", async () => {
  const response = await worker.fetch(editorRequest("https://example.test/api/admin/content/publish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ page: "home" })
  }), { DB: editorDb() });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "forbidden" });
});

test("editor cannot view owner-only audit logs", async () => {
  const response = await worker.fetch(editorRequest("https://example.test/api/admin/audit"), { DB: editorDb() });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "forbidden" });
});

test("editor cannot manage admin accounts", async () => {
  const response = await worker.fetch(editorRequest("https://example.test/api/admin/users"), { DB: editorDb() });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "forbidden" });
});

test("editor cannot publish a project", async () => {
  const response = await worker.fetch(editorRequest("https://example.test/api/admin/projects/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      slug: "sample-project", categorySlug: "wedding-photography", titleEn: "Sample", titleHi: "नमूना",
      coverImageUrl: "https://images.example.test/cover.jpg", status: "published"
    })
  }), { DB: editorDb() });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "forbidden" });
});
