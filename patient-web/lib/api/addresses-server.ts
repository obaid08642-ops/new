import { callPatientApi } from "./upstream";

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
  return callPatientApi("/users/me/addresses", {}, token);
}

export async function createPatientAddress(
  token: string,
  input: { label?: string; line1?: string; line2?: string; city?: string; district?: string; notes?: string },
): Promise<Response> {
  return callPatientApi("/users/me/addresses", { method: "POST", body: JSON.stringify(input), headers: { "Content-Type": "application/json" } }, token);
}

export async function removePatientAddress(token: string, addressId: string): Promise<Response> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(addressId)) throw new Error("invalid_address_id");
  return callPatientApi(`/users/me/addresses/${addressId}`, { method: "DELETE" }, token);
}
