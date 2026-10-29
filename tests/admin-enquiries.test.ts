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

test("private enquiry inbox rejects requests without an admin session", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/enquiries"), { DB: mockDb() });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("enquiry status updates reject requests without an admin session", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/enquiries/status", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "enquiry-1", status: "read" })
  }), { DB: mockDb() });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("enquiry inbox rejects unsupported HTTP methods", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/enquiries", { method: "DELETE" }), { DB: mockDb() });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "GET, POST, OPTIONS");
});
