const baseUrl = process.env.NABD_API_BASE_URL;
const identifier = process.env.NABD_SANDBOX_OWNER_EMAIL;
const password = process.env.NABD_SANDBOX_OWNER_PASSWORD;

if (!baseUrl || !identifier || !password) throw new Error("Family verification requires configured Sandbox environment variables");

function findAccessToken(value) {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) return value.map(findAccessToken).find(Boolean);
  if (typeof value.accessToken === "string" && value.accessToken.length > 20) return value.accessToken;
  return Object.values(value).map(findAccessToken).find(Boolean);
}

function firstRow(payload) {
  if (Array.isArray(payload)) return payload[0];
  if (!payload || typeof payload !== "object") return undefined;
  for (const value of [payload.data, payload.items, payload.results, payload.members]) if (Array.isArray(value)) return value[0];
  return undefined;
}

const login = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });
if (!login.ok) throw new Error(`Sandbox login returned ${login.status}`);
const accessToken = findAccessToken(await login.json());
if (!accessToken) throw new Error("Sandbox login response did not contain an access token");
const response = await fetch(`${baseUrl}/family/members`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });
if (!response.ok) throw new Error(`Family members returned ${response.status}`);
const row = firstRow(await response.json());
const keys = row && typeof row === "object" && !Array.isArray(row) ? Object.keys(row).sort() : [];
console.log(`family: ${keys.length ? `member_keys=${keys.join(",")}` : "empty result"}`);
