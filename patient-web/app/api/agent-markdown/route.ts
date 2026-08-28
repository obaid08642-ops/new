import { NextRequest, NextResponse } from "next/server";

const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");
const publicMarkdown: Record<string, string> = {
  "/": `# Nabd Plus\n\nNabd Plus is a patient web portal. Public content is limited to published entry points; patient data requires an authenticated server session.\n\n- [Public articles](${origin}/en/articles)\n- [Public API catalog](${origin}/.well-known/api-catalog)\n`,
  "/en": `# Nabd Plus\n\nNabd Plus public patient portal entry point. Patient records and transactions require an authenticated server session.\n`,
  "/ar": `# نبض بلس\n\nالبوابة العامة لنبض بلس. بيانات المريض والعمليات تتطلب جلسة خادمية موثقة.\n`,
  "/en/articles": `# Nabd Plus health articles\n\nPublished articles are sourced from authorized backend content. This page does not provide patient-specific medical advice.\n`,
  "/ar/articles": `# مقالات نبض بلس الصحية\n\nالمقالات المنشورة مصدرها محتوى معتمد من الخلفية، ولا تقدم نصيحة طبية مخصصة للمريض.\n`
};

export function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path") || "/";
  const markdown = publicMarkdown[path];
  if (!markdown) {
    return new NextResponse("Markdown representation is not available for this resource.\n", {
      status: 406,
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" }
    });
  }
  return new NextResponse(markdown, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=1800",
      "Content-Type": "text/markdown; charset=utf-8",
      "Vary": "Accept",
      "X-Markdown-Tokens": "public-boundary,source-links",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
