import { patientApiUrl } from "./upstream";

async function authHeaders(token: string, json = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

export type PatientAddress = {
  id: string;
  label?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  district?: string | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean | null;
};

export async function getPatientAddresses(token: string): Promise<Response> {
  try {
    return await fetch(patientApiUrl("/users/me/addresses"), {
      headers: await authHeaders(token),
      cache: "no-store",
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}

export async function createPatientAddress(
  token: string,
  input: { label?: string; line1?: string; line2?: string; city?: string; district?: string; notes?: string },
): Promise<Response> {
  try {
    return await fetch(patientApiUrl("/users/me/addresses"), {
      method: "POST",
      headers: await authHeaders(token),
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}

export async function removePatientAddress(token: string, addressId: string): Promise<Response> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(addressId)) throw new Error("invalid_address_id");
  try {
    return await fetch(patientApiUrl(`/users/me/addresses/${addressId}`), {
      method: "DELETE",
      headers: await authHeaders(token),
      cache: "no-store",
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
