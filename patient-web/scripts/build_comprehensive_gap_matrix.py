from __future__ import annotations
import csv, json, re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path('/home/ubuntu/nabdah_impl/repo')
MOBILE = Path('/home/ubuntu/nabdah_review/extracted/mobile/app')
OUT = ROOT / 'audit-artifacts/comprehensive-audit-20260823'
OUT.mkdir(parents=True, exist_ok=True)
EXT = {'.ts', '.tsx', '.js', '.jsx'}
ACTION_RE = re.compile(r'onPress\s*=|onSubmit|Alert\.alert|Linking\.openURL|dispatch\(')
NAV_RE = re.compile(r'navigation\.(navigate|push|replace|goBack|pop|reset)|router\.(push|replace)|<Stack\.Screen|<Tab\.Screen|<Drawer\.Screen')
METHOD_RE = re.compile(r'method\s*:\s*["\'](GET|POST|PUT|PATCH|DELETE)["\']')

web_pages = sorted((ROOT / 'app').rglob('page.tsx'))
web_routes = ['/' + str(p.parent.relative_to(ROOT / 'app')) for p in web_pages]
web_names = defaultdict(list)
for route in web_routes:
    name = route.rstrip('/').split('/')[-1] or 'home'
    name = re.sub(r'\[[^]]+\]', '', name).lower()
    web_names[name].append(route)

def screen_key(name: str) -> str:
    name = re.sub(r'\.(tsx?|jsx?)$', '', name.lower())
    name = re.sub(r'[^a-z0-9]+', '-', name).strip('-')
    return name

def classify(web_candidates, actions, methods, domain):
    if not web_candidates:
        return 'MISSING_WEB_SURFACE'
    if actions and any(m != 'GET' for m in methods):
        return 'PARTIAL_MUTATION_CONTRACT_REQUIRED'
    if actions:
        return 'PARTIAL_ACTION_PROOF_REQUIRED'
    return 'READ_CANDIDATE_CONTRACT_PROOF_REQUIRED'

rows = []
for p in sorted(x for x in MOBILE.rglob('*') if x.is_file() and x.suffix in EXT and '__tests__' not in x.parts):
    text = p.read_text(errors='ignore')
    rel = str(p.relative_to(MOBILE))
    key = screen_key(p.name)
    candidates = web_names.get(key, [])
    actions = len(ACTION_RE.findall(text))
    nav = len(NAV_RE.findall(text))
    methods = Counter(METHOD_RE.findall(text))
    rows.append({
        'mobile_file': rel,
        'domain': p.relative_to(MOBILE).parts[0] if p.relative_to(MOBILE).parts else 'root',
        'mobile_action_markers': actions,
        'mobile_navigation_markers': nav,
        'mobile_methods': json.dumps(dict(methods), ensure_ascii=False, sort_keys=True),
        'web_route_candidates': ' | '.join(candidates),
        'status': classify(candidates, actions, methods, p.relative_to(MOBILE).parts[0] if p.relative_to(MOBILE).parts else 'root'),
        'evidence_required': 'live contract + SSR/security test + full journey test' if actions else 'live contract + SSR/security test',
    })

with (OUT / 'mobile_web_screen_gap_matrix.tsv').open('w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0]), delimiter='\t')
    writer.writeheader(); writer.writerows(rows)

journey_path = ROOT / 'audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.tsv'
journeys = []
with journey_path.open(encoding='utf-8') as f:
    for r in csv.DictReader(f, delimiter='\t'):
        journeys.append(r)

for r in journeys:
    r['audit_status'] = 'CONTRACT_STATUS_REQUIRES_RECHECK'
    if r.get('web_status', '').startswith('implemented'):
        r['audit_status'] = 'IMPLEMENTED_CANDIDATE_REQUIRES_PROOF'
    if 'blocked' in (r.get('web_status','') + r.get('required_proof','')).lower():
        r['audit_status'] = 'BLOCKED_OR_DEFERRED'
with (OUT / 'journey_72_gap_matrix.tsv').open('w', encoding='utf-8', newline='') as f:
    fields = list(journeys[0])
    writer = csv.DictWriter(f, fieldnames=fields, delimiter='\t'); writer.writeheader(); writer.writerows(journeys)

summary = {
    'mobile_files': len(rows),
    'mobile_files_with_action_markers': sum(r['mobile_action_markers'] > 0 for r in rows),
    'mobile_files_with_mutation_markers': sum(any(k != 'GET' for k in json.loads(r['mobile_methods']).keys()) for r in rows),
    'web_page_routes': len(web_routes),
    'web_files_with_name_candidate': sum(bool(r['web_route_candidates']) for r in rows),
    'web_files_without_name_candidate': sum(not r['web_route_candidates'] for r in rows),
    'status_counts': dict(Counter(r['status'] for r in rows)),
    'domain_counts': dict(Counter(r['domain'] for r in rows)),
    'journeys_72': len(journeys),
    'journey_status_counts': dict(Counter(r['audit_status'] for r in journeys)),
}
(OUT / 'comprehensive_gap_summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(summary, ensure_ascii=False))
