#!/usr/bin/env python3
"""استخراج كل مسارات NestJS (method + path) من controllers + مقارنة استدعاءات الواجهات"""
import re, os, sys, json
from pathlib import Path

BACKEND = Path("/mnt/agents/output/nabd/extracted/nabdah-backend/nabdah-backend/src")

routes = []  # (method, full_path, file)
for ctrl in BACKEND.rglob("*.ts"):
    if "node_modules" in str(ctrl) or ".spec." in ctrl.name or ".test." in ctrl.name:
        continue
    if "@Controller" not in ctrl.read_text(encoding="utf-8", errors="ignore"):
        continue
    src = ctrl.read_text(encoding="utf-8", errors="ignore")
    # عدة controllers داخل نفس الملف: اربط كل route بأقرب @Controller سابق له
    ctrls = []  # (pos, [prefixes])
    for cm in re.finditer(r"@Controller\(\s*(\[[^\]]*\]|['\"`][^'\"`]*['\"`])?\s*\)", src):
        raw = cm.group(1)
        if raw is None:
            ctrls.append((cm.start(), [""]))
        elif raw.startswith("["):
            ctrls.append((cm.start(), re.findall(r"['\"`]([^'\"`]+)['\"`]", raw) or [""]))
        else:
            ctrls.append((cm.start(), [raw.strip("'\"`")]))
    if not ctrls:
        ctrls = [(0, "")]
    for mm in re.finditer(r"@(Get|Post|Put|Patch|Delete|All)\(\s*(?:['\"`]([^'\"`]*)['\"`])?\s*\)", src):
        method, sub = mm.group(1).upper(), mm.group(2) or ""
        prefixes = [""]
        for pos, pfxs in ctrls:
            if pos < mm.start():
                prefixes = pfxs
            else:
                break
        for prefix in prefixes:
            full = "/" + "/".join(p.strip("/") for p in [prefix, sub] if p.strip("/"))
            routes.append((method, full, str(ctrl.relative_to(BACKEND))))

def norm(p):
    p = re.sub(r"\$\{[^}]+\}", ":p", p)      # template literals
    p = re.sub(r":[^/]+", ":p", p)          # nest params
    p = re.sub(r"/[0-9a-f]{24}(?=/|$)", "/:p", p)  # objectids
    p = p.split("?")[0].rstrip("/") or "/"
    return p.lower()

backend_set = {}
for method, full, f in routes:
    backend_set.setdefault((method, norm(full)), []).append(f)
# All-handlers
all_paths = set()
for (method, p) in backend_set:
    all_paths.add(p)

# backend route -> regex حيث :p يطابق أي segment
backend_regexes = []
for (method, p) in backend_set:
    rx = "^" + re.escape(p).replace(re.escape(":p"), "[^/]+") + "$"
    backend_regexes.append((method, re.compile(rx)))

def check_front(name, endpoints):
    missing = []
    for raw in endpoints:
        p = raw.strip().strip("'\"`")
        if not p.startswith("/"): continue
        np = norm(p)
        hit = np in all_paths or any(rx.match(np) for _, rx in backend_regexes)
        if not hit:
            missing.append(p)
    return missing

def read_list(path):
    if not os.path.exists(path): return []
    return [l.strip() for l in open(path) if l.strip().startswith(("'", '"', "`"))]

prov = read_list("/tmp/provider_apis.txt")
miss_prov = check_front("provider", prov)
pat = read_list("/tmp/patient_apis.txt")
miss_pat = check_front("patient", pat)
adm = read_list("/tmp/admin_apis.txt")
miss_adm = check_front("admin", adm)

out = {
    "backend_routes_total": len(routes),
    "backend_unique_paths": len(all_paths),
    "provider_calls": len([p for p in prov if p.strip("'\"`").startswith("/")]),
    "provider_missing": sorted(set(miss_prov)),
    "patient_calls": len([p for p in pat if p.strip("'\"`").startswith("/")]),
    "patient_missing": sorted(set(miss_pat)),
    "admin_calls": len([p for p in adm if p.strip("'\"`").startswith("/")]),
    "admin_missing": sorted(set(miss_adm)),
}
print(json.dumps(out, ensure_ascii=False, indent=2))
with open("/tmp/backend_routes.json", "w") as f:
    json.dump(sorted([f"{m} {p}" for (m, p) in backend_set]), f, ensure_ascii=False, indent=1)
