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

test("readiness endpoint accepts the required legacy-compatible schema", async () => {
  const schema: Record<string, string[]> = {
    categories: ["id", "slug", "sort_order", "title_en", "title_hi"],
    projects: ["id", "slug", "category_slug", "cover_image_url", "status", "is_featured", "project_date", "updated_at"],
    project_translations: ["project_id", "locale", "title", "description"],
    enquiries: ["id", "name", "email", "phone", "service", "preferred_date", "budget_range", "message", "consent", "status", "created_at", "updated_at"],
    enquiry_rate_limits: ["ip_hash", "window_start", "request_count"],
    admin_users: ["id", "email", "password_hash", "password_salt", "role", "is_active"],
    admin_sessions: ["id", "admin_user_id", "token_hash", "expires_at"],
    admin_setup: ["id", "completed_at"],
    auth_rate_limits: ["rate_key", "window_started_at", "request_count"],
    audit_logs: ["id", "admin_user_id", "action", "target_type", "target_id", "created_at"],
    site_content: ["page_slug", "draft_json", "published_json", "status", "updated_at"],
    site_content_revisions: ["id", "page_slug", "content_json", "revision_status", "created_at"],
  };
  const db = {
    prepare(query: string) {
      return {
        bind(..._args: unknown[]) { return this; },
        async first<T>() { return null as T | null; },
        async run() { return { success: true, meta: { changes: 0 } }; },
        async all<T>() {
          const match = query.match(/PRAGMA table_info\(([^)]+)\)/);
          if (match) return { success: true, results: (schema[match[1]] ?? []).map(name => ({ name })) as T[] };
          return { success: true, results: [] as T[] };
        }
      };
    }
  };
  const response = await worker.fetch(new Request("https://example.test/api/ready"), { DB: db });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ready", schema: "legacy-compatible" });
});

test("readiness endpoint rejects a schema missing the enquiry consent column", async () => {
  const schema: Record<string, string[]> = {
    categories: ["id", "slug", "sort_order", "title_en", "title_hi"],
    projects: ["id", "slug", "category_slug", "cover_image_url", "status", "is_featured", "project_date", "updated_at"],
    project_translations: ["project_id", "locale", "title", "description"],
    enquiries: ["id", "name", "email", "phone", "service", "preferred_date", "budget_range", "message", "status", "created_at", "updated_at"],
    enquiry_rate_limits: ["ip_hash", "window_start", "request_count"],
    admin_users: ["id", "email", "password_hash", "password_salt", "role", "is_active"],
    admin_sessions: ["id", "admin_user_id", "token_hash", "expires_at"],
    admin_setup: ["id", "completed_at"],
    auth_rate_limits: ["rate_key", "window_started_at", "request_count"],
    audit_logs: ["id", "admin_user_id", "action", "target_type", "target_id", "created_at"],
    site_content: ["page_slug", "draft_json", "published_json", "status", "updated_at"],
    site_content_revisions: ["id", "page_slug", "content_json", "revision_status", "created_at"],
  };
  const db = {
    prepare(query: string) {
      return {
        bind(..._args: unknown[]) { return this; },
        async first<T>() { return null as T | null; },
        async run() { return { success: true, meta: { changes: 0 } }; },
        async all<T>() {
          const match = query.match(/PRAGMA table_info\(([^)]+)\)/);
          if (match) return { success: true, results: (schema[match[1]] ?? []).map(name => ({ name })) as T[] };
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
          if (query.includes("PRAGMA table_info(enquiries)")) {
            return { success: true, results: ["id", "name", "email", "phone", "service", "preferred_date", "budget_range", "message", "consent", "status", "created_at", "updated_at"].map(name => ({ name })) as T[] };
          }
          if (query.includes("PRAGMA table_info(enquiry_rate_limits)")) {
            return { success: true, results: ["ip_hash", "window_start", "request_count"].map(name => ({ name })) as T[] };
          }
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

test("phone-only enquiry is stored with an empty email when D1 is available", async () => {
  let storedEnquiryValues: unknown[] | undefined;
  const schemaColumns = ["id", "name", "email", "phone", "service", "preferred_date", "budget_range", "message", "consent", "status", "created_at", "updated_at"].map(name => ({ name }));
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
          if (query.includes("PRAGMA table_info(enquiries)")) return { success: true, results: schemaColumns as T[] };
          if (query.includes("PRAGMA table_info(enquiry_rate_limits)")) return { success: true, results: ["ip_hash", "window_start", "request_count"].map(name => ({ name })) as T[] };
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
  assert.equal(storedEnquiryValues[2], "", "legacy NOT NULL email column should receive an empty string when omitted");
});

test("categories endpoint returns bilingual category fields from D1", async () => {
  const db = {
    prepare(query: string) {
      return {
        bind(..._args: unknown[]) { return this; },
        async first<T>() { return null as T | null; },
        async run() { return { success: true, meta: { changes: 0 } }; },
        async all<T>() {
          assert.match(query, /c\.title_en/);
          assert.doesNotMatch(query, /category_translations/);
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
          if (query.includes("FROM project_media")) return { success: true, results: [] as T[] };
          return { success: true, results: [{ id: "project-1", slug: "sample-wedding", category_slug: "wedding-photography", cover_image_url: "https://media.example.test/covers/sample.jpg", status: "published", is_featured: 1, location: null, project_date: null, title_en: "Sample Wedding", title_hi: null, description_en: "Sample project", description_hi: null }] as T[] };
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
    projects: [{ id: "project-1", slug: "sample-wedding", category_slug: "wedding-photography", cover_image_url: "https://media.example.test/covers/sample.jpg", status: "published", is_featured: 1, location: null, project_date: null, title_en: "Sample Wedding", title_hi: null, description_en: "Sample project", description_hi: null }],
    media: []
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


test("enquiry endpoint rejects content types that only contain application/json as a substring", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json-malformed" },
      body: JSON.stringify({ name: "Sample Visitor" })
    }),
    emptyEnv
  );
  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), { error: "content_type_must_be_application_json" });
});


test("enquiry endpoint accepts case-insensitive application/json with charset parameters", async () => {
  for (const contentType of ["application/json; charset=utf-8", "Application/JSON", " application/json ; charset=UTF-8 "]) {
    const response = await worker.fetch(
      new Request("https://example.test/api/v1/enquiries", {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: JSON.stringify({
          name: "Sample Visitor",
          email: "visitor@example.test",
          service: "photography",
          message: "Please contact me about photography services.",
          consent: true
        })
      }),
      emptyEnv
    );
    assert.equal(response.status, 503, contentType);
    assert.deepEqual(await response.json(), { error: "database_not_configured" }, contentType);
  }
});


test("same-origin requests are allowed while cross-origin preflights are rejected", async () => {
  const sameOrigin = await worker.fetch(
    new Request("https://example.test/api/health", {
      headers: { Origin: "https://example.test" }
    }),
    emptyEnv
  );
  assert.equal(sameOrigin.status, 200);
  assert.deepEqual(await sameOrigin.json(), { status: "ok", service: "golden-films-api" });

  const crossOriginPreflight = await worker.fetch(
    new Request("https://example.test/api/enquiries", {
      method: "OPTIONS",
      headers: {
        Origin: "https://attacker.example",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"
      }
    }),
    emptyEnv
  );
  assert.equal(crossOriginPreflight.status, 403);
  assert.deepEqual(await crossOriginPreflight.json(), { error: "origin_not_allowed" });
  assert.equal(crossOriginPreflight.headers.get("X-Frame-Options"), "DENY");
});

test("health endpoint disables caching and declares JSON content type", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/health"), emptyEnv);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.match(response.headers.get("Content-Type") ?? "", /^application\/json\s*;?/i);
});
