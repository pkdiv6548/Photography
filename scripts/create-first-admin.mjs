const siteUrl = process.env.SITE_URL;
const setupSecret = process.env.ADMIN_SETUP_SECRET;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!siteUrl || !setupSecret || !email || !password) {
  console.error("Set SITE_URL, ADMIN_SETUP_SECRET, ADMIN_EMAIL and ADMIN_PASSWORD in your trusted shell environment.");
  process.exit(2);
}

let target;
try {
  target = new URL(siteUrl);
} catch {
  console.error("SITE_URL must be a valid HTTPS URL.");
  process.exit(2);
}
if (target.protocol !== "https:" || target.username || target.password || target.search || target.hash) {
  console.error("SITE_URL must use HTTPS and must not contain credentials, query parameters or fragments.");
  process.exit(2);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 14 || password.length > 128) {
  console.error("ADMIN_EMAIL must be valid and ADMIN_PASSWORD must be 14–128 characters.");
  process.exit(2);
}

const endpoint = new URL("/api/admin/setup", target.origin);
let response;
try {
  response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-setup-secret": setupSecret,
    },
    body: JSON.stringify({ email, password }),
  });
} catch {
  console.error("Could not reach the setup endpoint. Verify SITE_URL and that the Worker API bridge is deployed.");
  process.exit(1);
}

let result = {};
try {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.toLowerCase().includes("application/json")) result = await response.json();
} catch {
  // Do not print raw responses, request headers or secrets.
}

if (!response.ok || result.ok !== true) {
  console.error(`Owner setup failed (HTTP ${response.status}). Check the API bridge, D1 migration, setup secret and whether initial setup is already complete.`);
  process.exit(1);
}

console.log("Owner account created successfully.");
console.log("Next: sign in at /login, verify /api/admin/session, then remove ADMIN_SETUP_SECRET from the Pages environment after confirming setup is complete.");
