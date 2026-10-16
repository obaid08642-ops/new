// P14.24: the app's JavaScript bundle size is tracked on every change. Exports the Android bundle (Hermes bytecode,
// what the phone loads at start) and compares it with perf/bundle-budget.json. Over the budget = fail; the budget only
// goes down (lower it when a change makes the bundle smaller).
//   node scripts/bundle-size.mjs [already-exported-dir]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const budget = JSON.parse(fs.readFileSync(path.join(root, "perf/bundle-budget.json"), "utf8"));
let dir = process.argv[2];
if (!dir) {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "nabd-bundle-"));
  execFileSync("npx", ["expo", "export", "--platform", "android", "--output-dir", dir], { cwd: root, stdio: "inherit" });
}
const jsDir = path.join(dir, "_expo/static/js/android");
const files = fs.readdirSync(jsDir).filter((f) => f.endsWith(".hbc") || f.endsWith(".js"));
const bytes = files.reduce((n, f) => n + fs.statSync(path.join(jsDir, f)).size, 0);
const gzip = files.reduce((n, f) => n + zlib.gzipSync(fs.readFileSync(path.join(jsDir, f))).length, 0);
const mb = (n) => (n / 1048576).toFixed(2);
console.log(`android bundle: ${mb(bytes)} MB (${bytes} bytes), gzip ${mb(gzip)} MB, budget ${mb(budget.android_bundle_bytes)} MB`);
if (bytes > budget.android_bundle_bytes) {
  console.error(`FAIL: the Android bundle is ${bytes - budget.android_bundle_bytes} bytes over the budget (perf/bundle-budget.json)`);
  process.exit(1);
}
