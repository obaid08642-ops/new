#!/usr/bin/env node
// R20: which direct dependencies of each app are a MAJOR version behind the registry.
//   node tools/supply-chain/majors.mjs                 markdown table for every app (needs network: registry.npmjs.org)
//   node tools/supply-chain/majors.mjs --json          the same as JSON
//   node tools/supply-chain/majors.mjs backend admin   only these apps
// "current" is what the lockfile resolves today (package-lock.json, or the importer entry of pnpm-lock.yaml), "latest" is the `latest` dist-tag.
// Read-only: it opens no PR and changes no file. The weekly workflow (.github/workflows/dependency-window.yml) runs it and keeps the output.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const APPS = ["backend", "admin", "patient-web", "patient-app", "provider-app"];
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const majorOf = (v) => { const m = /(\d+)/.exec(String(v ?? "")); return m ? Number(m[1]) : NaN; };
export const isMajorBehind = (current, latest) => Number.isFinite(majorOf(current)) && Number.isFinite(majorOf(latest)) && majorOf(latest) > majorOf(current);

/** name -> resolved version from a package-lock.json (v2/v3) object, for the direct dependencies listed in pkg. */
export function lockVersions(lock, pkg) {
  const out = {};
  const direct = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  for (const name of Object.keys(direct)) {
    const e = lock.packages?.[`node_modules/${name}`];
    if (e?.version) out[name] = e.version;
  }
  return out;
}

/** name -> resolved version from the root importer of a pnpm-lock.yaml text (lockfileVersion 6+ and 9). */
export function pnpmVersions(text) {
  const out = {};
  const lines = text.split("\n");
  let i = lines.findIndex((l) => /^importers:/.test(l));
  if (i < 0) return out;
  i = lines.findIndex((l, n) => n > i && /^ {2}\.:/.test(l));
  if (i < 0) return out;
  let name = null;
  for (let n = i + 1; n < lines.length; n++) {
    const l = lines[n];
    if (/^ {2}\S/.test(l) || /^\S/.test(l)) break; // next importer or next top-level key
    const m = /^ {6}'?([^':]+)'?:\s*$/.exec(l);
    if (m) { name = m[1]; continue; }
    const v = /^ {8}version:\s*([^\s(]+)/.exec(l);
    if (v && name) { out[name] = v[1]; name = null; }
  }
  return out;
}

export async function latestVersion(name, fetchImpl = fetch) {
  const r = await fetchImpl(`https://registry.npmjs.org/${name.replaceAll("/", "%2F")}/latest`, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
  return (await r.json()).version;
}

async function pool(items, size, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < items.length) { const i = next++; results[i] = await fn(items[i]); }
  }));
  return results;
}

export async function majorsFor(app, { fetchImpl = fetch, root = ROOT } = {}) {
  const pkg = JSON.parse(readFileSync(join(root, app, "package.json"), "utf8"));
  let current = {};
  if (existsSync(join(root, app, "package-lock.json"))) current = lockVersions(JSON.parse(readFileSync(join(root, app, "package-lock.json"), "utf8")), pkg);
  else if (existsSync(join(root, app, "pnpm-lock.yaml"))) current = pnpmVersions(readFileSync(join(root, app, "pnpm-lock.yaml"), "utf8"));
  const names = Object.keys(current);
  const latest = await pool(names, 8, async (n) => { try { return await latestVersion(n, fetchImpl); } catch { return null; } });
  const rows = [];
  names.forEach((n, i) => {
    if (latest[i] && isMajorBehind(current[n], latest[i])) rows.push({ name: n, current: current[n], latest: latest[i], dev: !!pkg.devDependencies?.[n] });
  });
  return { app, direct: names.length, unresolved: latest.filter((x) => x === null).length, majors: rows.sort((a, b) => a.name.localeCompare(b.name)) };
}

export function markdown(reports) {
  const out = ["# Pending major upgrades (direct dependencies)", ""];
  for (const r of reports) {
    out.push(`## ${r.app}: ${r.majors.length} major(s) behind of ${r.direct} direct dependencies${r.unresolved ? ` (${r.unresolved} not resolvable from the registry)` : ""}`, "");
    if (!r.majors.length) { out.push("none", ""); continue; }
    out.push("| package | current | latest | kind |", "|---|---|---|---|");
    for (const m of r.majors) out.push(`| ${m.name} | ${m.current} | ${m.latest} | ${m.dev ? "dev" : "runtime"} |`);
    out.push("");
  }
  return out.join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const apps = args.filter((a) => !a.startsWith("--"));
  const reports = [];
  for (const app of apps.length ? apps : APPS) reports.push(await majorsFor(app));
  console.log(json ? JSON.stringify(reports, null, 2) : markdown(reports));
}
