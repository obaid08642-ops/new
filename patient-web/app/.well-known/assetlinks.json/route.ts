import { NextResponse } from "next/server";

export async function GET() {
  const packageName = process.env.ANDROID_PACKAGE_NAME || "com.patient.nabd";
  const providerPackage = process.env.ANDROID_PROVIDER_PACKAGE_NAME || "com.nabd.provider";
  // F35: only the real signing-key fingerprint(s) from the environment. Never a sample value:
  // Android would cache a failed verification and open every link in the browser.
  const fingerprints = (process.env.ANDROID_SHA256_FINGERPRINT || "")
    .split(",").map((f) => f.trim()).filter(Boolean);
  if (!fingerprints.length) {
    return NextResponse.json({ error: "assetlinks_not_configured" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const assetLinks = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: providerPackage,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];

  return NextResponse.json(assetLinks, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
