import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.ts";

test("audit log endpoint requires a verified admin session", async () => {
  const DB = {
    prepare(_query: string) {
      return {
        bind(..._args: unknown[]) { return this; },
        async first<T>() { return null as T | null; },
        async run() { return { success: true, meta: { changes: 0 } }; },
        async all<T>() { return { success: true, results: [] as T[] }; }
      };
    }
  };
  const response = await worker.fetch(new Request("https://example.test/api/admin/audit"), { DB });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});
