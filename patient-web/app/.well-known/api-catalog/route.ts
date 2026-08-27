import { NextResponse } from "next/server";

const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");
const apiOrigin = "https://api.nabd.plus/api/v1";

const catalog = {
  linkset: [
    {
      anchor: `${origin}/.well-known/api-catalog`,
      item: [
        {
          href: `${apiOrigin}/nursing/catalog`,
          rel: ["item"],
          title: "Published nursing catalog",
          type: "application/json",
          "service-desc": [{ href: `${origin}/.well-known/openapi.json`, type: "application/vnd.oai.openapi+json" }],
          "service-doc": [{ href: `${origin}/llms.txt`, type: "text/plain" }],
          status: [{ href: `${apiOrigin}/health/liveness`, type: "application/json" }]
        },
        {
          href: `${apiOrigin}/radiology/services`,
          rel: ["item"],
          title: "Published radiology services",
          type: "application/json",
          "service-desc": [{ href: `${origin}/.well-known/openapi.json`, type: "application/vnd.oai.openapi+json" }],
          "service-doc": [{ href: `${origin}/llms.txt`, type: "text/plain" }],
          status: [{ href: `${apiOrigin}/health/liveness`, type: "application/json" }]
        }
      ],
      "api-catalog": [{ href: `${origin}/.well-known/api-catalog` }]
    }
  ]
} as const;

export function GET() {
  return NextResponse.json(catalog, {
    headers: {
      "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
      "Content-Type": "application/linkset+json; profile=\"https://www.rfc-editor.org/info/rfc9727\"",
      "Link": `<${origin}/.well-known/api-catalog>; rel=\"api-catalog\"`,
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
      "Link": `<${origin}/.well-known/api-catalog>; rel=\"api-catalog\"`,
      "X-Content-Type-Options": "nosniff"
    }
  });
}
