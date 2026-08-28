import { NextResponse } from "next/server";

const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");

const catalog = {
  specVersion: "0.1.0",
  host: {
    name: "Nabd Plus",
    url: origin
  },
  entries: [
    {
      id: "urn:air:nabd.plus:catalog:nursing",
      displayName: "Published nursing service catalog",
      type: "application/json",
      url: `${origin}/en/nursing/catalog`,
      representativeQueries: [
        "What published nursing services are available?",
        "Show the public nursing catalog."
      ]
    },
    {
      id: "urn:air:nabd.plus:catalog:radiology",
      displayName: "Published radiology service catalog",
      type: "application/json",
      url: `${origin}/en/diagnostics/radiology`,
      representativeQueries: [
        "What radiology services are published?",
        "Find available public radiology services."
      ]
    },
    {
      id: "urn:air:nabd.plus:content:articles",
      displayName: "Published health articles",
      type: "text/html",
      url: `${origin}/en/articles`,
      representativeQueries: [
        "Find published Nabd Plus health articles.",
        "Show the public health article index."
      ]
    },
    {
      id: "urn:air:nabd.plus:documentation:public-boundaries",
      displayName: "Public content and privacy boundaries",
      type: "text/markdown",
      url: `${origin}/llms.txt`,
      representativeQueries: [
        "What public Nabd Plus content can an agent access?",
        "Which Nabd Plus data requires an authenticated patient session?"
      ]
    }
  ]
} as const;

export function GET() {
  return NextResponse.json(catalog, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
