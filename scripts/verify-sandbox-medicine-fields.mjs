const baseUrl = process.env.NABD_API_BASE_URL;
if (!baseUrl) throw new Error("Medicine catalog verification requires NABD_API_BASE_URL");

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function firstItem(payload) {
  if (Array.isArray(payload)) return payload[0];
  const root = asRecord(payload);
  const candidates = [root?.data, root?.items, root?.results];
  for (const candidate of candidates) if (Array.isArray(candidate)) return candidate[0];
  return undefined;
}

const response = await fetch(`${baseUrl}/medicines?limit=1`, { signal: AbortSignal.timeout(12_000) });
if (!response.ok) throw new Error(`Medicine catalog returned ${response.status}`);
const item = asRecord(firstItem(await response.json()));
const keys = item ? Object.keys(item).sort() : [];
console.log(`medicine catalog: ${keys.length} field name(s); ${keys.length ? `keys=${keys.join(",")}` : "empty result"}`);
