from __future__ import annotations
import csv,re,json
from pathlib import Path

ROOT=Path('/home/ubuntu/nabdah_impl/repo'); OUT=ROOT/'audit-artifacts/comprehensive-audit-20260823'
journeys=list(csv.DictReader((ROOT/'audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.tsv').open(encoding='utf-8'),delimiter='\t'))
web_text='\n'.join(p.read_text(errors='ignore') for base in [ROOT/'app',ROOT/'components-next',ROOT/'lib'] for p in base.rglob('*') if p.is_file() and p.suffix in {'.ts','.tsx'})
web_api=web_text.lower()
# Keep endpoint-like fragments only; do not infer semantics from filenames.
endpoint_re=re.compile(r'(?<![A-Za-z0-9_])/(?:api/v1/)?[A-Za-z0-9_./:${}\[\]-]+')
rows=[]
for j in journeys:
    evidence=j.get('mobile_api_evidence','')
    refs=[]
    for ref in endpoint_re.findall(evidence):
        ref=ref.rstrip('.,;`\"\' )')
        if len(ref)>3 and ref not in refs: refs.append(ref)
    hits=[]
    for ref in refs:
        stable=re.sub(r'\$\{[^}]+\}|\{[^}]+\}|:[A-Za-z_]+','',ref).lower().rstrip('/')
        if stable and stable in web_api: hits.append(ref)
    action=j.get('primary_action','').lower()
    required=['live method/path','payload/DTO','server-only auth boundary','owner/stranger/unauth','error/retry/empty','cleanup/idempotency when mutation']
    rows.append({**j,'mobile_endpoint_refs':' | '.join(refs),'web_code_reference_hits':' | '.join(hits),'web_code_hit_count':str(len(hits)),'evidence_status':'WEB_CODE_REFERENCE_ONLY' if hits else 'NO_WEB_CODE_REFERENCE_FOUND','required_acceptance':' ; '.join(required)})
fields=list(rows[0])
with (OUT/'journey_contract_surface_matrix.tsv').open('w',encoding='utf-8',newline='') as f:
    w=csv.DictWriter(f,fieldnames=fields,delimiter='\t'); w.writeheader(); w.writerows(rows)
summary={'journeys':len(rows),'with_any_web_code_reference':sum(bool(r['web_code_reference_hits']) for r in rows),'without_web_code_reference':sum(not r['web_code_reference_hits'] for r in rows),'mutation_journeys':sum('mutation' in r.get('primary_action','').lower() for r in rows),'mutation_with_web_reference':sum('mutation' in r.get('primary_action','').lower() and bool(r['web_code_reference_hits']) for r in rows)}
(OUT/'journey_contract_surface_summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
