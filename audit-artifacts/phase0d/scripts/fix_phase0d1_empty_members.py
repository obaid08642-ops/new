from pathlib import Path
import csv

ROOT=Path('/tmp/nabd-main-audit')
files=[
 ROOT/'audit-artifacts/phase0d/phase0d-patient-mobile/NABD_Phase0D_patient_mobile_Semantic_Read_Manifest.tsv',
 ROOT/'audit-artifacts/phase0d/phase0d-patient-web/NABD_Phase0D_patient_web_Semantic_Read_Manifest.tsv',
]
targets={
 'docs/DATA_FLOW.md','docs/RECOVERY_GUIDE.md','docs/OFFLINE_SYNC_FLOW.md','docs/DATABASE_SCHEMA.md','docs/SYNC_ENGINE.md',
 'audit-artifacts/full-audit-20260823/phase9-babel-why-prod.txt'
}
changed=[]
for path in files:
    with path.open(encoding='utf-8',newline='') as f:
        reader=csv.DictReader(f,delimiter='\t'); rows=list(reader); fields=reader.fieldnames
    for r in rows:
        if r['member_path'] in targets and r['fully_read']=='YES' and r['line_ranges_read']=='N/A':
            r['fully_read']='N/A'
            r['evidence_file']=''
            r['evidence_section']='Explicit empty-text member exclusion; no valid line range exists'
            r['notes']='N/A: baseline archive member has zero decoded lines (SHA-256 e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855); reclassified per Phase 0D.1 because line range cannot be valid.'
            changed.append((path.name,r['member_path']))
    with path.open('w',encoding='utf-8',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields,delimiter='\t',lineterminator='\n'); w.writeheader(); w.writerows(rows)
print('CHANGED',len(changed))
for x in changed: print(x[0],x[1])
if len(changed)!=6: raise SystemExit('Expected exactly six reclassifications')
