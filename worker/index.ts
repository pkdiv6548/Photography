interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta?: { changes?: number };
}

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = unknown>(): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Binding {
  prepare(query: string): D1Statement;
}

interface StaticAssetsBinding {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  DB?: D1Binding;
  ASSETS?: StaticAssetsBinding;
}

interface EnquiryInput {
  name: string;
  email?: string;
  phone?: string;
  service: string;
  eventDate?: string;
  budgetRange?: string;
  message: string;
  website?: string;
}

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });

const cleanText = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidDate(value: string): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
const RATE_LIMIT_MAX_REQUESTS = 5;

async function enforceEnquiryRateLimit(request: Request, env: Env): Promise<Response | null> {
  if (!env.DB) return json({ error: "database_not_configured" }, 503);
  const clientIp = request.headers.get("cf-connecting-ip") ?? "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clientIp));
  const ipHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(nowSeconds / RATE_LIMIT_WINDOW_SECONDS) * RATE_LIMIT_WINDOW_SECONDS;
  const retryAfter = windowStart + RATE_LIMIT_WINDOW_SECONDS - nowSeconds;

  try {
    const row = await env.DB.prepare(
      `INSERT INTO enquiry_rate_limits (ip_hash, window_start, request_count)
       VALUES (?, ?, 1)
       ON CONFLICT(ip_hash, window_start)
       DO UPDATE SET request_count = request_count + 1
       RETURNING request_count`
    ).bind(ipHash, windowStart).first<{ request_count: number }>();

    // Best-effort cleanup prevents old IP digests from accumulating indefinitely.
    if (nowSeconds % 97 === 0) {
      await env.DB.prepare("DELETE FROM enquiry_rate_limits WHERE window_start < ?")
        .bind(nowSeconds - 48 * 60 * 60).run();
    }

    if (!row || row.request_count > RATE_LIMIT_MAX_REQUESTS) {
      return new Response(JSON.stringify({ error: "Too many enquiry attempts. Please wait and try again." }), {
        status: 429,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          "retry-after": String(retryAfter),
        },
      });
    }
    return null;
  } catch {
    // Fail closed if the limiter cannot be checked; never silently disable abuse protection.
    return json({ error: "Enquiry service is temporarily unavailable. Please try again later." }, 503);
  }
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");

  if (origin) {
    try {
      if (new URL(origin).origin !== url.origin) {
        return json({ error: "origin_not_allowed" }, 403);
      }
    } catch {
      return json({ error: "origin_not_allowed" }, 403);
    }
  }

  if (url.pathname.startsWith("/api/") && !["GET", "POST", "OPTIONS"].includes(request.method)) {
    const response = json({ error: "method_not_allowed" }, 405);
    response.headers.set("Allow", "GET, POST, OPTIONS");
    return response;
  }

  if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  }

  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({ status: "ok", service: "golden-films-api" });
  }

  if (url.pathname === "/api/ready" && request.method === "GET") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    try {
      await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
      return json({ status: "ready" });
    } catch {
      return json({ error: "database_unavailable" }, 503);
    }
  }

  if ((url.pathname === "/api/categories" || url.pathname === "/api/v1/categories") && request.method === "GET") {
    const lang = url.searchParams.get("lang") ?? "en";
    if (lang !== "en" && lang !== "hi") {
      return json({ error: "invalid_language", supported: ["en", "hi"] }, 400);
    }
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    try {
      const result = await env.DB.prepare(
        `SELECT c.id, c.slug, en.name AS title_en, hi.name AS title_hi, c.sort_order,
          CASE
            WHEN c.slug IN ('wedding-photography', 'pre-wedding-photography', 'portrait-personal-photography', 'fashion-model-photography', 'event-photography', 'product-photography', 'commercial-photography') THEN 'photography'
            WHEN c.slug IN ('cinematic-wedding-films', 'event-videography', 'promotional-commercial-videos', 'reels-short-form-videos', 'other-projects') THEN 'videography'
            ELSE 'editing'
          END AS group_name
         FROM categories c
         LEFT JOIN category_translations en ON en.category_id = c.id AND en.language = 'en'
         LEFT JOIN category_translations hi ON hi.category_id = c.id AND hi.language = 'hi'
         WHERE c.is_published = 1
         ORDER BY c.sort_order, en.name`
      ).all();
      return json({ categories: result.results ?? [], lang });
    } catch {
      return json({ error: "categories_unavailable" }, 503);
    }
  }

  if ((url.pathname === "/api/projects" || url.pathname === "/api/v1/projects") && request.method === "GET") {
    const rawLimit = url.searchParams.get("limit") ?? "24";
    const limit = Number(rawLimit);
    if (!/^\d+$/.test(rawLimit) || !Number.isInteger(limit) || limit < 1 || limit > 48) {
      return json({ error: "invalid_limit", allowed: "1-48" }, 400);
    }
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    const category = url.searchParams.get("category");
    try {
      const query = category
        ? env.DB.prepare("SELECT p.id, p.slug, c.slug AS category_slug, p.cover_object_key, p.status, p.featured AS is_featured, p.location, p.event_date AS project_date FROM projects p JOIN categories c ON c.id = p.category_id WHERE p.status = 'published' AND c.slug = ? ORDER BY p.featured DESC, p.updated_at DESC LIMIT ?").bind(category, limit)
        : env.DB.prepare("SELECT p.id, p.slug, c.slug AS category_slug, p.cover_object_key, p.status, p.featured AS is_featured, p.location, p.event_date AS project_date FROM projects p JOIN categories c ON c.id = p.category_id WHERE p.status = 'published' ORDER BY p.featured DESC, p.updated_at DESC LIMIT ?").bind(limit);
      const result = await query.all();
      return json({ projects: result.results ?? [] });
    } catch {
      return json({ error: "projects_unavailable" }, 503);
    }
  }

  if ((url.pathname === "/api/enquiries" || url.pathname === "/api/v1/enquiries") && request.method === "POST") {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return json({ error: "content_type_must_be_application_json" }, 415);
    }

    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (declaredLength > 16_384) return json({ error: "request_too_large" }, 413);

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return json({ error: "validation_failed" }, 400);
    }

    const body = raw as Record<string, unknown>;
    if (cleanText(body.website, 200)) return json({ ok: true, message: "Enquiry received." }, 201);

    const input: EnquiryInput = {
      name: cleanText(body.name, 100),
      email: cleanText(body.email, 254).toLowerCase(),
      phone: cleanText(body.phone, 30),
      service: cleanText(body.service, 80),
      eventDate: cleanText(body.eventDate, 10),
      budgetRange: cleanText(body.budgetRange, 60),
      message: cleanText(body.message, 3000),
    };
    const allowedServices = new Set([
      "photography", "videography", "photo-editing", "video-editing"
    ]);
    const consent = body.consent === true;
    const validPhone = !input.phone || /^[+()\d .-]{7,30}$/.test(input.phone);
    const valid =
      input.name.length >= 2 &&
      Boolean(input.email || input.phone) &&
      (!input.email || isValidEmail(input.email)) &&
      validPhone &&
      allowedServices.has(input.service) &&
      input.message.length >= 10 &&
      isValidDate(input.eventDate ?? "") &&
      consent;
    if (!valid) return json({ error: "validation_failed" }, 400);

    const rateLimitResponse = await enforceEnquiryRateLimit(request, env);
    if (rateLimitResponse) return rateLimitResponse;
    if (!env.DB) return json({ error: "database_not_configured" }, 503);

    const id = crypto.randomUUID();
    try {
      await env.DB.prepare(
        "INSERT INTO enquiries (id, name, email, phone, service, event_date, budget_range, message, consent, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)"
      ).bind(
        id,
        input.name,
        input.email,
        input.phone || null,
        input.service,
        input.eventDate || null,
        input.budgetRange || null,
        input.message,
        new Date().toISOString(),
        new Date().toISOString(),
      ).run();
      return json({ ok: true, id, message: "Enquiry received. We will get back to you." }, 201);
    } catch {
      return json({ error: "enquiry_storage_unavailable" }, 503);
    }
  }

  if (url.pathname.startsWith("/api/")) return json({ error: "not_found" }, 404);
  return new Response("Not found.", { status: 404 });
}

function applySecurityHeaders(response: Response, request: Request): Response {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  if (new URL(request.url).protocol === "https:") {
    headers.set("strict-transport-security", "max-age=31536000");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    let response: Response;
    if (url.pathname.startsWith("/api/")) {
      response = await handleApi(request, env);
    } else if (env.ASSETS) {
      response = await env.ASSETS.fetch(request);
    } else {
      response = new Response("Golden Films API is running. Static assets are not configured yet.", {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    return applySecurityHeaders(response, request);
  },
};
