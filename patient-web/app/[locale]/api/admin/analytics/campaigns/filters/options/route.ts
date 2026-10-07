import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

export async function GET(request: Request) {
  const jar = await cookies();
  const names: string[] = Array.isArray(authCookieNames) ? (authCookieNames as unknown as string[]) : Object.values(authCookieNames as Record<string, string>);
  const token = names.map((n) => jar.get(n)?.value).find((v) => v) ?? null;
  if (!token) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  // Check if user has admin role by calling a user info endpoint
  // For now, we'll just check the token exists; backend will validate admin role
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const res = await fetch(`${backendUrl}/admin/analytics/campaigns/filters/options`, {
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