const API_BASE_URL = (
  process.env.NABD_API_BASE_URL ||
  process.env.INTERNAL_API_BASE_URL ||
  process.env.BACKEND_INTERNAL_URL ||
  (process.env.NODE_ENV === "production" ? "http://nabdah-backend:8002/api/v1" : "http://localhost:8002/api/v1")
).replace(/\/$/, "");

export function patientApiUrl(path: string) {
  if (!path.startsWith("/") || path.includes("..")) throw new Error("invalid_patient_api_path");
  return `${API_BASE_URL}${path}`;
}

export async function callPatientApi(path: string, init: RequestInit = {}, accessToken?: string | null) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  try {
    return await fetch(patientApiUrl(path), { ...init, headers, cache: "no-store" });
  } catch {
    return new Response(null, { status: 503, statusText: "upstream_unavailable" });
  }
}
