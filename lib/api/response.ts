import { NextResponse } from "next/server";
export async function forwardApiResponse(upstream: Response) { const contentType = upstream.headers.get("content-type") || "application/json"; const body = await upstream.arrayBuffer(); return new NextResponse(body, { status: upstream.status, headers: { "content-type": contentType, "cache-control": "no-store" } }); }
