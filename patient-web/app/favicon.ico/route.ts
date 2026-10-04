import { NextResponse } from "next/server";

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="n" x1="8" y1="6" x2="58" y2="60" gradientUnits="userSpaceOnUse"><stop stop-color="#13a8bd"/><stop offset="1" stop-color="#078494"/></linearGradient></defs><rect width="64" height="64" rx="18" fill="url(#n)"/><path d="M13 34h10l4-13 7 25 5-17 3 5h9" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="5"/></svg>`;

export function GET() {
  return new NextResponse(faviconSvg, {
    headers: {
      "Cache-Control": "public, max-age=86400, immutable",
      "Content-Type": "image/svg+xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
