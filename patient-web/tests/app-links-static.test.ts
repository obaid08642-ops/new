import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as aasaRoute } from "@/app/.well-known/apple-app-site-association/route";
import { GET as assetlinksRoute } from "@/app/.well-known/assetlinks.json/route";

/**
 * Production serves deploy/nginx/well-known/* (nginx answers before Next), so those files must be what the routes
 * produce from lib/app-links.ts, with the real ids: the apps' own bundle id / package (patient-app/app.json,
 * provider-app/app.json) and the Team ID / signing fingerprint from deploy/.env.production.example.
 * docs/deeplinks/APP_LINKS.md explains each piece.
 */
const ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");
const json = (p: string) => JSON.parse(read(p));
const envValue = (key: string) => new RegExp(`^${key}=(.*)$`, "m").exec(read("deploy/.env.production.example"))?.[1].trim() ?? "";

const saved = { ...process.env };
beforeEach(() => { for (const k of ["APPLE_TEAM_ID", "APPLE_BUNDLE_ID", "APPLE_PROVIDER_BUNDLE_ID", "ANDROID_PACKAGE_NAME", "ANDROID_PROVIDER_PACKAGE_NAME", "ANDROID_SHA256_FINGERPRINT"]) delete process.env[k]; });
afterEach(() => { process.env = { ...saved }; });

const SAMPLE = "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C";

describe("apple-app-site-association (the file nginx serves)", () => {
  const file = () => json("deploy/nginx/well-known/apple-app-site-association");

  it("is exactly what the route produces", async () => {
    expect(file()).toEqual(await (await aasaRoute()).json());
  });

  it("names the apps by Team ID + their real bundle ids", () => {
    const team = envValue("APPLE_TEAM_ID");
    expect(team).toMatch(/^[A-Z0-9]{10}$/);
    expect(team).toBe(envValue("APNS_TEAM_ID"));
    const patient = json("patient-app/app.json").expo.ios.bundleIdentifier;
    const provider = json("provider-app/app.json").expo.ios.bundleIdentifier;
    expect(patient).toBe("com.patient.nabd");
    const ids = file().applinks.details.map((d: { appID: string }) => d.appID);
    expect(ids).toEqual([`${team}.${patient}`, `${team}.${provider}`]);
    expect(file().webcredentials.apps).toEqual(ids);
  });

  it("claims, for the patient app, every public path under all six locales, including the sections and the order, chat and map links", () => {
    const paths: string[] = file().applinks.details[0].paths;
    for (const locale of ["ar", "en", "ur", "hi", "bn", "fil"]) {
      for (const p of ["diagnostics/*", "home-care/*", "map", "orders/*", "chat/*", "p/*", "labs/*", "home-nursing/*"]) expect(paths).toContain(`/${locale}/${p}`);
    }
    for (const p of ["/diagnostics/*", "/home-care/*", "/map", "/orders/*", "/chat/*"]) expect(paths).toContain(p);
  });

  it("gives the provider app only its own links", () => {
    expect(file().applinks.details[1].paths.filter((p: string) => !p.startsWith("NOT "))).toEqual(["/provider/*", ...["ar", "en", "ur", "hi", "bn", "fil"].map((l) => `/${l}/provider/*`)]);
  });
});

describe("assetlinks.json (the file nginx serves)", () => {
  const file = () => json("deploy/nginx/well-known/assetlinks.json");
  const fingerprints = () => envValue("ANDROID_SHA256_FINGERPRINT").split(",").map((f) => f.trim()).filter(Boolean);

  it("lists the apps' real packages, nothing else", () => {
    expect(file().map((e: { target: { package_name: string } }) => e.target.package_name)).toEqual([json("patient-app/app.json").expo.android.package, json("provider-app/app.json").expo.android.package]);
  });

  it("carries the fingerprint of the repo config (deploy/.env.production.example), in the SHA-256 format", () => {
    expect(fingerprints().length).toBeGreaterThan(0);
    for (const f of fingerprints()) expect(f).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
    for (const entry of file()) expect(entry.target.sha256_cert_fingerprints).toEqual(fingerprints());
  });

  it("is exactly what the route produces for that fingerprint", async () => {
    process.env.ANDROID_SHA256_FINGERPRINT = fingerprints().join(",");
    expect(file()).toEqual(await (await assetlinksRoute()).json());
  });

  it("while the fingerprint is Google's documentation sample, the owner action is written down (it can never be a silent gap)", () => {
    if (!fingerprints().includes(SAMPLE)) return;
    expect(read("docs/deeplinks/APP_LINKS.md")).toContain("OWNER ACTION: Android signing fingerprint");
    expect(read("deploy/.env.production.example")).toContain("OWNER ACTION");
  });
});
