import { patientApiUrl } from "@/lib/api/upstream";
import { doctorQuery, doctorSlotsQuery } from "./doctors";

export async function getPublicDoctors(input: { search?: string; specialty?: string; sort?: "rating" | "price" | "wait" } = {}): Promise<Response | null> {
  try { return await fetch(patientApiUrl(doctorQuery(input)), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }
}

export async function getPublicDoctor(doctorId: string): Promise<Response | null> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(doctorId)) throw new Error("invalid_doctor_id");
  try { return await fetch(patientApiUrl(`/care/doctors/${doctorId}`), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }
}

export async function getPublicDoctorSlots(input: { id: string; date: string; serviceType: "clinic" | "video" | "home" }): Promise<Response | null> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(input.id) || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(input.date)) throw new Error("invalid_slots_query");
  try { return await fetch(patientApiUrl(doctorSlotsQuery(input)), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }
}
