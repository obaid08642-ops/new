import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const LOCALES = ["ar", "en", "ur", "hi", "bn", "fil"] as const;
const SERVICES = ["consultation", "labs", "radiology", "nursing"];

describe("insurance coverage check: service types", () => {
  it("offers the app's four service types with the app's values", () => {
    const web = readFileSync(resolve(process.cwd(), "app/[locale]/insurance/coverage-check/page.tsx"), "utf8");
    const app = readFileSync(resolve(process.cwd(), "../patient-app/app/insurance/coverage-check.tsx"), "utf8");
    const webList = web.match(/const SERVICES = \[([^\]]+)\] as const/)?.[1].match(/"[a-z]+"/g)?.map((x) => x.slice(1, -1));
    const appList = app.match(/const SERVICE_TYPES = \[([^\]]+)\] as const/)?.[1].match(/'[a-z]+'/g)?.map((x) => x.slice(1, -1));
    expect(webList).toEqual(SERVICES);
    expect(appList).toEqual(SERVICES);
  });

  it.each(LOCALES)("%s labels every service type", (locale) => {
    const messages = JSON.parse(readFileSync(resolve(process.cwd(), `messages/${locale}.json`), "utf8"));
    for (const service of SERVICES) {
      expect(String(messages.InsuranceWeb.coverage.svc[service] ?? "").trim(), `${locale} ${service}`).not.toBe("");
    }
  });
});
