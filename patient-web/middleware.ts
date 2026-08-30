import { NextRequest, NextResponse } from "next/server";

const API_BASE = (process.env.NABD_API_BASE_URL || "https://api.nabd.plus/api/v1").replace(/\/$/, "");
const LEGACY_MEDICINE = /^\/(ar|en|ur|hi|bn|fil)\/medicines\/([A-Za-z0-9_-]{1,64})\/?$/;

/**
 * True 308 redirects for legacy catalogue URLs so search engines transfer
 * ranking to the canonical v14 product pages /{lang}/p/{slug}.
 * Only the legacy medicine path enters the middleware; everything else passes.
 */
export async function middleware(req: NextRequest) {
  const match = LEGACY_MEDICINE.exec(req.nextUrl.pathname);
  if (!match) return NextResponse.next();
  const [, locale, id] = match;
  try {
    const res = await fetch(`${API_BASE}/public/product-by-id/${locale}/${encodeURIComponent(id)}`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (typeof data?.slug === "string" && data.slug) {
        const target = req.nextUrl.clone();
        target.pathname = `/${locale}/p/${encodeURIComponent(data.slug)}`;
        target.search = "";
        return NextResponse.redirect(target, 308);
      }
    }
  } catch {
    // fall through to the page, which renders its own redirect/notFound
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/ar/medicines/:id*", "/en/medicines/:id*", "/ur/medicines/:id*", "/hi/medicines/:id*", "/bn/medicines/:id*", "/fil/medicines/:id*"],
};
