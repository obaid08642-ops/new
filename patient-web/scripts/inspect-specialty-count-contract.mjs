function findAccessToken(value) {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) return value.map(findAccessToken).find(Boolean);
  if (typeof value.accessToken === "string" && value.accessToken.length > 20) return value.accessToken;
  return Object.values(value).map(findAccessToken).find(Boolean);
}

function findFirstRecordArray(value) {
  if (Array.isArray(value)) return value.filter((entry) => entry && typeof entry === "object");
  if (!value || typeof value !== "object") return [];
  for (const key of ["items", "data", "results", "specialties"]) {
    const nested = findFirstRecordArray(value[key]);
    if (nested.length > 0) return nested;
  }
  return [];
}

const baseUrl = process.env.NABD_API_BASE_URL;
const identifier = process.env.NABD_SANDBOX_OWNER_EMAIL;
const password = process.env.NABD_SANDBOX_OWNER_PASSWORD;

if (!baseUrl || !identifier || !password) {
  throw new Error("Sandbox configuration is unavailable");
}

const login = await fetch(`${baseUrl}/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ identifier, password }),
  signal: AbortSignal.timeout(12_000),
});

if (!login.ok) throw new Error(`Sandbox login failed with ${login.status}`);

const accessToken = findAccessToken(await login.json());
if (!accessToken) throw new Error("Sandbox login returned no usable access token");

const response = await fetch(`${baseUrl}/care/specialties`, {
  headers: { authorization: `Bearer ${accessToken}` },
  signal: AbortSignal.timeout(12_000),
});

if (!response.ok) throw new Error(`Specialty discovery failed with ${response.status}`);

const records = findFirstRecordArray(await response.json());
const countLikeKeys = [...new Set(records.flatMap((record) => Object.keys(record).filter((key) => /count|provider|doctor/i.test(key))))].sort();
const numericCountLikeKeys = [...new Set(records.flatMap((record) => Object.entries(record)
  .filter(([key, value]) => /count|provider|doctor/i.test(key) && typeof value === "number")
  .map(([key]) => key)))].sort();
const numericCountSummary = Object.fromEntries(numericCountLikeKeys.map((key) => {
  const values = records.map((record) => record[key]).filter((value) => typeof value === "number");
  return [key, {
    total: values.length,
    zero: values.filter((value) => value === 0).length,
    positive: values.filter((value) => value > 0).length,
    negative: values.filter((value) => value < 0).length,
  }];
}));

console.log(JSON.stringify({
  specialtyRecordCount: records.length,
  countLikeKeys,
  numericCountLikeKeys,
  numericCountSummary,
  hasPublishedProviderCount: numericCountLikeKeys.includes("published_provider_count"),
}));
