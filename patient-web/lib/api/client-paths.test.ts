// Every browser call to /api/patient/<path> in the web source must be reachable: either a dedicated
// route under app/api/patient/<path>/route.ts or a path the BFF allowlist forwards. A path that is
// neither answers 404 in production (found 2026-10-04: pharmacy broadcast submit, lab opt-in-cash).
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { isAllowedPatientApiPath, isAllowedPatientApiRequest, isAllowedPatientApiTarget } from "./patient-allowlist";

const ROOT = join(__dirname, "..", "..");
const SAMPLE_ID = "91047ef2-ad36-422a-a184-629693e7c729";

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".next", "tests", "__tests__"].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, out);
    else if (/\.(tsx?|jsx?)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

function dedicatedRoute(path: string): boolean {
  // app/api/patient/a/b/route.ts, allowing [param] segments
  let dirs = [join(ROOT, "app", "api", "patient")];
  for (const seg of path.split("/").filter(Boolean)) {
    const next: string[] = [];
    for (const d of dirs) {
      if (!existsSync(d)) continue;
      if (existsSync(join(d, seg))) next.push(join(d, seg));
      for (const n of readdirSync(d)) if (/^\[[^.\]]+\]$/.test(n)) next.push(join(d, n));
    }
    dirs = next;
  }
  return dirs.some((d) => existsSync(join(d, "route.ts")));
}

describe("web client calls to /api/patient are served", () => {
  const calls: { file: string; path: string; search: string }[] = [];
  for (const f of sourceFiles(ROOT)) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/[`"']\/api\/patient(\/[^`"'\s]*)/g)) {
      const [rawPath, rawQuery = ""] = m[1].split("?");
      // A ${...} that is not a whole path segment (e.g. `${threadId}${path}`, `/insurance/${intent}/`)
      // builds the path at run time; those calls are covered by their own allowlist tests.
      if (/\$\{[^}]+\}(?!\/|$)|[^/]\$\{/.test(rawPath) || /\/\$\{(?!encodeURIComponent\((orderId|id|threadId|bookingId|itemId|nextId|tid|ref)\b)/.test(rawPath)) continue;
      const path = rawPath.replace(/\$\{[^}]+\}/g, SAMPLE_ID).replace(/\/$/, "");
      const search = rawQuery ? "?" + rawQuery.replace(/\$\{[^}]+\}/g, rawQuery.includes("order_id") ? SAMPLE_ID : "abc") : "";
      if (path === "") continue;
      calls.push({ file: relative(ROOT, f), path, search });
    }
  }

  it("finds client calls to check", () => {
    expect(calls.length).toBeGreaterThan(10);
  });

  it("every call has a dedicated route or is forwarded by the allowlist", () => {
    const forwarded = (p: string) => isAllowedPatientApiPath(p) || ["GET", "POST", "PATCH", "PUT", "DELETE"].some((m) => isAllowedPatientApiRequest(p, m));
    const broken = calls.filter((c) => !dedicatedRoute(c.path) && !(c.search ? ["GET", "POST"].some((m) => isAllowedPatientApiTarget(c.path, c.search, m)) : forwarded(c.path)));
    expect(broken).toEqual([]);
  });
});
