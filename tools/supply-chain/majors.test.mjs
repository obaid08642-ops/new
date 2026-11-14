import test from "node:test";
import assert from "node:assert/strict";
import { majorOf, isMajorBehind, lockVersions, pnpmVersions, majorsFor, markdown } from "./majors.mjs";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("majorOf and isMajorBehind read the first number and ignore ranges and prefixes", () => {
  assert.equal(majorOf("^4.17.21"), 4);
  assert.equal(majorOf("16.3.8"), 16);
  assert.equal(isMajorBehind("3.6.7", "4.0.0"), true);
  assert.equal(isMajorBehind("4.9.9", "4.10.0"), false);
  assert.equal(isMajorBehind("5.0.0", "4.0.0"), false);
  assert.equal(isMajorBehind(undefined, "4.0.0"), false);
});

test("lockVersions returns only direct dependencies that are in the lockfile", () => {
  const lock = { packages: { "node_modules/a": { version: "1.2.3" }, "node_modules/b": { version: "2.0.0" }, "node_modules/transitive": { version: "9.9.9" } } };
  assert.deepEqual(lockVersions(lock, { dependencies: { a: "^1" }, devDependencies: { b: "^2", missing: "^1" } }), { a: "1.2.3", b: "2.0.0" });
});

test("pnpmVersions reads the root importer, with scoped names and peer suffixes", () => {
  const text = [
    "lockfileVersion: '9.0'", "", "importers:", "", "  .:", "    dependencies:", "      next:", "        specifier: ^16.3.8", "        version: 16.3.8(react@19.1.0)",
    "      '@sentry/nextjs':", "        specifier: ^10.75.2", "        version: 10.75.2(next@16.3.8)", "    devDependencies:", "      typescript:", "        specifier: ^5", "        version: 5.9.3",
    "  other:", "    dependencies:", "      left-pad:", "        specifier: 1", "        version: 1.0.0", "", "packages:", "  next@16.3.8:", "    resolution: {}",
  ].join("\n");
  assert.deepEqual(pnpmVersions(text), { next: "16.3.8", "@sentry/nextjs": "10.75.2", typescript: "5.9.3" });
});

test("majorsFor lists only the packages whose registry latest is a new major, and counts the ones it could not resolve", async () => {
  const root = mkdtempSync(join(tmpdir(), "majors-"));
  mkdirSync(join(root, "app"));
  writeFileSync(join(root, "app", "package.json"), JSON.stringify({ dependencies: { up: "^1", same: "^2", gone: "^1" }, devDependencies: { tool: "^3" } }));
  writeFileSync(join(root, "app", "package-lock.json"), JSON.stringify({ packages: { "node_modules/up": { version: "1.0.0" }, "node_modules/same": { version: "2.1.0" }, "node_modules/gone": { version: "1.0.0" }, "node_modules/tool": { version: "3.0.0" } } }));
  const latest = { up: "2.0.0", same: "2.5.0", tool: "4.0.0" };
  const fakeFetch = async (url) => {
    const name = decodeURIComponent(url.split("registry.npmjs.org/")[1].replace("/latest", ""));
    return latest[name] ? { ok: true, json: async () => ({ version: latest[name] }) } : { ok: false, status: 404 };
  };
  const r = await majorsFor("app", { fetchImpl: fakeFetch, root });
  assert.deepEqual(r.majors.map((m) => [m.name, m.current, m.latest, m.dev]), [["tool", "3.0.0", "4.0.0", true], ["up", "1.0.0", "2.0.0", false]]);
  assert.equal(r.unresolved, 1);
  assert.match(markdown([r]), /\| up \| 1\.0\.0 \| 2\.0\.0 \| runtime \|/);
});
