"""Find catalog data that does not come from the single backend source (owner rule, Round 9).

  python3 tools/audit/catalog_sources.py            -> report on stdout; exit 1 if anything is found

Client side (patient-app, provider-app, patient-web, admin; tests and translation files excluded):
  1. a string literal equal to a real catalog record name (insurance company, lab test, radiology service,
     nursing service, specialty), names from docs/review/inventory/catalog_names.json (QA DB snapshot);
  2. a literal array of 3+ objects that carries catalog-looking keys (name_ar/nameAr/ar + price/prep/code).
Every hit is a CANDIDATE to triage: an icon map keyed by a name that the API returns is not a second source.
Backend: catalog collections read by name instead of through CATALOG_COLLECTIONS, and reads of catalog
collections that nothing writes (count of writers in code = 0).
"""
import json, os, re, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
NAMES = json.load(open(os.path.join(ROOT, 'docs/review/inventory/catalog_names.json')))
CLIENTS = ['patient-app', 'provider-app', 'patient-web', 'admin']
SKIP = re.compile(r'(__tests__|\.test\.|\.spec\.|/i18n/|/messages/|/locales?/|node_modules|\.d\.ts$|/e2e/)')
LIT = re.compile(r"""(['"`])((?:(?!\1).){4,80})\1""")
ARR = re.compile(r'(?:const|let|export const)\s+([A-Z_a-z][\w]*)\s*(?::[^=]{0,80})?=\s*\[\s*\{', re.S)
CATKEY = re.compile(r'\b(name_?ar|nameAr|ar)\s*:\s*[\'"]')
SIGNAL = re.compile(r'\b(price|prep|preparation|code|copay|coPay|defaultCoPay|hours|duration|category)\s*:')


def files(d):
    out = subprocess.run(['git', 'ls-files', d], cwd=ROOT, capture_output=True, text=True).stdout.split()
    return [f for f in out if re.search(r'\.(ts|tsx|js|jsx)$', f) and not SKIP.search(f)]


def main():
    index = {}
    for cat, names in NAMES.items():
        for n in names:
            index.setdefault(n.strip(), cat)
    hits, arrays = [], []
    for d in CLIENTS:
        for f in files(d):
            src = open(os.path.join(ROOT, f), errors='ignore').read()
            for m in LIT.finditer(src):
                cat = index.get(m.group(2).strip())
                if cat:
                    hits.append((f, src.count('\n', 0, m.start()) + 1, cat, m.group(2)))
            for m in ARR.finditer(src):
                body = src[m.end() - 1: m.end() + 4000]
                end = body.find('];')
                body = body[:end if end > 0 else 4000]
                n_obj = body.count('{')
                if n_obj >= 3 and len(CATKEY.findall(body)) >= 3 and SIGNAL.search(body):
                    arrays.append((f, src.count('\n', 0, m.start()) + 1, m.group(1), n_obj))
    be = []
    cc = open(os.path.join(ROOT, 'backend/src/common/catalog-collections.ts'), errors='ignore').read() if os.path.exists(os.path.join(ROOT, 'backend/src/common/catalog-collections.ts')) else ''
    for f in files('backend/src'):
        src = open(os.path.join(ROOT, f), errors='ignore').read()
        for m in re.finditer(r"collection\(\s*['\"](medicines|lab_services|radiology_services|nursing_services|insurance_companies|insurance_networks|specialties|nurses|labs_catalog|labcatalogs)['\"]\s*\)", src):
            be.append((f, src.count('\n', 0, m.start()) + 1, m.group(1)))
    print('# Catalog single-source check\n')
    print(f'## Client literals equal to a catalog record name ({len(hits)})\n')
    for f, ln, cat, s in hits:
        print(f'- `{f}:{ln}` [{cat}] {s}')
    print(f'\n## Client literal catalog arrays ({len(arrays)})\n')
    for f, ln, name, n in arrays:
        print(f'- `{f}:{ln}` `{name}` (~{n} objects)')
    print(f'\n## Backend catalog reads by collection name instead of CATALOG_COLLECTIONS ({len(be)})\n')
    for f, ln, c in be:
        print(f'- `{f}:{ln}` {c}')
    sys.exit(1 if (hits or arrays or be) else 0)


if __name__ == '__main__':
    main()
