from pathlib import Path
import csv
root=Path('/tmp/nabd-main-audit')
src=root/'audit-artifacts/phase0d/PHASE0D_JOURNEY_CONTRACT_RECONCILIATION.tsv'
out=root/'audit-artifacts/phase0d/PHASE0D_JOURNEY_CONTRACT_RECONCILIATION_REJECTED_MECHANICAL_ANCHOR.tsv'
with src.open(encoding='utf-8',newline='') as f:
    reader=csv.DictReader(f,delimiter='\t'); rows=list(reader); fields=list(reader.fieldnames or [])
fields.append('status')
with out.open('w',encoding='utf-8',newline='') as f:
    w=csv.DictWriter(f,fieldnames=fields,delimiter='\t',lineterminator='\n'); w.writeheader()
    for r in rows:
        r['status']='REJECTED_MECHANICAL_ANCHOR'; w.writerow(r)
print('PRESERVED_ROWS',len(rows)); print('OUTPUT',out)
if len(rows)!=40: raise SystemExit('Expected 40 historical rows')
