import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

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
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const query = `date=${encodeURIComponent(parsed.data.date)}&service_type=${parsed.data.service_type}`;
  const upstream = await callPatientApi(`/care/doctors/${encodeURIComponent(doctorId)}/slots?${query}`, {}, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json({ message: "slots_unavailable" }, { status: upstream.status });
  const result = slotsSchema.safeParse(data);
  if (!result.success) return NextResponse.json({ message: "unexpected_slots_response" }, { status: 502 });
  return NextResponse.json(result.data, { headers: { "cache-control": "no-store" } });
}
