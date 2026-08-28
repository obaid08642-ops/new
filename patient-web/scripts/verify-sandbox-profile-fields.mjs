const baseUrl = process.env.NABD_API_BASE_URL;
const identifier = process.env.NABD_SANDBOX_OWNER_EMAIL;
const password = process.env.NABD_SANDBOX_OWNER_PASSWORD;

if (!baseUrl || !identifier || !password) {
  throw new Error("Sandbox profile verification requires configured environment variables");
}

function findAccessToken(value) {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) return value.map(findAccessToken).find(Boolean);
  if (typeof value.accessToken === "string" && value.accessToken.length > 20) return value.accessToken;
  return Object.values(value).map(findAccessToken).find(Boolean);
}

function primitiveFieldKeys(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const record = value.data && typeof value.data === "object" && !Array.isArray(value.data) ? value.data : value;
  return Object.entries(record)
    .filter(([, entry]) => ["string", "number", "boolean"].includes(typeof entry))
    .map(([key]) => key)
    .sort();
}

const login = await fetch(`${baseUrl}/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ identifier, password }),
  signal: AbortSignal.timeout(12_000),
});

if (!login.ok) throw new Error(`Sandbox login returned ${login.status}`);
const accessToken = findAccessToken(await login.json());
if (!accessToken) throw new Error("Sandbox login response did not contain an access token");

const paths = ["/users/me/profile", "/medical-profile", "/users/me/insurance"];
for (const path of paths) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  const fields = primitiveFieldKeys(payload);
  console.log(`${path}: ${fields.length} primitive field name(s); ${fields.length ? `keys=${fields.join(",")}` : "empty record"}`);
}
