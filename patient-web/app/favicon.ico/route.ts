import { NextResponse } from "next/server";

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><path d="M40 104 C40 196 200 196 200 104" fill="none" stroke="#FF4B55" stroke-width="36" stroke-linecap="round"/><circle cx="120" cy="58" r="24" fill="#FF4B55"/></svg>`; // the owner-approved Noon Dot (same as app/icon.svg)

export function GET() {
  return new NextResponse(faviconSvg, {
    headers: {
      "Cache-Control": "public, max-age=86400, immutable",
      "Content-Type": "image/svg+xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
