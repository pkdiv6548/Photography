export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean }>;
  run<T = Record<string, unknown>>(): Promise<{ results?: T[]; success: boolean }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface Env {
  DB?: D1Database;
  ALLOWED_ORIGIN?: string;
  RATE_LIMIT_SECRET?: string;
}

const MAX_BODY_BYTES = 16 * 1024;
const MAX_ENQUIRIES_PER_MINUTE = 5;
const ALLOWED_SERVICES = new Set([
  "wedding-photography",
  "pre-wedding",
  "portrait-fashion",
  "event-coverage",
  "product-commercial",
  "cinematic-video",
  "photo-editing",
  "video-editing",
  "other"
]);

type JsonReadResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: "too_large" | "malformed" };

function securityHeaders(request: Request, env: Env): Headers {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    "Vary": "Origin"
  });
  const origin = request.headers.get("Origin");
  const allowedOrigin = env.ALLOWED_ORIGIN?.trim() || new URL(request.url).origin;
  if (origin && origin === allowedOrigin) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

function json(
  request: Request,
  env: Env,
  status: number,
  data: unknown,
  extraHeaders?: HeadersInit
): Response {
  const headers = securityHeaders(request, env);
  if (extraHeaders) new Headers(extraHeaders).forEach((value, key) => headers.set(key, value));
  return new Response(JSON.stringify(data), { status, headers });
}

function isAllowedOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  const allowedOrigin = env.ALLOWED_ORIGIN?.trim() || new URL(request.url).origin;
  return origin === allowedOrigin;
}

async function readJsonLimited(request: Request): Promise<JsonReadResult> {
  const lengthHeader = request.headers.get("Content-Length");
  if (lengthHeader && Number(lengthHeader) > MAX_BODY_BYTES) {
    return { ok: false, reason: "too_large" };
  }
  if (!request.body) return { ok: false, reason: "malformed" };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let receivedBytes = 0;
  let text = "";
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      receivedBytes += item.value.byteLength;
      if (receivedBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return { ok: false, reason: "too_large" };
      }
      text += decoder.decode(item.value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}

function stringField(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(normalized)) {
    return null;
  }
  return normalized;
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateEnquiry(value: unknown):
  | { ok: true; data: {
      name: string;
      email: string;
      phone: string | null;
      service: string;
      eventDate: string | null;
      budgetRange: string | null;
      message: string;
      consent: 1;
    } }
  | { ok: false; message: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, message: "The request body must be a JSON object." };
  }
  const body = value as Record<string, unknown>;
  const name = stringField(body.name, 80);
  const email = stringField(body.email, 254)?.toLowerCase() ?? null;
  const phoneRaw = body.phone === undefined || body.phone === null ? "" : stringField(body.phone, 24);
  const service = stringField(body.service, 40);
  const message = stringField(body.message, 3000);
  const eventDateProvided = body.eventDate !== undefined && body.eventDate !== null && body.eventDate !== "";
  const eventDateRaw = eventDateProvided ? stringField(body.eventDate, 10) : null;
  const budgetProvided = body.budgetRange !== undefined && body.budgetRange !== null && body.budgetRange !== "";
  const budgetRaw = budgetProvided ? stringField(body.budgetRange, 80) : null;

  if (!name || name.length < 2) return { ok: false, message: "Enter a name between 2 and 80 characters." };
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (phoneRaw === null || (phoneRaw && !/^[+()\d\s.-]{7,24}$/.test(phoneRaw))) {
    return { ok: false, message: "Enter a valid phone number or leave it blank." };
  }
  if (!service || !ALLOWED_SERVICES.has(service)) {
    return { ok: false, message: "Select a supported service." };
  }
  if (!message || message.length < 10) return { ok: false, message: "The message must be at least 10 characters." };
  if (body.consent !== true) return { ok: false, message: "Consent is required to submit this enquiry." };
  if (eventDateProvided && (!eventDateRaw || !isValidIsoDate(eventDateRaw))) {
    return { ok: false, message: "Use a real calendar date in YYYY-MM-DD format." };
  }
  if (budgetProvided && !budgetRaw) {
    return { ok: false, message: "The budget range is invalid." };
  }

  return {
    ok: true,
    data: {
      name,
      email,
      phone: phoneRaw || null,
      service,
      eventDate: eventDateRaw,
      budgetRange: budgetRaw,
      message,
      consent: 1
    }
  };
}

async function hashIp(ip: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function enforceEnquiryRateLimit(
  db: D1Database,
  request: Request,
  secret: string
): Promise<{ allowed: boolean; retryAfter: number }> {
  const ip = request.headers.get("CF-Connecting-IP");
  if (!ip) throw new Error("Missing trusted client IP header.");

  const now = Date.now();
  const windowStart = Math.floor(now / 60_000);
  const keyHash = await hashIp(ip, secret);

  await db.prepare("DELETE FROM api_rate_limits WHERE window_start < ?1")
    .bind(windowStart - 2)
    .run();

  const row = await db.prepare(
    "INSERT INTO api_rate_limits (ip_hash, window_start, request_count) VALUES (?1, ?2, 1) " +
    "ON CONFLICT(ip_hash, window_start) DO UPDATE SET request_count = request_count + 1 " +
    "RETURNING request_count"
  ).bind(keyHash, windowStart).first<{ request_count: number }>();

  const retryAfter = Math.max(1, Math.ceil(60 - ((now % 60_000) / 1000)));
  return { allowed: (row?.request_count ?? MAX_ENQUIRIES_PER_MINUTE + 1) <= MAX_ENQUIRIES_PER_MINUTE, retryAfter };
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === "OPTIONS") {
    const headers = securityHeaders(request, env);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Max-Age", "600");
    return new Response(null, { status: 204, headers });
  }

  if (!isAllowedOrigin(request, env)) {
    return json(request, env, 403, { error: "origin_not_allowed" });
  }

  if (request.method === "GET" && path === "/api/health") {
    return json(request, env, 200, { status: "ok", service: "golden-films-api" });
  }

  if (request.method === "GET" && path === "/api/ready") {
    if (!env.DB) return json(request, env, 503, { error: "database_not_configured" });
    await env.DB.prepare("SELECT 1 AS ready").first();
    return json(request, env, 200, { status: "ready", database: "connected" });
  }

  if (request.method === "GET" && path === "/api/v1/categories") {
    const language = url.searchParams.get("lang") || "en";
    if (language !== "en" && language !== "hi") {
      return json(request, env, 400, { error: "invalid_language", supported: ["en", "hi"] });
    }
    if (!env.DB) return json(request, env, 503, { error: "database_not_configured" });
    const result = await env.DB.prepare(
      "SELECT c.slug, COALESCE(ct.name, en.name) AS name, c.sort_order AS sortOrder " +
      "FROM categories c " +
      "LEFT JOIN category_translations ct ON ct.category_id = c.id AND ct.language = ?1 " +
      "LEFT JOIN category_translations en ON en.category_id = c.id AND en.language = 'en' " +
      "WHERE c.is_published = 1 ORDER BY c.sort_order ASC"
    ).bind(language).all<{ slug: string; name: string; sortOrder: number }>();
    return json(request, env, 200, { data: result.results });
  }

  if (request.method === "GET" && path === "/api/v1/projects") {
    const language = url.searchParams.get("lang") || "en";
    if (language !== "en" && language !== "hi") {
      return json(request, env, 400, { error: "invalid_language", supported: ["en", "hi"] });
    }
    const category = url.searchParams.get("category");
    if (category && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category)) {
      return json(request, env, 400, { error: "invalid_category_slug" });
    }
    const rawLimit = url.searchParams.get("limit") || "24";
    const limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 48) {
      return json(request, env, 400, { error: "invalid_limit", allowed: "1-48" });
    }
    if (!env.DB) return json(request, env, 503, { error: "database_not_configured" });
    const result = await env.DB.prepare(
      "SELECT p.slug, p.cover_object_key AS coverKey, p.featured, c.slug AS categorySlug, " +
      "COALESCE(pt.title, en.title) AS title, " +
      "COALESCE(pt.description, en.description) AS description, " +
      "COALESCE(pt.alt_text, en.alt_text) AS altText " +
      "FROM projects p JOIN categories c ON c.id = p.category_id " +
      "LEFT JOIN project_translations pt ON pt.project_id = p.id AND pt.language = ?1 " +
      "LEFT JOIN project_translations en ON en.project_id = p.id AND en.language = 'en' " +
      "WHERE p.status = 'published' AND c.is_published = 1 AND (?2 IS NULL OR c.slug = ?2) " +
      "ORDER BY p.featured DESC, p.sort_order ASC, p.created_at DESC LIMIT ?3"
    ).bind(language, category, limit).all();
    return json(request, env, 200, { data: result.results, limit });
  }

  if (path === "/api/v1/enquiries" && request.method === "POST") {
    if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
      return json(request, env, 415, { error: "content_type_must_be_application_json" });
    }
    const parsed = await readJsonLimited(request);
    if (!parsed.ok) {
      const tooLarge = parsed.reason === "too_large";
      return json(request, env, tooLarge ? 413 : 400, {
        error: tooLarge ? "request_body_too_large" : "invalid_json",
        maxBytes: MAX_BODY_BYTES
      });
    }
    const validated = validateEnquiry(parsed.value);
    if (!validated.ok) return json(request, env, 400, { error: "validation_failed", message: validated.message });
    if (!env.DB || !env.RATE_LIMIT_SECRET) {
      return json(request, env, 503, { error: "enquiry_service_not_configured" });
    }

    const rate = await enforceEnquiryRateLimit(env.DB, request, env.RATE_LIMIT_SECRET);
    if (!rate.allowed) {
      return json(request, env, 429, { error: "rate_limit_exceeded", retryAfterSeconds: rate.retryAfter }, {
        "Retry-After": String(rate.retryAfter)
      });
    }

    const enquiry = validated.data;
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await env.DB.prepare(
      "INSERT INTO enquiries (id, name, email, phone, service, event_date, budget_range, message, consent, status, created_at) " +
      "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'new', ?10)"
    ).bind(
      id,
      enquiry.name,
      enquiry.email,
      enquiry.phone,
      enquiry.service,
      enquiry.eventDate,
      enquiry.budgetRange,
      enquiry.message,
      enquiry.consent,
      createdAt
    ).run();

    return json(request, env, 201, {
      data: { id, status: "received", createdAt },
      message: "Your enquiry was saved. No email notification is configured yet."
    });
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return json(request, env, 405, { error: "method_not_allowed" }, { Allow: "GET, POST, OPTIONS" });
  }
  return json(request, env, 404, { error: "not_found" });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error("Golden Films API request failed", error instanceof Error ? error.name : "UnknownError");
      return json(request, env, 500, { error: "internal_server_error" });
    }
  }
};