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
  batch<T = unknown>(statements: D1Statement[]): Promise<D1Result<T>[]>;
}

interface StaticAssetsBinding {
  fetch(request: Request): Promise<Response>;
}

// Media storage is Supabase-only. Do not add an R2 fallback: this project targets a zero-billing deployment.
interface Env {
  DB?: D1Binding;
  ASSETS?: StaticAssetsBinding;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_STORAGE_BUCKET?: string;
  ADMIN_SETUP_SECRET?: string;
}

const MONTHLY_MEDIA_UPLOAD_LIMIT_BYTES = 100 * 1024 * 1024;
const SUPABASE_MEDIA_MAX_FILE_BYTES = 20 * 1024 * 1024;

function isSupabaseStorageConfigured(env: Env): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_STORAGE_BUCKET);
}

function supabaseObjectUrl(env: Env, key: string): string {
  const base = env.SUPABASE_URL!.replace(/\/$/, "");
  const bucket = encodeURIComponent(env.SUPABASE_STORAGE_BUCKET!);
  const objectPath = key.split("/").map((part) => encodeURIComponent(part)).join("/");
  return `${base}/storage/v1/object/${bucket}/${objectPath}`;
}

function supabaseStorageHeaders(env: Env, contentType?: string): Headers {
  const headers = new Headers({
    apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
    authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY!}`,
  });
  if (contentType) headers.set("content-type", contentType);
  return headers;
}

async function putMediaObject(env: Env, key: string, body: ReadableStream<Uint8Array>, contentType: string): Promise<void> {
  if (!isSupabaseStorageConfigured(env)) throw new Error("media_storage_not_configured");
  const headers = supabaseStorageHeaders(env, contentType);
  headers.set("x-upsert", "false");
  headers.set("cache-control", "max-age=31536000");
  const response = await fetch(supabaseObjectUrl(env, key), { method: "POST", headers, body });
  if (!response.ok) throw new Error(`supabase_storage_upload_failed_${response.status}`);
}

async function getMediaObject(env: Env, key: string): Promise<Response | null> {
  if (!isSupabaseStorageConfigured(env)) throw new Error("media_storage_not_configured");
  const response = await fetch(supabaseObjectUrl(env, key), { method: "GET", headers: supabaseStorageHeaders(env) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`supabase_storage_download_failed_${response.status}`);
  return response;
}

async function deleteMediaObject(env: Env, key: string): Promise<void> {
  if (!isSupabaseStorageConfigured(env)) throw new Error("media_storage_not_configured");
  const url = `${env.SUPABASE_URL!.replace(/\/$/, "")}/storage/v1/object/${encodeURIComponent(env.SUPABASE_STORAGE_BUCKET!)}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: supabaseStorageHeaders(env, "application/json"),
    body: JSON.stringify({ prefixes: [key] }),
  });
  if (!response.ok && response.status !== 404) throw new Error(`supabase_storage_delete_failed_${response.status}`);
}

async function reserveMonthlyMediaBytes(db: D1Binding, bytes: number): Promise<{ reserved: boolean; monthKey: string }> {
  const monthKey = new Date().toISOString().slice(0, 7);
  const results = await db.batch([
    db.prepare("INSERT INTO gf_monthly_media_usage (month_key, used_bytes) VALUES (?, 0) ON CONFLICT(month_key) DO NOTHING").bind(monthKey),
    db.prepare("UPDATE gf_monthly_media_usage SET used_bytes = used_bytes + ? WHERE month_key = ? AND used_bytes + ? <= ?")
      .bind(bytes, monthKey, bytes, MONTHLY_MEDIA_UPLOAD_LIMIT_BYTES),
  ]);
  return { reserved: (results[1]?.meta?.changes ?? 0) > 0, monthKey };
}

async function releaseMonthlyMediaBytes(db: D1Binding, monthKey: string, bytes: number): Promise<void> {
  await db.prepare("UPDATE gf_monthly_media_usage SET used_bytes = MAX(0, used_bytes - ?) WHERE month_key = ?")
    .bind(bytes, monthKey).run();
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

const MAX_ENQUIRY_BODY_BYTES = 16_384;

async function readLimitedBody(request: Request): Promise<{ text?: string; tooLarge?: boolean; invalid?: boolean }> {
  if (!request.body) return { text: "" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_ENQUIRY_BODY_BYTES) {
        await reader.cancel();
        return { tooLarge: true };
      }
      chunks.push(value);
    }
    const combined = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(combined) };
  } catch {
    return { invalid: true };
  } finally {
    reader.releaseLock();
  }
}

async function readLimitedBytes(request: Request, maxBytes: number): Promise<{ bytes?: Uint8Array; tooLarge?: boolean; invalid?: boolean }> {
  if (!request.body) return { bytes: new Uint8Array() };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { tooLarge: true };
      }
      chunks.push(value);
    }
    const combined = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { bytes: combined };
  } catch {
    return { invalid: true };
  } finally {
    reader.releaseLock();
  }
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


// Keep PBKDF2 within Cloudflare Workers' constrained runtime budget.
// Login and account creation use the same constant, so hashes remain compatible.
const ADMIN_PASSWORD_ITERATIONS = 100_000;
const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
const AUTH_RATE_WINDOW_SECONDS = 15 * 60;
const AUTH_RATE_MAX_ATTEMPTS = 10;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function deriveAdminPassword(
  password: string,
  salt: Uint8Array,
  onStage?: (stage: string) => void,
): Promise<string> {
  onStage?.("password_import_key");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  onStage?.("password_derive_bits");
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ADMIN_PASSWORD_ITERATIONS }, key, 256,
  );
  onStage?.("password_encode_hash");
  return toBase64Url(new Uint8Array(bits));
}

function constantTimeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

function cookieValue(request: Request, name: string): string {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator >= 0 && part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return "";
}

function adminCookie(token: string, maxAge: number): string {
  return "__Host-gf_admin=" + token + "; Path=/; Max-Age=" + maxAge + "; Secure; HttpOnly; SameSite=Strict";
}

async function authRateLimited(request: Request, env: Env, purpose: string): Promise<boolean> {
  if (!env.DB) return true;
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const key = purpose + ":" + await sha256Hex(ip);
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / AUTH_RATE_WINDOW_SECONDS) * AUTH_RATE_WINDOW_SECONDS;
  try {
    const row = await env.DB.prepare(
      "INSERT INTO auth_rate_limits (rate_key, window_started_at, request_count) VALUES (?, ?, 1) " +
      "ON CONFLICT(rate_key) DO UPDATE SET " +
      "request_count = CASE WHEN window_started_at < ? THEN 1 ELSE request_count + 1 END, " +
      "window_started_at = CASE WHEN window_started_at < ? THEN excluded.window_started_at ELSE window_started_at END " +
      "RETURNING request_count"
    ).bind(key, windowStart, windowStart, windowStart).first<{ request_count: number }>();
    return !row || row.request_count > AUTH_RATE_MAX_ATTEMPTS;
  } catch {
    return true;
  }
}

async function readAdminJson(request: Request, maxBytes = 4096): Promise<Record<string, unknown> | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.split(";")[0].trim().toLowerCase() !== "application/json") return null;
  if (Number(request.headers.get("content-length") ?? "0") > maxBytes) return null;
  const parsed = await readLimitedBody(request);
  if (parsed.tooLarge || parsed.invalid || parsed.text === undefined || parsed.text.length > maxBytes) return null;
  try {
    const value: unknown = JSON.parse(parsed.text);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

async function currentAdmin(request: Request, env: Env): Promise<{ id: string; email: string; role: "owner" | "editor" } | null> {
  if (!env.DB) return null;
  const token = cookieValue(request, "__Host-gf_admin");
  if (!token || token.length > 256) return null;
  try {
    return await env.DB.prepare(
      "SELECT u.id, u.email, u.role FROM admin_sessions s JOIN admin_users u ON u.id = s.admin_user_id " +
      "WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND u.is_active = 1"
    ).bind(await sha256Hex(token)).first<{ id: string; email: string; role: "owner" | "editor" }>();
  } catch {
    return null;
  }
}

async function handleAdminAuth(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (!["/api/admin/setup", "/api/admin/login", "/api/admin/session", "/api/admin/logout"].includes(path)) return null;
  if (path === "/api/admin/session" ? request.method !== "GET" : request.method !== "POST") {
    const response = json({ error: "method_not_allowed" }, 405);
    response.headers.set("Allow", path === "/api/admin/session" ? "GET" : "POST");
    return response;
  }
  if (!env.DB) return json({ error: "database_not_configured" }, 503);

  if (path === "/api/admin/setup") {
    if (!env.ADMIN_SETUP_SECRET) return json({ error: "admin_setup_not_configured" }, 503);
    if (await authRateLimited(request, env, "setup")) return json({ error: "temporarily_unavailable" }, 429);
    if (!constantTimeEqual(request.headers.get("x-admin-setup-secret") ?? "", env.ADMIN_SETUP_SECRET)) {
      return json({ error: "setup_not_authorized" }, 403);
    }
    const body = await readAdminJson(request);
    const email = cleanText(body?.email, 254).toLowerCase();
    const password = typeof body?.password === "string" ? body.password : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 14 || password.length > 128) {
      return json({ error: "validation_failed", requirements: "Use a valid email and a 14–128 character password." }, 400);
    }
    const id = crypto.randomUUID();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    let setupStage = "password_derivation";
    try {
      // D1 batch executes the statements transactionally. Each follow-up statement
      // is conditional on the owner insert, so a repeated setup cannot mark setup
      // complete or emit an audit row without creating the initial owner.
      const passwordHash = await deriveAdminPassword(password, salt, (stage) => { setupStage = stage; });
      const passwordSalt = toBase64Url(salt);
      setupStage = "prepare_database_statements";
      const statements = [
        env.DB.prepare(
          "INSERT INTO admin_users (id, email, password_hash, password_salt, role, is_active) " +
          "SELECT ?, ?, ?, ?, 'owner', 1 WHERE NOT EXISTS (SELECT 1 FROM admin_users) " +
          "AND EXISTS (SELECT 1 FROM admin_setup WHERE id = 1 AND completed_at IS NULL)"
        ).bind(id, email, passwordHash, passwordSalt),
        env.DB.prepare(
          "UPDATE admin_setup SET completed_at = datetime('now') " +
          "WHERE id = 1 AND completed_at IS NULL AND EXISTS (SELECT 1 FROM admin_users WHERE id = ?)"
        ).bind(id),
        env.DB.prepare(
          "INSERT INTO audit_logs (id, admin_user_id, action, target_type, target_id) " +
          "SELECT ?, ?, 'initial_setup', 'admin', ? WHERE EXISTS (SELECT 1 FROM admin_users WHERE id = ?)"
        ).bind(crypto.randomUUID(), id, id, id),
      ];
      setupStage = "d1_batch";
      const results = await env.DB.batch(statements);
      setupStage = "verify_owner_insert";
      if ((results[0]?.meta?.changes ?? 0) !== 1) {
        return json({ error: "initial_setup_already_completed" }, 409);
      }
      return json({ ok: true, message: "Initial owner created. Sign in to continue." }, 201);
    } catch (error) {
      // Stage and error class/message help Preview debugging. Never log credentials,
      // request headers, hashes, salts, or the request body.
      const safeMessage = error instanceof Error ? error.message : String(error);
      console.error("[admin-setup] owner creation failed", JSON.stringify({
        stage: setupStage,
        errorName: error instanceof Error ? error.name : "UnknownError",
        error: safeMessage.slice(0, 300),
      }));
      return json({ error: "admin_setup_unavailable", diagnosticStage: setupStage }, 503);
    }
  }

  if (path === "/api/admin/login") {
    if (await authRateLimited(request, env, "login")) return json({ error: "temporarily_unavailable" }, 429);
    const body = await readAdminJson(request);
    const email = cleanText(body?.email, 254).toLowerCase();
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || password.length < 1 || password.length > 128) return json({ error: "invalid_credentials" }, 401);
    try {
      const user = await env.DB.prepare(
        "SELECT id, email, password_hash, password_salt, role FROM admin_users WHERE email = ? COLLATE NOCASE AND is_active = 1"
      ).bind(email).first<{ id: string; email: string; password_hash: string; password_salt: string; role: "owner" | "editor" }>();
      let verified = false;
      if (user) {
        try {
          verified = constantTimeEqual(
            await deriveAdminPassword(password, fromBase64Url(user.password_salt)), user.password_hash,
          );
        } catch { verified = false; }
      } else {
        await deriveAdminPassword(password, new Uint8Array(16));
      }
      if (!user || !verified) {
        await env.DB.prepare(
          "INSERT INTO audit_logs (id, action, target_type, target_id) VALUES (?, 'login_failed', 'admin', ?)"
        ).bind(crypto.randomUUID(), await sha256Hex(email)).run().catch(() => undefined);
        return json({ error: "invalid_credentials" }, 401);
      }
      const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
      const expiresAt = new Date(Date.now() + ADMIN_SESSION_SECONDS * 1000).toISOString().replace("T", " ").replace("Z", "");
      await env.DB.prepare(
        "INSERT INTO admin_sessions (id, admin_user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)"
      ).bind(crypto.randomUUID(), user.id, await sha256Hex(token), expiresAt).run();
      await env.DB.prepare("UPDATE admin_users SET last_login_at = datetime('now') WHERE id = ?").bind(user.id).run();
      await env.DB.prepare(
        "INSERT INTO audit_logs (id, admin_user_id, action, target_type, target_id) VALUES (?, ?, 'login_success', 'admin', ?)"
      ).bind(crypto.randomUUID(), user.id, user.id).run();
      const response = json({ ok: true, admin: { id: user.id, email: user.email, role: user.role } });
      response.headers.append("set-cookie", adminCookie(token, ADMIN_SESSION_SECONDS));
      return response;
    } catch {
      return json({ error: "admin_login_unavailable" }, 503);
    }
  }

  if (path === "/api/admin/session") {
    const admin = await currentAdmin(request, env);
    return admin ? json({ authenticated: true, admin }) : json({ authenticated: false }, 401);
  }

  const admin = await currentAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, 401);
  try {
    const token = cookieValue(request, "__Host-gf_admin");
    await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
    await env.DB.prepare(
      "INSERT INTO audit_logs (id, admin_user_id, action, target_type, target_id) VALUES (?, ?, 'logout', 'admin', ?)"
    ).bind(crypto.randomUUID(), admin.id, admin.id).run();
    const response = json({ ok: true });
    response.headers.append("set-cookie", adminCookie("", 0));
    return response;
  } catch {
    return json({ error: "admin_logout_unavailable" }, 503);
  }
}


async function supportedEnquiryStatuses(db: D1Binding): Promise<string[]> {
  const row = await db.prepare(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'enquiries'"
  ).first<{ sql: string }>();
  const definition = row?.sql ?? "";
  if (definition.includes("'read'") && definition.includes("'archived'")) return ["new", "read", "archived"];
  if (definition.includes("'in_progress'") && definition.includes("'closed'")) return ["new", "in_progress", "closed", "spam"];
  return ["new"];
}



async function hasValidMediaSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const starts = (signature: number[]) => signature.every((value, index) => bytes[index] === value);
  const asciiAt = (text: string, offset: number) =>
    text.split("").every((character, index) => bytes[offset + index] === character.charCodeAt(0));
  switch (file.type.toLowerCase()) {
    case "image/jpeg": return starts([0xff, 0xd8, 0xff]);
    case "image/png": return starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/gif": return asciiAt("GIF87a", 0) || asciiAt("GIF89a", 0);
    case "image/webp": return asciiAt("RIFF", 0) && asciiAt("WEBP", 8);
    case "video/mp4": return asciiAt("ftyp", 4);
    case "video/webm": return starts([0x1a, 0x45, 0xdf, 0xa3]);
    default: return false;
  }
}

function isSafeExternalMediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    const labels = host.split(".");
    const isIpv4Literal = labels.length === 4 && labels.every(label => /^\d{1,3}$/.test(label));
    if (!host || host.startsWith("[") || isIpv4Literal || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(host)) return false;
    const private172 = host.match(/^172\.(\d+)\./);
    if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return false;
    return true;
  } catch {
    return false;
  }
}

function isSafeCoverUrl(value: string): boolean {
  if (isSafeExternalMediaUrl(value)) return true;
  const prefix = "/api/media/projects/";
  if (!value.startsWith(prefix)) return false;
  const parts = value.slice(prefix.length).split("/");
  return parts.length === 2 &&
    /^[0-9a-f-]{36}$/i.test(parts[0]) &&
    /^[0-9a-f-]{36}\.(?:jpg|jpeg|png|webp|gif)$/i.test(parts[1]);
}

const CONTENT_FIELDS: Record<string, Record<string, number>> = {
  home: {
    heroTitleEn: 120, heroTitleHi: 120, heroTextEn: 500, heroTextHi: 500,
    aboutTitleEn: 120, aboutTitleHi: 120, aboutTextEn: 700, aboutTextHi: 700,
    contactTitleEn: 120, contactTitleHi: 120, contactTextEn: 500, contactTextHi: 500,
  },
  about: { titleEn: 120, titleHi: 120, textEn: 1200, textHi: 1200 },
  services: { titleEn: 120, titleHi: 120, introEn: 500, introHi: 500 },
  showreel: { titleEn: 120, titleHi: 120, textEn: 700, textHi: 700, videoUrl: 500 },
  contact: { titleEn: 120, titleHi: 120, textEn: 700, textHi: 700 },
};

function validatePageContent(page: string, raw: unknown): Record<string, string> | null {
  if (!Object.prototype.hasOwnProperty.call(CONTENT_FIELDS, page)) return null;
  const fields = CONTENT_FIELDS[page];
  if (!fields || !raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  const keys = Object.keys(input);
  if (!keys.length || keys.some((key) => !(key in fields))) return null;
  const output: Record<string, string> = {};
  for (const key of keys) {
    const value = input[key];
    if (typeof value !== "string") return null;
    const clean = value.trim();
    if (clean.length > fields[key] || /<\s*\/?\s*[a-z!][^>]*>/i.test(clean)) return null;
    if (key === "videoUrl" && clean) {
      try {
        const parsed = new URL(clean);
        if (parsed.protocol !== "https:" || !["youtube.com", "www.youtube.com", "youtu.be", "www.youtu.be", "vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(parsed.hostname)) return null;
      } catch { return null; }
    }
    output[key] = clean;
  }
  return output;
}

async function handleContentApi(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (path === "/api/content" && request.method === "GET") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    const page = url.searchParams.get("page") ?? "home";
    if (!Object.prototype.hasOwnProperty.call(CONTENT_FIELDS, page)) return json({ error: "invalid_page" }, 400);
    try {
      const row = await env.DB.prepare(
        "SELECT published_json, status FROM site_content WHERE page_slug = ?"
      ).bind(page).first<{ published_json: string; status: string }>();
      if (!row || !row.published_json || row.published_json === "{}") return json({ page, content: {} });
      const content: unknown = JSON.parse(row.published_json);
      return json({ page, content: content && typeof content === "object" && !Array.isArray(content) ? content : {} });
    } catch {
      return json({ error: "content_unavailable" }, 503);
    }
  }

  if (path === "/api/admin/content" && request.method === "GET") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    if (!await currentAdmin(request, env)) return json({ error: "unauthorized" }, 401);
    try {
      const result = await env.DB.prepare(
        "SELECT page_slug, draft_json, published_json, status, updated_at, published_at FROM site_content ORDER BY page_slug"
      ).all();
      return json({ pages: result.results ?? [] });
    } catch {
      return json({ error: "content_unavailable" }, 503);
    }
  }

  if (path === "/api/admin/content/revisions" && request.method === "GET") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    if (!await currentAdmin(request, env)) return json({ error: "unauthorized" }, 401);
    const page = url.searchParams.get("page") ?? "home";
    const rawLimit = url.searchParams.get("limit") ?? "20";
    const limit = Number(rawLimit);
    if (!Object.prototype.hasOwnProperty.call(CONTENT_FIELDS, page)) return json({ error: "invalid_page" }, 400);
    if (!/^\d+$/.test(rawLimit) || !Number.isInteger(limit) || limit < 1 || limit > 30) {
      return json({ error: "invalid_limit", allowed: "1-30" }, 400);
    }
    try {
      const result = await env.DB.prepare(
        "SELECT id, page_slug, revision_status, changed_by, created_at, content_json " +
        "FROM site_content_revisions WHERE page_slug = ? ORDER BY created_at DESC LIMIT ?"
      ).bind(page, limit).all();
      return json({ page, revisions: result.results ?? [] });
    } catch {
      return json({ error: "content_revisions_unavailable" }, 503);
    }
  }

  if (path === "/api/admin/content/restore" && request.method === "POST") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    const admin = await currentAdmin(request, env);
    if (!admin) return json({ error: "unauthorized" }, 401);
    const body = await readAdminJson(request, 8192);
    const revisionId = cleanText(body?.revisionId, 80);
    if (!revisionId) return json({ error: "validation_failed" }, 400);
    try {
      const revision = await env.DB.prepare(
        "SELECT id, page_slug, content_json FROM site_content_revisions WHERE id = ?"
      ).bind(revisionId).first<{ id: string; page_slug: string; content_json: string }>();
      if (!revision || !Object.prototype.hasOwnProperty.call(CONTENT_FIELDS, revision.page_slug)) {
        return json({ error: "revision_not_found" }, 404);
      }
      let parsed: unknown;
      try { parsed = JSON.parse(revision.content_json); } catch { return json({ error: "revision_invalid" }, 400); }
      const safeContent = validatePageContent(revision.page_slug, parsed);
      if (!safeContent) return json({ error: "revision_invalid" }, 400);
      const serialized = JSON.stringify(safeContent);
      await env.DB.prepare(
        "INSERT INTO site_content (page_slug, draft_json, status, updated_by, updated_at) VALUES (?, ?, 'draft', ?, datetime('now')) " +
        "ON CONFLICT(page_slug) DO UPDATE SET draft_json = excluded.draft_json, status = 'draft', updated_by = excluded.updated_by, updated_at = datetime('now')"
      ).bind(revision.page_slug, serialized, admin.id).run();
      await env.DB.prepare(
        "INSERT INTO site_content_revisions (id, page_slug, content_json, revision_status, changed_by) VALUES (?, ?, ?, 'draft', ?)"
      ).bind(crypto.randomUUID(), revision.page_slug, serialized, admin.id).run();
      await env.DB.prepare(
        "INSERT INTO audit_logs (id, admin_user_id, action, target_type, target_id) VALUES (?, ?, 'content_restored_as_draft', 'page', ?)"
      ).bind(crypto.randomUUID(), admin.id, revision.page_slug).run();
      return json({ ok: true, page: revision.page_slug, status: "draft", content: safeContent });
    } catch {
      return json({ error: "content_restore_unavailable" }, 503);
    }
  }

  if (path === "/api/admin/content/preview" && request.method === "GET") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    if (!await currentAdmin(request, env)) return json({ error: "unauthorized" }, 401);
    const page = url.searchParams.get("page") ?? "home";
    if (!Object.prototype.hasOwnProperty.call(CONTENT_FIELDS, page)) return json({ error: "invalid_page" }, 400);
    try {
      const row = await env.DB.prepare(
        "SELECT draft_json FROM site_content WHERE page_slug = ?"
      ).bind(page).first<{ draft_json: string }>();
      if (!row) return json({ error: "draft_not_found" }, 404);
      const content: unknown = JSON.parse(row.draft_json);
      return json({ page, preview: true, content: content && typeof content === "object" && !Array.isArray(content) ? content : {} });
    } catch {
      return json({ error: "content_preview_unavailable" }, 503);
    }
  }

  if (path === "/api/admin/content/save" && request.method === "POST") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    const admin = await currentAdmin(request, env);
    if (!admin) return json({ error: "unauthorized" }, 401);
    const body = await readAdminJson(request, 8192);
    const page = cleanText(body?.page, 20);
    const content = validatePageContent(page, body?.content);
    if (!content) return json({ error: "validation_failed", allowedPages: Object.keys(CONTENT_FIELDS) }, 400);
    const serialized = JSON.stringify(content);
    try {
      await env.DB.prepare(
        "INSERT INTO site_content (page_slug, draft_json, status, updated_by, updated_at) VALUES (?, ?, 'draft', ?, datetime('now')) " +
        "ON CONFLICT(page_slug) DO UPDATE SET draft_json = excluded.draft_json, status = 'draft', updated_by = excluded.updated_by, updated_at = datetime('now')"
      ).bind(page, serialized, admin.id).run();
      await env.DB.prepare(
        "INSERT INTO site_content_revisions (id, page_slug, content_json, revision_status, changed_by) VALUES (?, ?, ?, 'draft', ?)"
      ).bind(crypto.randomUUID(), page, serialized, admin.id).run();
      await env.DB.prepare(
        "INSERT INTO audit_logs (id, admin_user_id, action, target_type, target_id) VALUES (?, ?, 'content_saved_draft', 'page', ?)"
      ).bind(crypto.randomUUID(), admin.id, page).run();
      return json({ ok: true, page, status: "draft" });
    } catch {
      return json({ error: "content_save_unavailable" }, 503);
    }
  }

  if (path === "/api/admin/content/publish" && request.method === "POST") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    const admin = await currentAdmin(request, env);
    if (!admin) return json({ error: "unauthorized" }, 401);
    if (admin.role !== "owner") return json({ error: "forbidden" }, 403);
    const body = await readAdminJson(request);
    const page = cleanText(body?.page, 20);
    if (!Object.prototype.hasOwnProperty.call(CONTENT_FIELDS, page)) return json({ error: "invalid_page" }, 400);
    try {
      const result = await env.DB.prepare(
        "UPDATE site_content SET published_json = draft_json, status = 'published', published_at = datetime('now'), updated_at = datetime('now'), updated_by = ? WHERE page_slug = ?"
      ).bind(admin.id, page).run();
      if ((result.meta?.changes ?? 0) !== 1) return json({ error: "draft_not_found" }, 404);
      const row = await env.DB.prepare("SELECT draft_json FROM site_content WHERE page_slug = ?").bind(page).first<{ draft_json: string }>();
      if (!row) return json({ error: "draft_not_found" }, 404);
      await env.DB.prepare(
        "INSERT INTO site_content_revisions (id, page_slug, content_json, revision_status, changed_by) VALUES (?, ?, ?, 'published', ?)"
      ).bind(crypto.randomUUID(), page, row.draft_json, admin.id).run();
      await env.DB.prepare(
        "INSERT INTO audit_logs (id, admin_user_id, action, target_type, target_id) VALUES (?, ?, 'content_published', 'page', ?)"
      ).bind(crypto.randomUUID(), admin.id, page).run();
      return json({ ok: true, page, status: "published" });
    } catch {
      return json({ error: "content_publish_unavailable" }, 503);
    }
  }
  return null;
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


  if (url.pathname.startsWith("/api/media/") && request.method === "GET") {
    if (!env.DB || !isSupabaseStorageConfigured(env)) return json({ error: "media_storage_not_configured" }, 503);
    let key = "";
    try { key = decodeURIComponent(url.pathname.slice("/api/media/".length)); } catch { return json({ error: "media_not_found" }, 404); }
    if (!/^projects\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpg|jpeg|png|webp|gif|mp4|webm)$/i.test(key)) return json({ error: "media_not_found" }, 404);
    try {
      const allowed = await env.DB.prepare(
        "SELECT m.media_type FROM project_media m JOIN projects p ON p.id = m.project_id " +
        "WHERE m.original_key = ? AND m.is_public = 1 AND p.status = 'published'"
      ).bind(key).first<{ media_type: string }>();
      if (!allowed) return json({ error: "media_not_found" }, 404);
      const object = await getMediaObject(env, key);
      if (!object) return json({ error: "media_not_found" }, 404);
      const extension = key.split(".").pop()?.toLowerCase() ?? "";
      const fallbackType: Record<string, string> = {
        jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
        mp4: "video/mp4", webm: "video/webm",
      };
      const headers = new Headers({
        "content-type": object.headers.get("content-type") || fallbackType[extension] || "application/octet-stream",
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      });
      const etag = object.headers.get("etag");
      if (etag) headers.set("etag", etag);
      return new Response(object.body, { headers });
    } catch {
      return json({ error: "media_unavailable" }, 503);
    }
  }

  const adminAuthResponse = await handleAdminAuth(request, env, url);
  if (adminAuthResponse) return adminAuthResponse;
  const contentResponse = await handleContentApi(request, env, url);
  if (contentResponse) return contentResponse;

  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({ status: "ok", service: "golden-films-api" });
  }

  if (url.pathname === "/api/ready" && request.method === "GET") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    try {
      const required: Record<string, string[]> = {
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
      for (const [table, expected] of Object.entries(required)) {
        const info = await env.DB.prepare("PRAGMA table_info(" + table + ")").all<{ name: string }>();
        const actual = new Set((info.results ?? []).map((column) => column.name));
        if (!expected.every((column) => actual.has(column))) throw new Error("incompatible table schema");
      }
      const setup = await env.DB.prepare("SELECT completed_at FROM admin_setup WHERE id = 1").first<{ completed_at: string | null }>();
      const adminCountRow = await env.DB.prepare("SELECT COUNT(*) AS count FROM admin_users").first<{ count: number }>();
      const adminCount = Number(adminCountRow?.count ?? 0);
      const adminSetupComplete = Boolean(setup?.completed_at) || adminCount > 0;
      const blockers: string[] = [];
      const supabaseStorageConfigured = isSupabaseStorageConfigured(env);
      if (!env.ADMIN_SETUP_SECRET) blockers.push("admin_setup_secret_missing");
      if (!supabaseStorageConfigured) blockers.push("supabase_storage_not_configured");
      if (adminSetupComplete) blockers.push("admin_setup_already_completed");
      return json({
        status: "ready",
        schema: "legacy-compatible",
        adminSetupSecretConfigured: Boolean(env.ADMIN_SETUP_SECRET),
        supabaseStorageConfigured,
        adminSetupComplete,
        adminCount,
        blockers,
      });
    } catch {
      return json({ error: "database_schema_incompatible" }, 503);
    }
  }

  if ((url.pathname === "/api/categories" || url.pathname === "/api/v1/categories") && request.method === "GET") {
    const lang = url.searchParams.get("lang") ?? "en";
    if (lang !== "en" && lang !== "hi") return json({ error: "invalid_language", supported: ["en", "hi"] }, 400);
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    try {
      const result = await env.DB.prepare(
        `SELECT c.id, c.slug, c.title_en, c.title_hi, c.description_en, c.description_hi, c.sort_order,
          CASE
            WHEN c.slug IN ('wedding-photography', 'pre-wedding-photography', 'portrait-personal-photography', 'fashion-model-photography', 'event-photography', 'product-photography', 'commercial-photography') THEN 'photography'
            WHEN c.slug IN ('cinematic-wedding-films', 'event-videography', 'promotional-commercial-videos', 'reels-short-form-videos', 'other-projects') THEN 'videography'
            ELSE 'editing'
          END AS group_name
         FROM categories c
         ORDER BY c.sort_order, c.title_en`
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
      const baseSql =
        "SELECT p.id, p.slug, p.category_slug, p.cover_image_url, p.status, p.is_featured AS is_featured, " +
        "p.location, p.project_date, p.updated_at, en.title AS title_en, en.description AS description_en, " +
        "hi.title AS title_hi, hi.description AS description_hi " +
        "FROM projects p LEFT JOIN project_translations en ON en.project_id = p.id AND en.locale = 'en' " +
        "LEFT JOIN project_translations hi ON hi.project_id = p.id AND hi.locale = 'hi' " +
        "WHERE p.status = 'published' ";
      const query = category
        ? env.DB.prepare(baseSql + "AND p.category_slug = ? ORDER BY p.is_featured DESC, p.updated_at DESC LIMIT ?").bind(category, limit)
        : env.DB.prepare(baseSql + "ORDER BY p.is_featured DESC, p.updated_at DESC LIMIT ?").bind(limit);
      const result = await query.all();
      const media = await env.DB.prepare(
        "SELECT m.id, m.project_id, m.media_type, m.preview_url, m.alt_en, m.alt_hi, m.sort_order " +
        "FROM project_media m JOIN projects p ON p.id = m.project_id " +
        "WHERE p.status = 'published' AND m.is_public = 1 ORDER BY m.project_id, m.sort_order"
      ).all();
      return json({ projects: result.results ?? [], media: media.results ?? [] });
    } catch {
      return json({ error: "projects_unavailable" }, 503);
    }
  }

  if ((url.pathname === "/api/enquiries" || url.pathname === "/api/v1/enquiries") && request.method === "POST") {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.split(";")[0].trim().toLowerCase() !== "application/json") {
      return json({ error: "content_type_must_be_application_json" }, 415);
    }

    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_ENQUIRY_BODY_BYTES) return json({ error: "request_too_large" }, 413);

    const bodyRead = await readLimitedBody(request);
    if (bodyRead.tooLarge) return json({ error: "request_too_large" }, 413);
    if (bodyRead.invalid || bodyRead.text === undefined) return json({ error: "invalid_json" }, 400);

    let raw: unknown;
    try {
      raw = JSON.parse(bodyRead.text);
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return json({ error: "validation_failed" }, 400);
    }

    const body = raw as Record<string, unknown>;
    if (cleanText(body.website, 200)) return json({ ok: true, message: "Enquiry received." }, 201);

    const input: EnquiryInput = {
      name: cleanText(body.name, 80),
      email: cleanText(body.email, 254).toLowerCase(),
      phone: cleanText(body.phone, 30),
      service: cleanText(body.service, 80),
      eventDate: cleanText(body.eventDate, 10),
      budgetRange: cleanText(body.budgetRange, 60),
      message: cleanText(body.message, 3000),
    };
    // Keep this allowlist aligned with the real service IDs emitted by CustomerPages.tsx.
    const allowedServices = new Set([
      "photography", "videography", "photo-editing", "video-editing",
      "wedding", "pre-wedding", "candid", "maternity", "baby-kids", "event",
      "fashion", "product", "commercial",
      "wedding-films", "pre-wedding-films", "cinematic", "event-films", "drone",
      "corporate", "music-video", "documentary", "ad-films"
    ]);
    const consent = body.consent === true;
    const phoneValue = input.phone ?? "";
    const phoneDigitCount = phoneValue.replace(/\D/g, "").length;
    const validPhone = !phoneValue || (/^[+()\d .-]{7,30}$/.test(phoneValue) && phoneDigitCount >= 7);
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

    if (!env.DB) return json({ error: "database_not_configured" }, 503);

    // Verify the legacy live schema before any rate-limit or enquiry write.
    // The consent column is deliberately required; it is added by the reviewed forward migration.
    let enquiryDateColumn: "preferred_date" | "event_date" = "preferred_date";
    try {
      const columns = await env.DB.prepare("PRAGMA table_info(enquiries)").all<{ name: string }>();
      const names = new Set((columns.results ?? []).map((column) => column.name));
      const required = ["id", "name", "email", "phone", "service", "budget_range", "message", "consent", "status", "created_at", "updated_at"];
      if (!required.every((column) => names.has(column))) throw new Error("incompatible enquiries schema");
      if (names.has("preferred_date")) enquiryDateColumn = "preferred_date";
      else if (names.has("event_date")) enquiryDateColumn = "event_date";
      else throw new Error("missing event date column");
      const limits = await env.DB.prepare("PRAGMA table_info(enquiry_rate_limits)").all<{ name: string }>();
      const limitNames = new Set((limits.results ?? []).map((column) => column.name));
      if (!["ip_hash", "window_start", "request_count"].every((column) => limitNames.has(column))) throw new Error("incompatible rate-limit schema");
    } catch {
      return json({ error: "database_schema_incompatible" }, 503);
    }

    const rateLimitResponse = await enforceEnquiryRateLimit(request, env);
    if (rateLimitResponse) return rateLimitResponse;
    if (!env.DB) return json({ error: "database_not_configured" }, 503);

    const id = crypto.randomUUID();
    try {
      await env.DB.prepare(
        "INSERT INTO enquiries (id, name, email, phone, service, " + enquiryDateColumn + ", budget_range, message, consent, status, created_at, updated_at) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'new', datetime('now'), datetime('now'))"
      ).bind(
        id,
        input.name,
        input.email || "",
        input.phone || "",
        input.service,
        input.eventDate || null,
        input.budgetRange || "",
        input.message,
      ).run();
      return json({ ok: true, id, message: "Enquiry received. We will get back to you." }, 201);
    } catch {
      return json({ error: "enquiry_storage_unavailable" }, 503);
    }
  }


  if (url.pathname === "/api/admin/enquiries" && request.method === "GET") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    const admin = await currentAdmin(request, env);
    if (!admin) return json({ error: "unauthorized" }, 401);
    const rawLimit = url.searchParams.get("limit") ?? "50";
    const rawOffset = url.searchParams.get("offset") ?? "0";
    const limit = Number(rawLimit);
    const offset = Number(rawOffset);
    if (!/^\d+$/.test(rawLimit) || !Number.isInteger(limit) || limit < 1 || limit > 100 ||
        !/^\d+$/.test(rawOffset) || !Number.isInteger(offset) || offset < 0 || offset > 10000) {
      return json({ error: "invalid_pagination" }, 400);
    }
    const status = url.searchParams.get("status") ?? "";
    try {
      const allowedStatuses = await supportedEnquiryStatuses(env.DB);
      if (status && !allowedStatuses.includes(status)) {
        return json({ error: "invalid_status", allowed: allowedStatuses }, 400);
      }
      const schema = await env.DB.prepare("PRAGMA table_info(enquiries)").all<{ name: string }>();
      const columns = new Set((schema.results ?? []).map((column) => column.name));
      const required = ["id", "name", "email", "phone", "service", "budget_range", "message", "status", "created_at", "updated_at"];
      if (!required.every((column) => columns.has(column))) return json({ error: "database_schema_incompatible" }, 503);
      const dateColumn = columns.has("preferred_date") ? "preferred_date" : columns.has("event_date") ? "event_date" : null;
      if (!dateColumn) return json({ error: "database_schema_incompatible" }, 503);
      const statement = status
        ? env.DB.prepare(
          "SELECT id, name, email, phone, service, " + dateColumn + " AS event_date, budget_range, message, status, created_at, updated_at " +
          "FROM enquiries WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
        ).bind(status, limit, offset)
        : env.DB.prepare(
          "SELECT id, name, email, phone, service, " + dateColumn + " AS event_date, budget_range, message, status, created_at, updated_at " +
          "FROM enquiries ORDER BY created_at DESC LIMIT ? OFFSET ?"
        ).bind(limit, offset);
      const result = await statement.all();
      const count = await env.DB.prepare(
        "SELECT status, COUNT(*) AS count FROM enquiries GROUP BY status"
      ).all<{ status: string; count: number }>();
      return json({ enquiries: result.results ?? [], counts: count.results ?? [], allowedStatuses, limit, offset });
    } catch {
      return json({ error: "enquiries_unavailable" }, 503);
    }
  }

  if (url.pathname === "/api/admin/enquiries/status" && request.method === "POST") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    const admin = await currentAdmin(request, env);
    if (!admin) return json({ error: "unauthorized" }, 401);
    const body = await readAdminJson(request);
    const id = cleanText(body?.id, 80);
    const status = cleanText(body?.status, 20);
    try {
      const allowedStatuses = await supportedEnquiryStatuses(env.DB);
      if (!id || !allowedStatuses.includes(status)) {
        return json({ error: "validation_failed", allowedStatuses }, 400);
      }
      const columns = await env.DB.prepare("PRAGMA table_info(enquiries)").all<{ name: string }>();
      const available = new Set((columns.results ?? []).map((column) => column.name));
      if (!["id", "status", "updated_at"].every((column) => available.has(column))) {
        return json({ error: "database_schema_incompatible" }, 503);
      }
      const update = await env.DB.prepare(
        "UPDATE enquiries SET status = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(status, id).run();
      if ((update.meta?.changes ?? 0) !== 1) return json({ error: "enquiry_not_found" }, 404);
      await env.DB.prepare(
        "INSERT INTO audit_logs (id, admin_user_id, action, target_type, target_id) VALUES (?, ?, ?, 'enquiry', ?)"
      ).bind(crypto.randomUUID(), admin.id, "enquiry_status_" + status, id).run();
      return json({ ok: true, id, status });
    } catch {
      return json({ error: "enquiry_update_unavailable" }, 503);
    }
  }

  if (url.pathname === "/api/admin/projects" && request.method === "GET") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    if (!await currentAdmin(request, env)) return json({ error: "unauthorized" }, 401);
    try {
      const result = await env.DB.prepare(
        "SELECT p.id, p.slug, p.category_slug, p.cover_image_url, p.status, p.is_featured, p.location, p.project_date, p.demo_label, p.created_at, p.updated_at, " +
        "en.title AS title_en, en.description AS description_en, hi.title AS title_hi, hi.description AS description_hi " +
        "FROM projects p LEFT JOIN project_translations en ON en.project_id = p.id AND en.locale = 'en' " +
        "LEFT JOIN project_translations hi ON hi.project_id = p.id AND hi.locale = 'hi' " +
        "ORDER BY p.updated_at DESC LIMIT 100"
      ).all();
      const categories = await env.DB.prepare("SELECT slug, title_en, title_hi FROM categories ORDER BY sort_order, title_en").all();
      const media = await env.DB.prepare(
        "SELECT id, project_id, media_type, preview_url, alt_en, alt_hi, sort_order, is_public, created_at FROM project_media ORDER BY project_id, sort_order"
      ).all();
      return json({ projects: result.results ?? [], categories: categories.results ?? [], media: media.results ?? [] });
    } catch {
      return json({ error: "projects_unavailable" }, 503);
    }
  }

  if (url.pathname === "/api/admin/projects/save" && request.method === "POST") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    const admin = await currentAdmin(request, env);
    if (!admin) return json({ error: "unauthorized" }, 401);
    const body = await readAdminJson(request, 8192);
    const slug = cleanText(body?.slug, 80).toLowerCase();
    const categorySlug = cleanText(body?.categorySlug, 80);
    const titleEn = cleanText(body?.titleEn, 120);
    const titleHi = cleanText(body?.titleHi, 120);
    const descriptionEn = cleanText(body?.descriptionEn, 2000);
    const descriptionHi = cleanText(body?.descriptionHi, 2000);
    const coverImageUrl = cleanText(body?.coverImageUrl, 1000);
    const status = cleanText(body?.status, 20);
    const location = cleanText(body?.location, 120);
    const projectDate = cleanText(body?.projectDate, 10);
    const demoLabel = cleanText(body?.demoLabel, 80) || "Portfolio";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !categorySlug || !titleEn || !titleHi ||
        !isSafeCoverUrl(coverImageUrl) || !["draft", "published"].includes(status) ||
        (projectDate && !isValidDate(projectDate))) {
      return json({ error: "validation_failed" }, 400);
    }
    if (status === "published" && admin.role !== "owner") return json({ error: "forbidden" }, 403);
    try {
      const existing = await env.DB.prepare("SELECT id, status FROM projects WHERE slug = ?").bind(slug).first<{ id: string; status: string }>();
      if (existing?.status === "published" && admin.role !== "owner") return json({ error: "forbidden" }, 403);
      const category = await env.DB.prepare("SELECT slug FROM categories WHERE slug = ?").bind(categorySlug).first<{ slug: string }>();
      if (!category) return json({ error: "invalid_category" }, 400);
      const projectId = crypto.randomUUID();
      const project = await env.DB.prepare(
        "INSERT INTO projects (id, slug, category_slug, cover_image_url, status, is_featured, location, project_date, demo_label, updated_at) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')) " +
        "ON CONFLICT(slug) DO UPDATE SET category_slug = excluded.category_slug, cover_image_url = excluded.cover_image_url, " +
        "status = excluded.status, is_featured = excluded.is_featured, location = excluded.location, project_date = excluded.project_date, " +
        "demo_label = excluded.demo_label, updated_at = datetime('now') RETURNING id"
      ).bind(projectId, slug, categorySlug, coverImageUrl, status, body?.isFeatured === true ? 1 : 0, location || null, projectDate || null, demoLabel)
        .first<{ id: string }>();
      if (!project?.id) return json({ error: "project_save_unavailable" }, 503);
      await env.DB.prepare(
        "INSERT INTO project_translations (project_id, language, locale, title, description) VALUES (?, 'en', 'en', ?, ?) " +
        "ON CONFLICT(project_id, locale) DO UPDATE SET title = excluded.title, description = excluded.description"
      ).bind(project.id, titleEn, descriptionEn).run();
      await env.DB.prepare(
        "INSERT INTO project_translations (project_id, language, locale, title, description) VALUES (?, 'hi', 'hi', ?, ?) " +
        "ON CONFLICT(project_id, locale) DO UPDATE SET title = excluded.title, description = excluded.description"
      ).bind(project.id, titleHi, descriptionHi).run();
      await env.DB.prepare(
        "INSERT INTO audit_logs (id, admin_user_id, action, target_type, target_id) VALUES (?, ?, ?, 'project', ?)"
      ).bind(crypto.randomUUID(), admin.id, status === "published" ? "project_published" : "project_saved_draft", project.id).run();
      return json({ ok: true, id: project.id, slug, status });
    } catch {
      return json({ error: "project_save_unavailable" }, 503);
    }
  }


  if (url.pathname === "/api/admin/projects/media/upload" && request.method === "POST") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    const admin = await currentAdmin(request, env);
    if (!admin) return json({ error: "unauthorized" }, 401);
    if (!isSupabaseStorageConfigured(env)) return json({ error: "media_storage_not_configured" }, 503);
    const maxMultipartBytes = SUPABASE_MEDIA_MAX_FILE_BYTES + 64 * 1024;
    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (declaredLength > maxMultipartBytes) return json({ error: "file_too_large" }, 413);
    // Content-Length is optional on HTTP/2 and may be omitted by intermediaries.
    // Enforce the cap while streaming before parsing multipart data to avoid unbounded buffering.
    const multipartRead = await readLimitedBytes(request, maxMultipartBytes);
    if (multipartRead.tooLarge) return json({ error: "file_too_large" }, 413);
    if (multipartRead.invalid || !multipartRead.bytes) return json({ error: "invalid_multipart_form" }, 400);
    const multipartBuffer = multipartRead.bytes.buffer.slice(
      multipartRead.bytes.byteOffset,
      multipartRead.bytes.byteOffset + multipartRead.bytes.byteLength
    ) as ArrayBuffer;
    const formRequest = new Request(request.url, { method: "POST", headers: request.headers, body: multipartBuffer });
    let form: FormData;
    try { form = await formRequest.formData(); } catch { return json({ error: "invalid_multipart_form" }, 400); }
    const file = form.get("file");
    const projectId = cleanText(form.get("projectId"), 80);
    const altEn = cleanText(form.get("altEn"), 250);
    const altHi = cleanText(form.get("altHi"), 250);
    const sortOrder = Number(form.get("sortOrder") ?? "0");
    const isPublic = form.get("isPublic") === "true";
    const isCover = form.get("isCover") === "true";
    if (!file || typeof file === "string" || !projectId) return json({ error: "validation_failed" }, 400);
    if (file.size < 1 || file.size > SUPABASE_MEDIA_MAX_FILE_BYTES) return json({ error: "file_too_large", maxBytes: SUPABASE_MEDIA_MAX_FILE_BYTES }, 413);
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) return json({ error: "validation_failed" }, 400);
    const mimeExtensions: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
      "video/mp4": "mp4", "video/webm": "webm",
    };
    const extension = mimeExtensions[file.type.toLowerCase()];
    if (!extension) return json({ error: "unsupported_media_type", allowed: Object.keys(mimeExtensions) }, 415);
    const mediaType = file.type.startsWith("video/") ? "video" : "image";
    if (!await hasValidMediaSignature(file)) return json({ error: "file_signature_mismatch" }, 415);
    if ((isPublic || isCover) && admin.role !== "owner") return json({ error: "forbidden" }, 403);
    try {
      const project = await env.DB.prepare("SELECT id, status FROM projects WHERE id = ?").bind(projectId).first<{ id: string; status: string }>();
      if (!project) return json({ error: "project_not_found" }, 404);
      if (isCover && mediaType !== "image") return json({ error: "cover_must_be_image" }, 400);
      if (isCover && !isPublic) return json({ error: "cover_must_be_public" }, 400);
      const id = crypto.randomUUID();
      const key = "projects/" + projectId + "/" + id + "." + extension;
      const reservation = await reserveMonthlyMediaBytes(env.DB, file.size);
      if (!reservation.reserved) {
        return json({ error: "monthly_upload_quota_exceeded", limitBytes: MONTHLY_MEDIA_UPLOAD_LIMIT_BYTES, month: reservation.monthKey }, 413);
      }
      let objectUploaded = false;
      try {
        await putMediaObject(env, key, file.stream(), file.type.toLowerCase());
        objectUploaded = true;
        const previewUrl = "/api/media/" + key;
        const statements = [
          env.DB.prepare(
            "INSERT INTO project_media (id, project_id, media_type, preview_url, original_key, alt_en, alt_hi, sort_order, is_public) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
          ).bind(id, projectId, mediaType, previewUrl, key, altEn, altHi, sortOrder, isPublic ? 1 : 0),
        ];
        if (isCover) {
          statements.push(env.DB.prepare("UPDATE projects SET cover_image_url = ?, updated_at = datetime('now') WHERE id = ?")
            .bind(previewUrl, projectId));
        }
        statements.push(env.DB.prepare(
          "INSERT INTO audit_logs (id, admin_user_id, action, target_type, target_id) VALUES (?, ?, ?, 'media', ?)"
        ).bind(crypto.randomUUID(), admin.id, isPublic ? "media_uploaded_public" : "media_uploaded_draft", id));
        await env.DB.batch(statements);
        return json({ ok: true, id, previewUrl, mediaType, isPublic, isCover, monthlyLimitBytes: MONTHLY_MEDIA_UPLOAD_LIMIT_BYTES }, 201);
      } catch (error) {
        if (objectUploaded) await deleteMediaObject(env, key).catch(() => undefined);
        await releaseMonthlyMediaBytes(env.DB, reservation.monthKey, file.size).catch(() => undefined);
        throw error;
      }
    } catch {
      return json({ error: "media_upload_unavailable" }, 503);
    }
  }

  if (url.pathname === "/api/admin/projects/media" && request.method === "POST") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    const admin = await currentAdmin(request, env);
    if (!admin) return json({ error: "unauthorized" }, 401);
    const body = await readAdminJson(request, 4096);
    const projectId = cleanText(body?.projectId, 80);
    const mediaType = cleanText(body?.mediaType, 10);
    const previewUrl = cleanText(body?.previewUrl, 1000);
    const altEn = cleanText(body?.altEn, 250);
    const altHi = cleanText(body?.altHi, 250);
    const sortOrder = Number(body?.sortOrder ?? 0);
    if (!projectId || !["image", "video"].includes(mediaType) || !isSafeExternalMediaUrl(previewUrl) ||
        !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) {
      return json({ error: "validation_failed" }, 400);
    }
    if (body?.isPublic === true && admin.role !== "owner") return json({ error: "forbidden" }, 403);
    try {
      const project = await env.DB.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first<{ id: string }>();
      if (!project) return json({ error: "project_not_found" }, 404);
      const id = crypto.randomUUID();
      await env.DB.prepare(
        "INSERT INTO project_media (id, project_id, media_type, preview_url, original_key, alt_en, alt_hi, sort_order, is_public) " +
        "VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)"
      ).bind(id, projectId, mediaType, previewUrl, altEn, altHi, sortOrder, body?.isPublic === true ? 1 : 0).run();
      await env.DB.prepare(
        "INSERT INTO audit_logs (id, admin_user_id, action, target_type, target_id) VALUES (?, ?, ?, 'media', ?)"
      ).bind(crypto.randomUUID(), admin.id, body?.isPublic === true ? "media_added_public" : "media_added_draft", id).run();
      return json({ ok: true, id, isPublic: body?.isPublic === true }, 201);
    } catch {
      return json({ error: "media_save_unavailable" }, 503);
    }
  }

  if (url.pathname === "/api/admin/projects/media/replace" && request.method === "POST") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    const admin = await currentAdmin(request, env);
    if (!admin) return json({ error: "unauthorized" }, 401);
    const body = await readAdminJson(request, 4096);
    const id = cleanText(body?.id, 80);
    const previewUrl = cleanText(body?.previewUrl, 1000);
    const altEn = cleanText(body?.altEn, 250);
    const altHi = cleanText(body?.altHi, 250);
    if (!id || !isSafeExternalMediaUrl(previewUrl)) return json({ error: "validation_failed" }, 400);
    try {
      const current = await env.DB.prepare(
        "SELECT m.project_id, m.preview_url, m.is_public, p.cover_image_url FROM project_media m JOIN projects p ON p.id = m.project_id WHERE m.id = ?"
      ).bind(id).first<{ project_id: string; preview_url: string; is_public: number; cover_image_url: string }>();
      if (!current) return json({ error: "media_not_found" }, 404);
      if (admin.role !== "owner" && (current.is_public === 1 || current.cover_image_url === current.preview_url)) return json({ error: "forbidden" }, 403);
      const result = await env.DB.prepare(
        "UPDATE project_media SET preview_url = ?, original_key = NULL, alt_en = ?, alt_hi = ? WHERE id = ?"
      ).bind(previewUrl, altEn, altHi, id).run();
      if ((result.meta?.changes ?? 0) !== 1) return json({ error: "media_not_found" }, 404);
      await env.DB.prepare(
        "UPDATE projects SET cover_image_url = ?, updated_at = datetime('now') WHERE id = ? AND cover_image_url = ?"
      ).bind(previewUrl, current.project_id, current.preview_url).run();
      await env.DB.prepare(
        "INSERT INTO audit_logs (id, admin_user_id, action, target_type, target_id) VALUES (?, ?, 'media_replaced', 'media', ?)"
      ).bind(crypto.randomUUID(), admin.id, id).run();
      return json({ ok: true, id });
    } catch {
      return json({ error: "media_replace_unavailable" }, 503);
    }
  }

  if (url.pathname === "/api/admin/projects/media/hide" && request.method === "POST") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    const admin = await currentAdmin(request, env);
    if (!admin) return json({ error: "unauthorized" }, 401);
    if (admin.role !== "owner") return json({ error: "forbidden" }, 403);
    const body = await readAdminJson(request);
    const id = cleanText(body?.id, 80);
    if (!id) return json({ error: "validation_failed" }, 400);
    try {
      const current = await env.DB.prepare(
        "SELECT m.preview_url, p.cover_image_url FROM project_media m JOIN projects p ON p.id = m.project_id WHERE m.id = ?"
      ).bind(id).first<{ preview_url: string; cover_image_url: string }>();
      if (!current) return json({ error: "media_not_found" }, 404);
      if (current.preview_url === current.cover_image_url) return json({ error: "replace_cover_before_hiding" }, 409);
      const result = await env.DB.prepare("UPDATE project_media SET is_public = 0 WHERE id = ?").bind(id).run();
      if ((result.meta?.changes ?? 0) !== 1) return json({ error: "media_not_found" }, 404);
      await env.DB.prepare(
        "INSERT INTO audit_logs (id, admin_user_id, action, target_type, target_id) VALUES (?, ?, 'media_hidden', 'media', ?)"
      ).bind(crypto.randomUUID(), admin.id, id).run();
      return json({ ok: true, id, isPublic: false });
    } catch {
      return json({ error: "media_hide_unavailable" }, 503);
    }
  }

  if (url.pathname === "/api/admin/users" && request.method === "GET") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    const admin = await currentAdmin(request, env);
    if (!admin) return json({ error: "unauthorized" }, 401);
    if (admin.role !== "owner") return json({ error: "forbidden" }, 403);
    try {
      const result = await env.DB.prepare(
        "SELECT id, email, role, is_active, created_at, last_login_at FROM admin_users ORDER BY created_at DESC LIMIT 100"
      ).all();
      return json({ users: result.results ?? [] });
    } catch {
      return json({ error: "admin_users_unavailable" }, 503);
    }
  }

  if (url.pathname === "/api/admin/users/create" && request.method === "POST") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    const admin = await currentAdmin(request, env);
    if (!admin) return json({ error: "unauthorized" }, 401);
    if (admin.role !== "owner") return json({ error: "forbidden" }, 403);
    if (await authRateLimited(request, env, "create-admin")) return json({ error: "temporarily_unavailable" }, 429);
    const body = await readAdminJson(request);
    const email = cleanText(body?.email, 254).toLowerCase();
    const password = typeof body?.password === "string" ? body.password : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 14 || password.length > 128) {
      return json({ error: "validation_failed", requirements: "Use a valid email and a 14–128 character password." }, 400);
    }
    const salt = crypto.getRandomValues(new Uint8Array(16));
    try {
      const id = crypto.randomUUID();
      await env.DB.prepare(
        "INSERT INTO admin_users (id, email, password_hash, password_salt, role, is_active) VALUES (?, ?, ?, ?, 'editor', 1)"
      ).bind(id, email, await deriveAdminPassword(password, salt), toBase64Url(salt)).run();
      await env.DB.prepare(
        "INSERT INTO audit_logs (id, admin_user_id, action, target_type, target_id) VALUES (?, ?, 'admin_editor_created', 'admin', ?)"
      ).bind(crypto.randomUUID(), admin.id, id).run();
      return json({ ok: true, user: { id, email, role: "editor" } }, 201);
    } catch {
      return json({ error: "admin_user_create_unavailable" }, 503);
    }
  }

  if (url.pathname === "/api/admin/users/disable" && request.method === "POST") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    const admin = await currentAdmin(request, env);
    if (!admin) return json({ error: "unauthorized" }, 401);
    if (admin.role !== "owner") return json({ error: "forbidden" }, 403);
    const body = await readAdminJson(request);
    const id = cleanText(body?.id, 80);
    if (!id || id === admin.id) return json({ error: "invalid_target" }, 400);
    try {
      const target = await env.DB.prepare("SELECT id, role FROM admin_users WHERE id = ?").bind(id).first<{ id: string; role: string }>();
      if (!target) return json({ error: "admin_user_not_found" }, 404);
      if (target.role !== "editor") return json({ error: "owner_cannot_be_disabled" }, 403);
      await env.DB.prepare("UPDATE admin_users SET is_active = 0 WHERE id = ?").bind(id).run();
      await env.DB.prepare("DELETE FROM admin_sessions WHERE admin_user_id = ?").bind(id).run();
      await env.DB.prepare(
        "INSERT INTO audit_logs (id, admin_user_id, action, target_type, target_id) VALUES (?, ?, 'admin_editor_disabled', 'admin', ?)"
      ).bind(crypto.randomUUID(), admin.id, id).run();
      return json({ ok: true, id, is_active: false });
    } catch {
      return json({ error: "admin_user_disable_unavailable" }, 503);
    }
  }

  if (url.pathname === "/api/admin/system-status" && request.method === "GET") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    if (!await currentAdmin(request, env)) return json({ error: "unauthorized" }, 401);
    try {
      const tableRows = await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '_cf_%'"
      ).all<{ name: string }>();
      const tables = new Set((tableRows.results ?? []).map(row => row.name));
      const enquiryInfo = await env.DB.prepare("PRAGMA table_info(enquiries)").all<{ name: string }>();
      const enquiryColumns = new Set((enquiryInfo.results ?? []).map(column => column.name));
      const projectInfo = await env.DB.prepare("PRAGMA table_info(projects)").all<{ name: string }>();
      const projectColumns = new Set((projectInfo.results ?? []).map(column => column.name));
      const categoryInfo = await env.DB.prepare("PRAGMA table_info(categories)").all<{ name: string }>();
      const categoryColumns = new Set((categoryInfo.results ?? []).map(column => column.name));
      const adminInfo = await env.DB.prepare("PRAGMA table_info(admin_users)").all<{ name: string }>();
      const adminColumns = new Set((adminInfo.results ?? []).map(column => column.name));
      const adminRoleSchemaReady = adminColumns.has("role");
      const adminCount = await env.DB.prepare("SELECT COUNT(*) AS count FROM admin_users").first<{ count: number }>();
      const setup = await env.DB.prepare("SELECT completed_at FROM admin_setup WHERE id = 1").first<{ completed_at: string | null }>();
      const contentTablesReady = tables.has("site_content") && tables.has("site_content_revisions");
      const portfolioSchemaReady =
        ["id", "slug", "category_slug", "cover_image_url", "status", "is_featured"].every(column => projectColumns.has(column)) &&
        ["id", "slug", "title_en", "title_hi"].every(column => categoryColumns.has(column));
      const enquirySchemaReady =
        ["id", "name", "email", "phone", "service", "consent", "status", "created_at", "updated_at"].every(column => enquiryColumns.has(column)) &&
        tables.has("enquiry_rate_limits");
      return json({
        status: "ok",
        databaseConfigured: true,
        adminSetupSecretConfigured: Boolean(env.ADMIN_SETUP_SECRET),
        adminSetupComplete: Boolean(setup?.completed_at) || (adminCount?.count ?? 0) > 0,
        adminRoleSchemaReady,
        adminCount: adminCount?.count ?? 0,
        enquirySchemaReady,
        portfolioSchemaReady,
        contentTablesReady,
        mediaStorageConfigured: isSupabaseStorageConfigured(env),
        blockers: [
          ...(!env.ADMIN_SETUP_SECRET ? ["ADMIN_SETUP_SECRET is not configured"] : []),
          ...(!adminRoleSchemaReady ? ["Owner/editor role migration is pending"] : []),
          ...(!enquirySchemaReady ? ["Enquiry consent/schema migration is pending"] : []),
          ...(!portfolioSchemaReady ? ["Portfolio schema is incompatible"] : []),
          ...(!contentTablesReady ? ["CMS content tables are missing"] : []),
          ...(!isSupabaseStorageConfigured(env) ? ["Supabase Storage secrets (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET) are not configured"] : []),
        ],
      });
    } catch {
      return json({ error: "system_status_unavailable" }, 503);
    }
  }

  if (url.pathname === "/api/admin/audit" && request.method === "GET") {
    if (!env.DB) return json({ error: "database_not_configured" }, 503);
    const admin = await currentAdmin(request, env);
    if (!admin) return json({ error: "unauthorized" }, 401);
    if (admin.role !== "owner") return json({ error: "forbidden" }, 403);
    try {
      const result = await env.DB.prepare(
        "SELECT a.id, a.action, a.target_type, a.target_id, a.created_at, u.email AS admin_email " +
        "FROM audit_logs a LEFT JOIN admin_users u ON u.id = a.admin_user_id " +
        "ORDER BY a.created_at DESC LIMIT 100"
      ).all();
      return json({ events: result.results ?? [] });
    } catch {
      return json({ error: "audit_log_unavailable" }, 503);
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
