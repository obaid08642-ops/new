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
      id: "urn:air:nabd.plus:catalog:products",
      displayName: "Real-time AI product catalog and availability feed",
      type: "application/json",
      url: `${origin}/api/v1/public/ai-catalog/products`,
      representativeQueries: [
        "What medicines and OTC products are available?",
        "Find product prices and active ingredients."
      ]
    },
    {
      id: "urn:air:nabd.plus:catalog:services",
      displayName: "Real-time AI healthcare services and doctor feed",
      type: "application/json",
      url: `${origin}/api/v1/public/ai-catalog/services`,
      representativeQueries: [
        "Find verified doctors, clinics, and hospital networks in Saudi Arabia.",
        "Check doctor consultation fees and insurance acceptance."
      ]
    },
    {
      id: "urn:air:nabd.plus:commerce:checkout-session",
      displayName: "AI Agent Checkout Session Hand-off API",
      type: "application/json",
      url: `${origin}/api/v1/public/ai-commerce/checkout-session`,
      representativeQueries: [
        "Create a secure checkout session for patient order.",
        "Hand off prepared medical cart to patient for final payment."
      ]
    },
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
