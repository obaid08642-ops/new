from pathlib import Path
import csv, json, re, subprocess
ROOT=Path('/tmp/nabd-main-audit')
OUT=ROOT/'audit-artifacts/production-readiness-plan'
OUT.mkdir(parents=True,exist_ok=True)
cmd=lambda *a: subprocess.check_output(a,cwd=ROOT,text=True).strip()
commits=cmd('git','log','--format=%H\t%s','--max-count=100').splitlines()
patterns={
 'no_go':r'(?i)\bNO[-_ ]?GO\b',
 'security':r'(?i)security|BOLA|ownership|auth|PII|secret|CSRF|rate.limit',
 'payment_insurance':r'(?i)payment|wallet|insurance|co-pay|copay|Moyasar|refund|ledger',
 'runtime_external':r'(?i)runtime|sandbox|production|deploy|external|device|live',
 'data_mock':r'(?i)mock|placeholder|synthetic|fixture|fake data',
 'performance':r'(?i)performance|scal|load|cache|queue|redis|Mongo|observability',
}
files=[]
for base in [ROOT/'audit-artifacts/phase0-main-audit',ROOT/'audit-artifacts/phase0b-backend',ROOT/'audit-artifacts/phase0d']:
 for p in base.rglob('*'):
  if p.is_file() and p.suffix.lower() in {'.md','.tsv','.json','.txt'} and '/evidence/' not in str(p):
   try: text=p.read_text(encoding='utf-8',errors='replace')
   except: continue
   hits={k:len(re.findall(v,text)) for k,v in patterns.items()}
   if any(hits.values()): files.append({'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,**hits})
with (OUT/'AUDIT_EVIDENCE_INVENTORY_2026-08-25.tsv').open('w',encoding='utf-8',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(files[0]),delimiter='\t',lineterminator='\n');w.writeheader();w.writerows(files)
summary={'head':cmd('git','rev-parse','HEAD'),'branch':cmd('git','branch','--show-current'),'commits_considered':len(commits),'artifacts_considered':len(files),'commit_history':commits,'pattern_totals':{k:sum(x[k] for x in files) for k in patterns}}
(OUT/'AUDIT_EVIDENCE_INVENTORY_SUMMARY_2026-08-25.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
