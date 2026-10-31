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
    categories: ["id", "slug", "sort_order", "title_en", "title_hi", "description_en", "description_hi"],
    projects: ["id", "slug", "category_slug", "cover_image_url", "status", "is_featured", "location", "project_date", "updated_at", "demo_label"],
    project_translations: ["project_id", "locale", "title", "description"],
    project_media: ["id", "project_id", "media_type", "preview_url", "original_key", "alt_en", "alt_hi", "sort_order", "is_public"],
    enquiries: ["id", "name", "email", "phone", "service", "preferred_date", "budget_range", "message", "consent", "status", "created_at", "updated_at"],
    enquiry_rate_limits: ["ip_hash", "window_start", "request_count"],
    admin_users: ["id", "email", "password_hash", "password_salt", "role", "is_active", "last_login_at"],
    admin_sessions: ["id", "admin_user_id", "token_hash", "expires_at"],
    admin_setup: ["id", "completed_at"],
    auth_rate_limits: ["rate_key", "window_started_at", "request_count"],
    audit_logs: ["id", "admin_user_id", "action", "target_type", "target_id", "created_at"],
    site_content: ["page_slug", "draft_json", "published_json", "status", "updated_by", "updated_at", "published_at"],
    site_content_revisions: ["id", "page_slug", "content_json", "revision_status", "changed_by", "created_at"],
    gf_monthly_media_usage: ["month_key", "used_bytes", "updated_at"],
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

  // The login handler updates this column; readiness must reject a schema that lacks it.
  schema.admin_users = schema.admin_users.filter(name => name !== "last_login_at");
  const missingLoginColumn = await worker.fetch(new Request("https://example.test/api/ready"), { DB: db });
  assert.equal(missingLoginColumn.status, 503);
  assert.deepEqual(await missingLoginColumn.json(), { error: "database_schema_incompatible" });

  schema.admin_users.push("last_login_at");
  schema.site_content = schema.site_content.filter(name => name !== "published_at");
  const missingPublishColumn = await worker.fetch(new Request("https://example.test/api/ready"), { DB: db });
  assert.equal(missingPublishColumn.status, 503);
  assert.deepEqual(await missingPublishColumn.json(), { error: "database_schema_incompatible" });
});

test("readiness endpoint rejects a schema missing the enquiry consent column", async () => {
  const schema: Record<string, string[]> = {
    categories: ["id", "slug", "sort_order", "title_en", "title_hi", "description_en", "description_hi"],
    projects: ["id", "slug", "category_slug", "cover_image_url", "status", "is_featured", "location", "project_date", "updated_at", "demo_label"],
    project_translations: ["project_id", "locale", "title", "description"],
    project_media: ["id", "project_id", "media_type", "preview_url", "original_key", "alt_en", "alt_hi", "sort_order", "is_public"],
    enquiries: ["id", "name", "email", "phone", "service", "preferred_date", "budget_range", "message", "status", "created_at", "updated_at"],
    enquiry_rate_limits: ["ip_hash", "window_start", "request_count"],
    admin_users: ["id", "email", "password_hash", "password_salt", "role", "is_active", "last_login_at"],
    admin_sessions: ["id", "admin_user_id", "token_hash", "expires_at"],
    admin_setup: ["id", "completed_at"],
    auth_rate_limits: ["rate_key", "window_started_at", "request_count"],
    audit_logs: ["id", "admin_user_id", "action", "target_type", "target_id", "created_at"],
    site_content: ["page_slug", "draft_json", "published_json", "status", "updated_by", "updated_at", "published_at"],
    site_content_revisions: ["id", "page_slug", "content_json", "revision_status", "changed_by", "created_at"],
    gf_monthly_media_usage: ["month_key", "used_bytes", "updated_at"],
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

test("all website photography and videography service IDs pass enquiry validation and fail closed when D1 is absent", async () => {
  const websiteServices = [
    "photography", "videography", "photo-editing", "video-editing",
    "wedding", "pre-wedding", "candid", "maternity", "baby-kids", "event", "fashion", "product", "commercial",
    "wedding-films", "pre-wedding-films", "cinematic", "event-films", "drone", "corporate", "music-video", "documentary", "ad-films"
  ];
  for (const service of websiteServices) {
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


test("initial admin setup explicitly assigns the owner role", async () => {
  const statements: string[] = [];
  const db = {
    async batch(_statements: unknown[]) { return [{ success: true, meta: { changes: 1 } }, { success: true, meta: { changes: 1 } }, { success: true, meta: { changes: 1 } }]; },
    prepare(query: string) {
      statements.push(query);
      return {
        bind(..._args: unknown[]) { return this; },
        async first<T>() {
          if (query.includes("INSERT INTO auth_rate_limits")) return { request_count: 1 } as T;
          return null as T | null;
        },
        async run() { return { success: true, meta: { changes: 1 } }; },
        async all<T>() { return { success: true, results: [] as T[] }; }
      };
    }
  };
  const response = await worker.fetch(
    new Request("https://example.test/api/admin/setup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-setup-secret": "test-setup-secret"
      },
      body: JSON.stringify({
        email: "owner@example.test",
        password: "a-long-test-password-123"
      })
    }),
    { DB: db, ADMIN_SETUP_SECRET: "test-setup-secret" }
  );
  assert.equal(response.status, 201);
  const insert = statements.find(query => query.includes("INSERT INTO admin_users"));
  assert.ok(insert, "expected initial admin insert query");
  assert.match(insert, /password_salt, role, is_active/);
  assert.match(insert, /'owner'/);
});


test("initial admin setup refuses when no owner row is inserted", async () => {
  const statements: string[] = [];
  let batchCalled = false;
  const db = {
    async batch(batchStatements: unknown[]) {
      batchCalled = true;
      assert.equal(batchStatements.length, 3);
      return [{ success: true, meta: { changes: 0 } }, { success: true, meta: { changes: 0 } }, { success: true, meta: { changes: 0 } }];
    },
    prepare(query: string) {
      statements.push(query);
      return {
        bind(..._args: unknown[]) { return this; },
        async first<T>() {
          if (query.includes("INSERT INTO auth_rate_limits")) return { request_count: 1 } as T;
          return null as T | null;
        },
        async run() {
          if (query.includes("INSERT INTO admin_users")) {
            return { success: true, meta: { changes: 0 } };
          }
          return { success: true, meta: { changes: 1 } };
        },
        async all<T>() { return { success: true, results: [] as T[] }; }
      };
    }
  };
  const response = await worker.fetch(
    new Request("https://example.test/api/admin/setup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-setup-secret": "test-setup-secret"
      },
      body: JSON.stringify({
        email: "owner@example.test",
        password: "a-long-test-password-123"
      })
    }),
    { DB: db, ADMIN_SETUP_SECRET: "test-setup-secret" }
  );
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "initial_setup_already_completed" });
  assert.equal(batchCalled, true, "setup writes must use one transactional D1 batch");
  assert.equal(statements.some(query => query.includes("INSERT INTO audit_logs")), true);
  assert.equal(statements.some(query => query.includes("UPDATE admin_setup")), true);
});


test("readiness endpoint rejects the repository's canonical migration schema until Worker queries are reconciled", async () => {
  const schema: Record<string, string[]> = {
    categories: ["id", "slug", "sort_order", "is_published", "created_at"],
    category_translations: ["category_id", "language", "name"],
    projects: ["id", "slug", "category_id", "cover_object_key", "featured", "status", "sort_order", "event_date", "location", "created_at", "updated_at"],
    project_translations: ["project_id", "language", "title", "description", "alt_text"],
    media: ["id", "project_id", "object_key", "media_type", "mime_type", "size_bytes", "width", "height", "duration_seconds", "is_public_preview", "sort_order", "created_at"],
    enquiries: ["id", "name", "email", "phone", "service", "event_date", "budget_range", "message", "consent", "status", "created_at", "updated_at"],
    enquiry_rate_limits: ["ip_hash", "window_start", "request_count"],
    admin_users: ["id", "email", "password_hash", "password_salt", "role", "is_active", "last_login_at"],
    admin_sessions: ["id", "admin_user_id", "token_hash", "expires_at"],
    admin_setup: ["id", "completed_at"],
    auth_rate_limits: ["rate_key", "window_started_at", "request_count"],
    audit_logs: ["id", "admin_user_id", "action", "target_type", "target_id", "created_at"],
    site_content: ["page_slug", "draft_json", "published_json", "status", "updated_by", "updated_at", "published_at"],
    site_content_revisions: ["id", "page_slug", "content_json", "revision_status", "created_at"]
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

test("public media route streams private Supabase Storage objects only after publication check", async () => {
  const projectId = "11111111-1111-4111-8111-111111111111";
  const mediaId = "22222222-2222-4222-8222-222222222222";
  const key = `projects/${projectId}/${mediaId}.jpg`;
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  let authorization = "";
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requestedUrl = String(input);
    authorization = new Headers(init?.headers).get("authorization") ?? "";
    return new Response("fake-jpeg-bytes", {
      status: 200,
      headers: { "content-type": "image/jpeg", etag: '"media-etag"' },
    });
  }) as typeof fetch;
  try {
    const db = {
      prepare(query: string) {
        assert.match(query, /is_public = 1 AND p\.status = 'published'/);
        return {
          bind(...args: unknown[]) {
            assert.equal(args[0], key);
            return this;
          },
          async first<T>() { return { media_type: "image" } as T; },
        };
      },
    };
    const response = await worker.fetch(new Request(`https://example.test/api/media/${key}`), {
      DB: db,
      SUPABASE_URL: "https://photography-test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "server-only-test-secret",
      SUPABASE_STORAGE_BUCKET: "golden-films-media",
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/jpeg");
    assert.equal(response.headers.get("etag"), '"media-etag"');
    assert.equal(await response.text(), "fake-jpeg-bytes");
    assert.equal(requestedUrl, `https://photography-test.supabase.co/storage/v1/object/golden-films-media/${key}`);
    assert.equal(authorization, "Bearer server-only-test-secret");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public media route does not fetch private storage for unpublished media", async () => {
  const projectId = "11111111-1111-4111-8111-111111111111";
  const mediaId = "22222222-2222-4222-8222-222222222222";
  const originalFetch = globalThis.fetch;
  let storageRequested = false;
  globalThis.fetch = (async () => {
    storageRequested = true;
    return new Response("unexpected", { status: 200 });
  }) as typeof fetch;
  try {
    const db = {
      prepare(_query: string) {
        return {
          bind(..._args: unknown[]) { return this; },
          async first<T>() { return null as T | null; },
        };
      },
    };
    const response = await worker.fetch(
      new Request(`https://example.test/api/media/projects/${projectId}/${mediaId}.jpg`),
      {
        DB: db,
        SUPABASE_URL: "https://photography-test.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "server-only-test-secret",
        SUPABASE_STORAGE_BUCKET: "golden-films-media",
      },
    );
    assert.equal(response.status, 404);
    assert.equal(storageRequested, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("media route fails closed without Supabase config instead of falling back to R2", async () => {
  let r2ReadAttempted = false;
  const env = {
    DB: {
      prepare(_query: string) {
        return {
          bind(..._args: unknown[]) { return this; },
          async first<T>() { return { media_type: "image" } as T; },
        };
      },
    },
    MEDIA_BUCKET: {
      async get(_key: string) {
        r2ReadAttempted = true;
        return null;
      },
      async put() { throw new Error("R2 must not be used"); },
      async delete() { throw new Error("R2 must not be used"); },
    },
  };
  const response = await worker.fetch(
    new Request("https://example.test/api/media/projects/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg"),
    env as never,
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "media_storage_not_configured" });
  assert.equal(r2ReadAttempted, false);
});


test("media upload enforces multipart size cap when Content-Length is omitted", async () => {
  const db = {
    prepare(query: string) {
      return {
        bind(..._args: unknown[]) { return this; },
        async first<T>() {
          if (query.includes("SELECT u.id, u.email, u.role FROM admin_sessions")) {
            return { id: "owner-id", email: "owner@example.test", role: "owner" } as T;
          }
          return null as T | null;
        },
        async run() { return { success: true, meta: { changes: 0 } }; },
        async all<T>() { return { success: true, results: [] as T[] }; }
      };
    }
  };
  const oversizedBody = new Uint8Array(20 * 1024 * 1024 + 64 * 1024 + 1);
  const request = new Request("https://example.test/api/admin/projects/media/upload", {
    method: "POST",
    headers: {
      "Content-Type": "multipart/form-data; boundary=upload-boundary",
      Cookie: "__Host-gf_admin=test-session-token"
    },
    body: oversizedBody.buffer as ArrayBuffer
  });
  assert.equal(request.headers.has("content-length"), false);
  const response = await worker.fetch(request, {
    DB: db,
    SUPABASE_URL: "https://photography-test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "server-only-test-secret",
    SUPABASE_STORAGE_BUCKET: "golden-films-media"
  });
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: "file_too_large" });
});

test("media upload rejects a JPEG MIME type when the file signature is not JPEG", async () => {
  const db = {
    prepare(query: string) {
      return {
        bind(..._args: unknown[]) { return this; },
        async first<T>() {
          if (query.includes("SELECT u.id, u.email, u.role FROM admin_sessions")) {
            return { id: "owner-id", email: "owner@example.test", role: "owner" } as T;
          }
          return null as T | null;
        },
        async run() { return { success: true, meta: { changes: 0 } }; },
        async all<T>() { return { success: true, results: [] as T[] }; }
      };
    }
  };
  const form = new FormData();
  form.set("projectId", "11111111-1111-4111-8111-111111111111");
  form.set("file", new Blob(["this is not a JPEG"], { type: "image/jpeg" }), "not-a-photo.jpg");
  const response = await worker.fetch(
    new Request("https://example.test/api/admin/projects/media/upload", {
      method: "POST",
      headers: { Cookie: "__Host-gf_admin=test-session-token" },
      body: form
    }),
    {
      DB: db,
      SUPABASE_URL: "https://photography-test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "server-only-test-secret",
      SUPABASE_STORAGE_BUCKET: "golden-films-media"
    } as never
  );
  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), { error: "file_signature_mismatch" });
});

test("media upload rejects unsupported MIME types before project or storage writes", async () => {
  let projectQueryAttempted = false;
  const db = {
    prepare(query: string) {
      if (query.includes("SELECT id, status FROM projects")) projectQueryAttempted = true;
      return {
        bind(..._args: unknown[]) { return this; },
        async first<T>() {
          if (query.includes("SELECT u.id, u.email, u.role FROM admin_sessions")) {
            return { id: "owner-id", email: "owner@example.test", role: "owner" } as T;
          }
          return null as T | null;
        },
        async run() { return { success: true, meta: { changes: 0 } }; },
        async all<T>() { return { success: true, results: [] as T[] }; }
      };
    }
  };
  const form = new FormData();
  form.set("projectId", "11111111-1111-4111-8111-111111111111");
  form.set("file", new Blob(["<svg></svg>"], { type: "image/svg+xml" }), "vector.svg");
  const response = await worker.fetch(
    new Request("https://example.test/api/admin/projects/media/upload", {
      method: "POST",
      headers: { Cookie: "__Host-gf_admin=test-session-token" },
      body: form
    }),
    {
      DB: db,
      SUPABASE_URL: "https://photography-test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "server-only-test-secret",
      SUPABASE_STORAGE_BUCKET: "golden-films-media"
    } as never
  );
  assert.equal(response.status, 415);
  assert.equal(projectQueryAttempted, false);
  assert.equal((await response.json() as { error: string }).error, "unsupported_media_type");
});


test("media upload rejects an upload that would exceed the shared monthly quota before contacting storage", async () => {
  let storageContacted = false;
  const db = {
    prepare(query: string) {
      return {
        bind(..._args: unknown[]) { return this; },
        async first<T>() {
          if (query.includes("SELECT u.id, u.email, u.role FROM admin_sessions")) {
            return { id: "owner-id", email: "owner@example.test", role: "owner" } as T;
          }
          if (query.includes("SELECT id, status FROM projects")) {
            return { id: "11111111-1111-4111-8111-111111111111", status: "published" } as T;
          }
          return null as T | null;
        },
        async run() { return { success: true, meta: { changes: 0 } }; },
        async all<T>() { return { success: true, results: [] as T[] }; }
      };
    },
    async batch(_statements: unknown[]) {
      return [
        { success: true, meta: { changes: 0 } },
        { success: true, meta: { changes: 0 } }
      ];
    }
  };
  const form = new FormData();
  form.set("projectId", "11111111-1111-4111-8111-111111111111");
  form.set("file", new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])], { type: "image/jpeg" }), "quota-test.jpg");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (...args: Parameters<typeof fetch>) => {
    storageContacted = true;
    return originalFetch(...args);
  };
  try {
    const response = await worker.fetch(
      new Request("https://example.test/api/admin/projects/media/upload", {
        method: "POST",
        headers: { Cookie: "__Host-gf_admin=test-session-token" },
        body: form
      }),
      {
        DB: db,
        SUPABASE_URL: "https://photography-test.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "server-only-test-secret",
        SUPABASE_STORAGE_BUCKET: "golden-films-media"
      } as never
    );
    assert.equal(response.status, 413);
    assert.equal((await response.json() as { error: string }).error, "monthly_upload_quota_exceeded");
    assert.equal(storageContacted, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
