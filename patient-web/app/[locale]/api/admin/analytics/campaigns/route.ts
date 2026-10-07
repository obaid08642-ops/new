import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

export async function GET(request: Request) {
  const jar = await cookies();
  const names: string[] = Array.isArray(authCookieNames) ? (authCookieNames as unknown as string[]) : Object.values(authCookieNames as Record<string, string>);
  const token = names.map((n) => jar.get(n)?.value).find((v) => v) ?? null;
  if (!token) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  const params = new URLSearchParams();
  if (searchParams.get('dateFrom')) params.set('dateFrom', searchParams.get('dateFrom')!);
  if (searchParams.get('dateTo')) params.set('dateTo', searchParams.get('dateTo')!);
  if (searchParams.get('utm_source')) params.set('utm_source', searchParams.get('utm_source')!);
  if (searchParams.get('utm_medium')) params.set('utm_medium', searchParams.get('utm_medium')!);
  if (searchParams.get('utm_campaign')) params.set('utm_campaign', searchParams.get('utm_campaign')!);

  const res = await fetch(`${backendUrl}/admin/analytics/campaigns?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}