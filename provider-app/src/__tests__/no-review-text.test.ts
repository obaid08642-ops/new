import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../..");
const SRC_DIRS = ["src"];


const FIELDS = /needs_clinical_review|medical_review_status|reviewed_by/;
// API types, DTO/schema/zod files and request-building code may name the fields.
const PATH_ALLOW = /(\/api\/|\/types?\/|types?\.ts$|schema|zod|dto|\.d\.ts$|__tests__|\/tests?\/|service-pages\.ts$)/i;

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}


describe("no review-status text in client sources", () => {
  it("no screen mentions needs_clinical_review / medical_review_status / reviewed_by outside API/type/schema files", () => {
    const hits: string[] = [];
    for (const d of SRC_DIRS) for (const f of walk(path.join(ROOT, d))) {
      if (PATH_ALLOW.test(f.replace(ROOT, ""))) continue;
      fs.readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (FIELDS.test(l)) hits.push(`${f.replace(ROOT, "")}:${i + 1}`); });
    }
    expect(hits).toEqual([]);
  });
});

