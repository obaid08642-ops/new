import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const LOCALES = ["ar", "en", "ur", "hi", "bn", "tl"];
const SRC_DIRS = ["app", "src"];

// Owner rule (2026-10-30): no user-visible text about content or medical data "needing review".
const DENY: Record<string, string[]> = {
  en: ["needs review", "need review", "pending review", "medical review", "clinical review", "needs clinical review"],
  ar: ["مراجعة طبية", "مراجعة سريرية", "تحتاج مراجعة", "يحتاج مراجعة", "قيد المراجعة الطبية", "بانتظار المراجعة الطبية"],
  ur: ["طبی نظرثانی", "کلینیکل نظرثانی", "نظرثانی درکار", "جائزے کی ضرورت"],
  hi: ["चिकित्सा समीक्षा", "क्लिनिकल समीक्षा", "समीक्षा की आवश्यकता", "समीक्षा आवश्यक"],
  bn: ["চিকিৎসা পর্যালোচনা", "ক্লিনিক্যাল পর্যালোচনা", "পর্যালোচনা প্রয়োজন"],
  fil: ["medical review", "klinikal na pagsusuri", "kailangan ng review", "kailangan ng repaso"],
  tl: ["medical review", "klinikal na pagsusuri", "kailangan ng review", "kailangan ng repaso"],
};
// Explicit key names that may match a phrase because they describe a user's ORDER / request. Empty today: no kept key matches.
const ALLOW_KEYS = new Set<string>([]);

const FIELDS = /needs_clinical_review|medical_review_status|reviewed_by/;
// API types, DTO/schema/zod files and request-building code may name the fields.
const PATH_ALLOW = /(\/api\/|\/types?\/|types?\.ts$|schema|zod|dto|\.d\.ts$|__tests__|\/tests?\/|service-pages\.ts$)/i;

function flatten(o: unknown, prefix = "", out: [string, string][] = []): [string, string][] {
  if (typeof o === "string") out.push([prefix, o]);
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}
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

const LOCALE_DIR = "src/i18n/locales";
describe("no review-status text in locale files", () => {
  for (const loc of LOCALES) {
    it(`${loc}: no value contains a deny-listed phrase`, () => {
      const data = JSON.parse(fs.readFileSync(path.join(ROOT, LOCALE_DIR, `${loc}.json`), "utf8"));
      const hits: string[] = [];
      for (const [key, value] of flatten(data)) {
        if (ALLOW_KEYS.has(key)) continue;
        const v = value.toLowerCase();
        for (const phrase of [...DENY.en, ...(DENY[loc] ?? [])]) if (v.includes(phrase.toLowerCase())) hits.push(`${key}: ${phrase}`);
      }
      expect(hits).toEqual([]);
    });
  }
});

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

