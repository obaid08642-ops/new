import { NextResponse } from "next/server";

export const revalidate = 86400;

export function GET() {
  const key = process.env.INDEXNOW_KEY || "nabdplusindexnowkey";
  return new NextResponse(key, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
