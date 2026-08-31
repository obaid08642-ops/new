import { NextResponse } from "next/server";

const specification = {
  openapi: "3.1.0",
  info: {
    title: "Nabd Plus public catalog subset",
    version: "1.0.0",
    description: "A limited public discovery document. It is not the private patient API specification and contains no authenticated patient operations."
  },
  servers: [{ url: "https://api.nabd.plus/api/v1" }],
  paths: {
    "/nursing/catalog": {
      get: {
        operationId: "getPublicNursingCatalog",
        summary: "Read the published nursing catalog",
        responses: { "200": { description: "Published catalog response" }, "401": { description: "The deployment may require a patient session" } }
      }
    },
    "/radiology/services": {
      get: {
        operationId: "getPublishedRadiologyServices",
        summary: "Read published radiology services",
        responses: { "200": { description: "Published services response" }, "401": { description: "The deployment may require a patient session" } }
      }
    },
    "/health/liveness": {
      get: {
        operationId: "getApiLiveness",
        summary: "Read API liveness",
        responses: { "200": { description: "API is live" }, "500": { description: "API is not live" } }
      }
    }
  },
  "x-nabd-scope": "public-catalog-subset"
} as const;

const X_PAYMENT_INFO = { protocols: [], mpp: "disabled", note: "No agentic payments enabled; checkout requires human confirmation" };
export function GET() {
  return NextResponse.json(specification, {
    headers: {
      "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
      "Content-Type": "application/vnd.oai.openapi+json; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
