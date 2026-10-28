import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.ts";

const emptyEnv = {};

test("health endpoint responds and includes security headers", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/health"), emptyEnv);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.deepEqual(await response.json(), { status: "ok", service: "golden-films-api" });
});

test("readiness endpoint fails closed when D1 is not configured", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/ready"), emptyEnv);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "database_not_configured" });
});

test("readiness endpoint reports ready only when the expected schema is available", async () => {
  let checkedSchema = "";
  const db = {
    prepare(query: string) {
      checkedSchema += query;
      return {
        bind(..._args: unknown[]) { return this; },
        async first<T>() { return null as T | null; },
        async run() { return { success: true, meta: { changes: 0 } }; },
        async all<T>() {
          if (query.includes("PRAGMA table_info(enquiries)")) {
            return { success: true, results: [{ name: "email", notnull: 0 }] as T[] };
          }
          return { success: true, results: [] as T[] };
        }
      };
    }
  };
  const response = await worker.fetch(new Request("https://example.test/api/ready"), { DB: db });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ready" });
  assert.match(checkedSchema, /category_translations/);
  assert.match(checkedSchema, /cover_object_key/);
  assert.match(checkedSchema, /e\.consent/);
  assert.match(checkedSchema, /LIMIT 0/);
});

test("readiness endpoint rejects a connected database with the legacy schema", async () => {
  const db = {
    prepare(_query: string) {
      return {
        bind(..._args: unknown[]) { return this; },
        async first<T>() { return null as T | null; },
        async run() { return { success: true, meta: { changes: 0 } }; },
        async all<T>() { throw new Error("no such table: category_translations"); }
      };
    }
  };
  const response = await worker.fetch(new Request("https://example.test/api/ready"), { DB: db });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "database_schema_incompatible" });
});

test("readiness rejects a schema where enquiries.email is NOT NULL", async () => {
  const db = {
    prepare(query: string) {
      return {
        bind(..._args: unknown[]) { return this; },
        async first<T>() { return null as T | null; },
        async run() { return { success: true, meta: { changes: 0 } }; },
        async all<T>() {
          if (query.includes("PRAGMA table_info(enquiries)")) {
            return { success: true, results: [{ name: "email", notnull: 1 }] as T[] };
          }
          return { success: true, results: [] as T[] };
        }
      };
    }
  };
  const response = await worker.fetch(new Request("https://example.test/api/ready"), { DB: db });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "database_schema_incompatible" });
});

test("requests from an unexpected origin are rejected", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/health", { headers: { Origin: "https://attacker.example" } }),
    emptyEnv
  );
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "origin_not_allowed" });
});

test("non-JSON enquiry requests are rejected", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/enquiries", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "name=visitor"
    }),
    emptyEnv
  );
  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), { error: "content_type_must_be_application_json" });
});

test("oversized enquiry body is rejected even without a declared content length", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Sample visitor",
        email: "visitor@example.test",
        service: "photography",
        message: "x".repeat(17_000),
        consent: true
      })
    }),
    emptyEnv
  );
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: "request_too_large" });
});

test("phone-only enquiry rejects a phone number without enough digits", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Sample Visitor",
        phone: "-------",
        service: "photography",
        message: "Please contact me about photography services.",
        consent: true
      })
    }),
    emptyEnv
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "validation_failed" });
});

test("invalid enquiry fields are rejected before database access", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "A",
        email: "not-an-email",
        service: "untrusted-value",
        message: "Too short",
        consent: false
      })
    }),
    emptyEnv
  );
  assert.equal(response.status, 400);
  assert.equal((await response.json() as { error: string }).error, "validation_failed");
});

test("unknown routes return a stable 404 JSON response", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/not-found"), emptyEnv);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "not_found" });
});

test("unsupported methods return 405", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/health", { method: "DELETE" }), emptyEnv);
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "GET, POST, OPTIONS");
});

test("impossible calendar dates are rejected", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Sample visitor",
        email: "visitor@example.test",
        service: "wedding-photography",
        eventDate: "2026-99-99",
        message: "Please tell me about your photography services.",
        consent: true
      })
    }),
    emptyEnv
  );
  assert.equal(response.status, 400);
  assert.equal((await response.json() as { error: string }).error, "validation_failed");
});

test("unsupported category language returns 400 before database access", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/categories?lang=fr"),
    emptyEnv
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_language", supported: ["en", "hi"] });
});

test("invalid project limits return 400 before database access", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/projects?limit=0"),
    emptyEnv
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_limit", allowed: "1-48" });
});

test("enquiry requests without explicit consent are rejected before database access", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Sample Visitor",
        email: "visitor@example.test",
        service: "photography",
        message: "Please contact me about your photography services.",
        consent: false
      })
    }),
    emptyEnv
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "validation_failed" });
});

test("enquiry rate limit returns 429 and does not store the sixth request", async () => {
  let enquiryInsertAttempted = false;
  const db = {
    prepare(query: string) {
      return {
        bind(..._args: unknown[]) {
          return this;
        },
        async first<T>() {
          if (query.includes("INSERT INTO enquiry_rate_limits")) {
            return { request_count: 6 } as T;
          }
          return null;
        },
        async run() {
          if (query.includes("INSERT INTO enquiries")) enquiryInsertAttempted = true;
          return { success: true, meta: { changes: 1 } };
        },
        async all<T>() {
          return { success: true, results: [] as T[] };
        }
      };
    }
  };
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json", "cf-connecting-ip": "203.0.113.11" },
      body: JSON.stringify({
        name: "Sample Visitor",
        email: "visitor@example.test",
        service: "photography",
        message: "Please contact me about photography services.",
        consent: true
      })
    }),
    { DB: db }
  );
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get("retry-after")) > 0);
  assert.equal(enquiryInsertAttempted, false);
});

test("phone-only enquiry is stored with a NULL email when D1 is available", async () => {
  let storedEnquiryValues: unknown[] | undefined;
  const db = {
    prepare(query: string) {
      let values: unknown[] = [];
      return {
        bind(...args: unknown[]) {
          values = args;
          return this;
        },
        async first<T>() {
          if (query.includes("INSERT INTO enquiry_rate_limits")) {
            return { request_count: 1 } as T;
          }
          return null;
        },
        async run() {
          if (query.includes("INSERT INTO enquiries")) storedEnquiryValues = values;
          return { success: true, meta: { changes: 1 } };
        },
        async all<T>() {
          return { success: true, results: [] as T[] };
        }
      };
    }
  };
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json", "cf-connecting-ip": "203.0.113.10" },
      body: JSON.stringify({
        name: "Sample Visitor",
        phone: "+91 98765 43210",
        service: "photography",
        message: "Please contact me about photography services.",
        consent: true
      })
    }),
    { DB: db }
  );
  assert.equal(response.status, 201);
  assert.ok(storedEnquiryValues);
  assert.equal(storedEnquiryValues[2], null, "email column should receive SQL NULL when omitted");
});

test("categories endpoint returns bilingual category fields from D1", async () => {
  const db = {
    prepare(query: string) {
      return {
        bind(..._args: unknown[]) { return this; },
        async first<T>() { return null as T | null; },
        async run() { return { success: true, meta: { changes: 0 } }; },
        async all<T>() {
          assert.match(query, /category_translations/);
          return {
            success: true,
            results: [{ id: "wedding", slug: "wedding-photography", title_en: "Wedding Photography", title_hi: "शादी की फोटोग्राफी", sort_order: 1, group_name: "photography" }] as T[]
          };
        }
      };
    }
  };
  const response = await worker.fetch(new Request("https://example.test/api/v1/categories?lang=hi"), { DB: db });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    categories: [{ id: "wedding", slug: "wedding-photography", title_en: "Wedding Photography", title_hi: "शादी की फोटोग्राफी", sort_order: 1, group_name: "photography" }],
    lang: "hi"
  });
});

test("projects endpoint binds category slug and limit and returns published-project query results", async () => {
  let preparedQuery = "";
  let boundValues: unknown[] = [];
  const db = {
    prepare(query: string) {
      preparedQuery = query;
      return {
        bind(...args: unknown[]) { boundValues = args; return this; },
        async first<T>() { return null as T | null; },
        async run() { return { success: true, meta: { changes: 0 } }; },
        async all<T>() {
          return { success: true, results: [{ id: "project-1", slug: "sample-wedding", category_slug: "wedding-photography", cover_object_key: "covers/sample.jpg", status: "published", is_featured: 1, location: null, project_date: null }] as T[] };
        }
      };
    }
  };
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/projects?category=wedding-photography&limit=12"),
    { DB: db }
  );
  assert.equal(response.status, 200);
  assert.match(preparedQuery, /p\.status = 'published'/);
  assert.deepEqual(boundValues, ["wedding-photography", 12]);
  assert.deepEqual(await response.json(), {
    projects: [{ id: "project-1", slug: "sample-wedding", category_slug: "wedding-photography", cover_object_key: "covers/sample.jpg", status: "published", is_featured: 1, location: null, project_date: null }]
  });
});

test("enquiry form service values pass validation and fail closed when D1 is absent", async () => {
  for (const service of ["photography", "videography", "photo-editing", "video-editing"]) {
    const response = await worker.fetch(
      new Request("https://example.test/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Sample Visitor",
          email: "visitor@example.test",
          service,
          message: "Please contact me about your creative services.",
          consent: true
        })
      }),
      emptyEnv
    );
    assert.equal(response.status, 503, service);
    assert.deepEqual(await response.json(), { error: "database_not_configured" }, service);
  }
});

test("security headers are applied to API errors and OPTIONS responses", async () => {
  const errorResponse = await worker.fetch(
    new Request("https://example.test/api/missing"),
    emptyEnv
  );
  assert.equal(errorResponse.status, 404);
  assert.equal(errorResponse.headers.get("X-Frame-Options"), "DENY");
  assert.equal(errorResponse.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.equal(errorResponse.headers.get("Permissions-Policy"), "camera=(), microphone=(), geolocation=()");
  assert.equal(errorResponse.headers.get("Strict-Transport-Security"), "max-age=31536000");

  const optionsResponse = await worker.fetch(
    new Request("https://example.test/api/enquiries", { method: "OPTIONS" }),
    emptyEnv
  );
  assert.equal(optionsResponse.status, 204);
  assert.equal(optionsResponse.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(optionsResponse.headers.get("X-Frame-Options"), "DENY");
});

test("static asset responses also receive security headers", async () => {
  const assets = {
    async fetch(_request: Request) {
      return new Response("sample asset", {
        status: 200,
        headers: { "content-type": "text/plain" }
      });
    }
  };
  const response = await worker.fetch(new Request("https://example.test/sample.txt"), { ASSETS: assets });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.get("X-Frame-Options"), "DENY");
  assert.equal(response.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.equal(response.headers.get("Permissions-Policy"), "camera=(), microphone=(), geolocation=()");
});
