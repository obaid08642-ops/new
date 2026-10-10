import { NextResponse } from "next/server";
import { callPatientApi } from "@/lib/api/upstream";
import { cartSpecialty, rxLineIds, specialtySlugOf } from "@/lib/pharmacy/rx-consult";

/**
 * The specialty "Consult a doctor" opens for the prescription medicines of a cart. The cart lives in the browser and may belong
 * to a guest, and the backend answer (GET /medicines/:id/consult-specialty) is public, so this proxy needs no session. It takes
 * medicine ids only and answers `{ specialty: slug | null }`: null when the admin mapped none, when the lines disagree or when a
 * read failed (the cart then offers the full specialty list).
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = rxLineIds(raw.split(",").map((id) => ({ id: id.trim(), rx: true })));
  if (ids.length === 0) return NextResponse.json({ specialty: null }, { headers: { "cache-control": "no-store" } });
  const slugs = await Promise.all(
    ids.map(async (id) => {
      const upstream = await callPatientApi(`/medicines/${encodeURIComponent(id)}/consult-specialty`);
      if (!upstream.ok) return null;
      return specialtySlugOf(await upstream.json().catch(() => null));
    }),
  );
  return NextResponse.json({ specialty: cartSpecialty(slugs) }, { headers: { "cache-control": "no-store" } });
}
