import { medicineQuery, parseMedicineId } from "@/lib/api/medicines";
import { patientApiUrl } from "@/lib/api/upstream";

function publicMedicinePath(path: string) {
  const listPath = /^\/medicines(?:\?(?:[A-Za-z0-9%_=&-]+))?$/;
  const detailPath = /^\/medicines\/[A-Za-z0-9_-]{1,64}\/details$/;
  if (!listPath.test(path) && !detailPath.test(path)) throw new Error("invalid_public_medicine_path");
  return path;
}

/** Public catalog only: this function cannot send a patient credential or reach any private endpoint. */
export async function getPublicMedicines(search: { q?: string; page: number }): Promise<Response | null> {
  try {
    return await fetch(patientApiUrl(publicMedicinePath(medicineQuery(search))), {
      headers: { Accept: "application/json" },
      cache: "force-cache",
    });
  } catch {
    return null;
  }
}

export async function getPublicMedicine(medicineId: string): Promise<Response | null> {
  if (!parseMedicineId(medicineId).success) throw new Error("invalid_public_medicine_id");
  try {
    return await fetch(patientApiUrl(publicMedicinePath(`/medicines/${medicineId}/details`)), {
      headers: { Accept: "application/json" },
      cache: "force-cache",
    });
  } catch {
    return null;
  }
}
