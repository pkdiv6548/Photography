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
  DB: D1Binding;
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

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/api/health" && request.method === "GET") {
    try {
      await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
      return json({ ok: true, service: "golden-films-api", database: "connected" });
    } catch {
      return json({ ok: false, service: "golden-films-api", database: "unavailable" }, 503);
    }
  }

  if (url.pathname === "/api/categories" && request.method === "GET") {
    try {
      const result = await env.DB.prepare(
        `SELECT id, slug, title_en, title_hi, sort_order,
          CASE
            WHEN slug IN ('wedding-photography', 'pre-wedding-photography', 'portrait-personal-photography', 'fashion-model-photography', 'event-photography', 'product-photography', 'commercial-photography') THEN 'photography'
            WHEN slug IN ('cinematic-wedding-films', 'event-videography', 'promotional-commercial-videos', 'reels-short-form-videos', 'other-projects') THEN 'videography'
            ELSE 'editing'
          END AS group_name
         FROM categories ORDER BY sort_order, title_en`
      ).all();
      return json({ categories: result.results ?? [] });
    } catch {
      return json({ error: "Categories are temporarily unavailable." }, 503);
    }
  }

  if (url.pathname === "/api/enquiries" && request.method === "POST") {
    const origin = request.headers.get("origin");
    if (origin) {
      try {
        if (new URL(origin).origin !== url.origin) {
          return json({ error: "Request origin is not allowed." }, 403);
        }
      } catch {
        return json({ error: "Invalid request origin." }, 403);
      }
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return json({ error: "Content-Type must be application/json." }, 415);
    }

    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (declaredLength > 12_000) return json({ error: "Request is too large." }, 413);

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return json({ error: "Invalid JSON body." }, 400);
    }

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return json({ error: "Invalid enquiry data." }, 400);
    }

    const body = raw as Record<string, unknown>;
    // Honeypot: silently accept automated submissions without storing them.
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

    if (input.name.length < 2) return json({ error: "Please enter your name." }, 400);
    if (!input.email && !input.phone) return json({ error: "Please provide an email address or phone number." }, 400);
    if (input.email && !isValidEmail(input.email)) return json({ error: "Please enter a valid email address." }, 400);
    if (input.phone && !/^[+()\d .-]{7,30}$/.test(input.phone)) return json({ error: "Please enter a valid phone number." }, 400);
    if (!input.service) return json({ error: "Please select a service." }, 400);
    if (!input.message || input.message.length < 10) return json({ error: "Please add a little more detail to your message." }, 400);
    if (!isValidDate(input.eventDate ?? "")) return json({ error: "Please enter a valid event date." }, 400);

    const id = crypto.randomUUID();
    try {
      await env.DB.prepare(
        "INSERT INTO enquiries (id, name, email, phone, service, preferred_date, budget_range, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        id,
        input.name,
        input.email,
        input.phone,
        input.service,
        input.eventDate || null,
        input.budgetRange || null,
        input.message,
      ).run();
      return json({ ok: true, id, message: "Enquiry received. We will get back to you." }, 201);
    } catch {
      return json({ error: "We could not save your enquiry. Please try again later." }, 503);
    }
  }

  if (url.pathname.startsWith("/api/")) return json({ error: "Not found." }, 404);
  return new Response("Not found.", { status: 404 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Golden Films API is running. Static assets are not configured yet.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
