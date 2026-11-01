import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as aasaRoute } from "@/app/.well-known/apple-app-site-association/route";
import { GET as assetlinksRoute } from "@/app/.well-known/assetlinks.json/route";

/**
 * The two app-link files come from the routes only, with the owner's values from the environment: there is no static copy that
 * could shadow them (nginx used to answer before Next from deploy/nginx/well-known), no default Team ID and no sample fingerprint.
 * Without a value the file is not served (503, never cached). docs/deeplinks/APP_LINKS.md names the variables.
 */
const ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");
const json = (p: string) => JSON.parse(read(p));

const KEYS = ["APPLE_TEAM_ID", "APPLE_BUNDLE_ID", "APPLE_PROVIDER_BUNDLE_ID", "ANDROID_PACKAGE_NAME", "ANDROID_PROVIDER_PACKAGE_NAME", "ANDROID_SHA256_FINGERPRINT"];
const saved = { ...process.env };
beforeEach(() => { for (const k of KEYS) delete process.env[k]; });
afterEach(() => { process.env = { ...saved }; });

const TEAM = "ABCDE12345";
const FP = Array.from({ length: 32 }, (_, i) => (i * 7 + 3).toString(16).padStart(2, "0").toUpperCase()).join(":");
const SAMPLE = "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C";

describe("no static copy shadows the routes", () => {
  it("the nginx well-known directory holds no app-link file and no server block aliases one", () => {
    expect(existsSync(resolve(ROOT, "deploy/nginx/well-known/apple-app-site-association"))).toBe(false);
    expect(existsSync(resolve(ROOT, "deploy/nginx/well-known/assetlinks.json"))).toBe(false);
    for (const conf of ["deploy/nginx/conf.d/nabd-web.conf", "deploy/nginx/conf.d/nabd.plus.conf"]) {
      expect(read(conf)).not.toMatch(/well-known\/(assetlinks\.json|apple-app-site-association)/);
    }
  });

  it("the production example carries no Team ID and no fingerprint, only the names to fill", () => {
    const env = read("deploy/.env.production.example");
    expect(/^APPLE_TEAM_ID=$/m.test(env)).toBe(true);
    expect(/^ANDROID_SHA256_FINGERPRINT=$/m.test(env)).toBe(true);
    expect(env).not.toContain(SAMPLE);
  });
});

describe("apple-app-site-association", () => {
  it("is not served without a Team ID, or with a malformed one", async () => {
    for (const bad of [undefined, "", "6at2w85dbc", "SHORT", "TOO-LONG-ID-1234"]) {
      if (bad === undefined) delete process.env.APPLE_TEAM_ID; else process.env.APPLE_TEAM_ID = bad;
      const res = await aasaRoute();
      expect(res.status).toBe(503);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(JSON.stringify(await res.json())).not.toContain("applinks");
    }
  });

  it("names the apps by the env Team ID + their real bundle ids", async () => {
    process.env.APPLE_TEAM_ID = TEAM;
    const res = await aasaRoute();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    const patient = json("patient-app/app.json").expo.ios.bundleIdentifier;
    const provider = json("provider-app/app.json").expo.ios.bundleIdentifier;
    expect(patient).toBe("com.patient.nabd");
    const ids = body.applinks.details.map((d: { appID: string }) => d.appID);
    expect(ids).toEqual([`${TEAM}.${patient}`, `${TEAM}.${provider}`]);
    expect(body.webcredentials.apps).toEqual(ids);
  });

  it("claims, for the patient app, every public path under all six locales", async () => {
    process.env.APPLE_TEAM_ID = TEAM;
    const paths: string[] = (await (await aasaRoute()).json()).applinks.details[0].paths;
    for (const locale of ["ar", "en", "ur", "hi", "bn", "fil"]) {
      for (const p of ["diagnostics/*", "home-care/*", "map", "orders/*", "chat/*", "p/*", "labs/*", "home-nursing/*"]) expect(paths).toContain(`/${locale}/${p}`);
    }
  });

  it("gives the provider app only its own links", async () => {
    process.env.APPLE_TEAM_ID = TEAM;
    const detail = (await (await aasaRoute()).json()).applinks.details[1];
    expect(detail.paths.filter((p: string) => !p.startsWith("NOT "))).toEqual(["/provider/*", ...["ar", "en", "ur", "hi", "bn", "fil"].map((l) => `/${l}/provider/*`)]);
  });
});

describe("assetlinks.json", () => {
  it("is not served without a fingerprint, with Google's documentation sample, or with a malformed one", async () => {
    for (const bad of [undefined, "", SAMPLE, "AA:BB", `${FP},not-a-fingerprint`, FP.slice(0, -3)]) {
      if (bad === undefined) delete process.env.ANDROID_SHA256_FINGERPRINT; else process.env.ANDROID_SHA256_FINGERPRINT = bad;
      const res = await assetlinksRoute();
      expect(res.status).toBe(503);
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("lists the apps' real packages with the env fingerprints (comma-separated allowed, case-insensitive)", async () => {
    process.env.ANDROID_SHA256_FINGERPRINT = `${FP.toLowerCase()}, ${FP}`;
    const res = await assetlinksRoute();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body.map((e: { target: { package_name: string } }) => e.target.package_name)).toEqual([json("patient-app/app.json").expo.android.package, json("provider-app/app.json").expo.android.package]);
    for (const e of body) expect(e.target.sha256_cert_fingerprints).toEqual([FP, FP]);
  });
});
