from __future__ import annotations
import csv,json,re
from pathlib import Path
from collections import Counter

ROOT=Path('/home/ubuntu/nabdah_impl/repo')
M=Path('/home/ubuntu/nabdah_review/extracted/mobile/app')
OUT=ROOT/'audit-artifacts/full-audit-20260823'
OUT.mkdir(parents=True,exist_ok=True)

# Route candidates are intentionally conservative: a filename/domain match means only that
# a page may exist, never that the Mobile capability is complete.
web_pages=[p for p in (ROOT/'app').rglob('page.tsx')]
web_routes=['/'+str(p.parent.relative_to(ROOT/'app')).replace('[locale]','[locale]') for p in web_pages]

def norm(s):
    s=s.lower()
    s=re.sub(r'\[[^]]+\]','',s)
    s=re.sub(r'[^a-z0-9]+','-',s)
    return s.strip('-')

# Explicit known route families whose route names do not match Mobile file names.
family_aliases={
 'consultations/doctor-search':'/consultations/doctors',
 'consultations/doctor-profile':'/consultations/doctors/[doctorId]',
 'consultations/specialty-select':'/consultations/specialties',
 'consultations/appointment-detail':'/appointments/[appointmentId]',
 'consultations/cancel-reschedule':'/appointments/[appointmentId]',
 'diagnostics/package-detail':'/diagnostics/packages/[packageId]',
 'diagnostics/search':'/diagnostics',
 'diagnostics/my-results':'/health/reports',
 'reports/hub':'/health/reports',
 'profile/index':'/profile',
 'tabs/index':'/dashboard',
 'tabs/consultations/index':'/consultations/doctors',
 'tabs/health':'/health',
 'tabs/pharmacy':'/medicines',
 'nursing/service-info':'/home-care/services/[serviceId]',
 'nursing/service-details':'/home-care/services',
 'pharmacy/product-detail':'/medicines/[medicineId]',
 'pharmacy/cart':'/cart',
 'pharmacy/checkout':'/cart/checkout',
 'pharmacy/payment':'/orders/[orderId]',
 'pharmacy/order-tracking':'/orders/[orderId]/tracking',
 'pharmacy/order-confirm':'/orders/[orderId]',
 'pharmacy/order-history':'/orders',
 'articles/index':'/articles',
 'articles/[slug]':'/articles/[slug]',
 'notifications/index':'/notifications',
 'settings/index':'/settings',
 'family/hub':'/family',
 'insurance/hub':'/insurance',
}

def candidate(rel):
    rel=str(rel.with_suffix(''))
    if rel in family_aliases: return [family_aliases[rel]]
    filename=norm(Path(rel).name)
    domain=norm(str(Path(rel).parent))
    out=[]
    for r in web_routes:
        last=norm(r.split('/')[-1] or 'home')
        if filename and filename==last: out.append(r)
    return sorted(set(out))

def markers(p):
    s=p.read_text(errors='ignore')
    nav=len(re.findall(r'navigation\.(navigate|push|replace|goBack|pop|reset)|router\.(push|replace)',s))
    actions=len(re.findall(r'onPress\s*=|onSubmit|Alert\.alert|dispatch\(',s))
    methods=sorted(set(re.findall(r'method\s*:\s*["\'](GET|POST|PUT|PATCH|DELETE)["\']',s)))
    endpoints=sorted(set(re.findall(r'/(?:api/)?[A-Za-z0-9_${}\[\]/?=.&:-]+',s)))
    return nav,actions,methods,endpoints

rows=[]
for p in sorted(M.rglob('*')):
    if not p.is_file() or p.suffix not in {'.tsx','.ts','.jsx','.js'} or '__tests__' in p.parts: continue
    rel=p.relative_to(M); nav,actions,methods,endpoints=markers(p); c=candidate(rel)
    if c and actions and methods: status='partial-route-contract-review'
    elif c: status='partial-route-only'
    else: status='missing-or-merged-route-review'
    rows.append({'mobile_file':str(rel),'domain':rel.parts[0] if rel.parts else 'root','web_route_candidates':c,'nav_markers':nav,'action_markers':actions,'http_methods':methods,'status':status,'endpoint_markers':endpoints[:40]})

with (OUT/'PHASE2_MOBILE_WEB_PARITY_MATRIX.tsv').open('w',newline='',encoding='utf-8') as f:
    fields=['mobile_file','domain','web_route_candidates','nav_markers','action_markers','http_methods','status','endpoint_markers']
    w=csv.DictWriter(f,fieldnames=fields,delimiter='\t'); w.writeheader()
    for r in rows:
        r=dict(r); r['web_route_candidates']=' | '.join(r['web_route_candidates']); r['http_methods']=','.join(r['http_methods']); r['endpoint_markers']=' | '.join(r['endpoint_markers']); w.writerow(r)
summary={'rows':len(rows),'statuses':dict(Counter(r['status'] for r in rows)),'domains':dict(Counter(r['domain'] for r in rows)),'routes':len(web_routes)}
(OUT/'PHASE2_MATRIX_SUMMARY.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
