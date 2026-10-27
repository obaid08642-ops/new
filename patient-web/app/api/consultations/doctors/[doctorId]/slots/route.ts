import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicDoctorSlots } from "@/lib/api/doctors-server";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  service_type: z.enum(["clinic", "video", "home"]),
});

const slotsSchema = z.object({
  slots: z.array(z.object({
    start: z.string().datetime({ offset: true }),
    end: z.string().datetime({ offset: true }),
    label: z.string(),
    available: z.boolean(),
  })),
  reason: z.string().optional(),
});

/** Briefly shared: the same day of the same doctor is asked by many visitors; a booked slot disappears within the minute. */
const SLOTS_CACHE = "public, max-age=0, s-maxage=20, stale-while-revalidate=20";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ doctorId: string }> },
) {
  const { doctorId } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(doctorId)) {
    return NextResponse.json({ message: "invalid_doctor_id" }, { status: 400 });
  }
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    date: url.searchParams.get("date"),
    service_type: url.searchParams.get("service_type"),
  });
  if (!parsed.success) return NextResponse.json({ message: "invalid_slots_query" }, { status: 400 });
  // Free slots are public (no patient data), so a signed-out visitor sees them too: no cookie is read or sent. Booking stays signed-in.
  const upstream = await getPublicDoctorSlots({ id: doctorId, date: parsed.data.date, serviceType: parsed.data.service_type });
  if (!upstream) return NextResponse.json({ message: "slots_unavailable" }, { status: 502 });
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json({ message: "slots_unavailable" }, { status: upstream.status });
  const result = slotsSchema.safeParse(data);
  if (!result.success) return NextResponse.json({ message: "unexpected_slots_response" }, { status: 502 });
  return NextResponse.json(result.data, { headers: { "cache-control": SLOTS_CACHE } });
}
