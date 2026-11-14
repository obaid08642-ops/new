import { getSharedInvoicePdf, isShareToken } from "@/lib/api/billing-server";

export const dynamic = "force-dynamic";

/** The PDF behind a share link (GET /billing/shared/:token/pdf). Public: the link is the credential. Never cached, never indexed. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };
  if (!isShareToken(token)) return new Response(null, { status: 404, headers });
  const upstream = await getSharedInvoicePdf(token);
  if (!upstream.ok) return new Response(null, { status: upstream.status === 404 || upstream.status === 429 ? upstream.status : 502, headers });
  return new Response(upstream.body, { status: 200, headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="receipt.pdf"' } });
}
