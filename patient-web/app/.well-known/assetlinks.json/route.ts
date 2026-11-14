import { NextResponse } from "next/server";

const SHA256 = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;
const DOCUMENTATION_SAMPLE = "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C";

export async function GET() {
  const packageName = process.env.ANDROID_PACKAGE_NAME || "com.patient.nabd";
  const providerPackage = process.env.ANDROID_PROVIDER_PACKAGE_NAME || "com.nabd.provider";
  // F35: only the real signing-key fingerprint(s) from the environment. Never a sample value:
  // Android would cache a failed verification and open every link in the browser.
  const fingerprints = (process.env.ANDROID_SHA256_FINGERPRINT || "")
    .split(",").map((f) => f.trim().toUpperCase()).filter(Boolean);
  // SHA-256 of a certificate: 32 colon-separated hex bytes. Google's documentation sample is refused as well (it is not any app's key).
  const valid = fingerprints.length > 0 && fingerprints.every((f) => SHA256.test(f) && f !== DOCUMENTATION_SAMPLE);
  if (!valid) {
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
