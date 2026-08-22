import { patientApiUrl } from "@/lib/api/upstream";
import { doctorQuery } from "./doctors";

export async function getPublicDoctors(input: { search?: string; specialty?: string; sort?: "rating" | "price" | "wait" } = {}): Promise<Response | null> {
  try {
    return await fetch(patientApiUrl(doctorQuery(input)), { headers: { Accept: "application/json" }, cache: "no-store" });
  } catch { return null; }
}
