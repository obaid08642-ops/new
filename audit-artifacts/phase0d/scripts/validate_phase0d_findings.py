from __future__ import annotations
import csv, json, zipfile
from pathlib import Path

ROOT=Path('/tmp/nabd-main-audit'); BASE=ROOT/'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc'; OUT=ROOT/'audit-artifacts/phase0d'
SURFACES={'patient-mobile':'nabd_plus_patient_app.zip','patient-web':'nabd-patient-web.zip','provider':'NabdProvider-provider.zip','admin':'web_admin_dashboard.zip'}
allowed={'UNIQUE_DEFECT','DUPLICATE_OF','DERIVED_OF','PRODUCT_DECISION_REQUIRED','RUNTIME_VERIFICATION_REQUIRED','INSUFFICIENT_EVIDENCE'}
def text_lines(data):
    try: return len(data.decode('utf-8').splitlines())
    except UnicodeDecodeError: return None
def main():
    failures=[]; result={}; total=0
    for s,a in SURFACES.items():
        with zipfile.ZipFile(BASE/a) as z:
            sizes={i.filename:text_lines(z.read(i)) for i in z.infolist() if not i.is_dir() and text_lines(z.read(i)) is not None}
        p=OUT/f'phase0d-{s}'/f'Phase0D_{s}_Findings.tsv'; rows=list(csv.DictReader(p.open(encoding='utf-8'),delimiter='\t')); total+=len(rows)
        bad=[]
        for r in rows:
            if r['relation'] not in allowed: bad.append(r['id']+':bad_relation')
            if r['source_path'] not in sizes: bad.append(r['id']+':missing_member')
            elif int(r['line'])<1 or int(r['line'])>sizes[r['source_path']]: bad.append(r['id']+':bad_line')
            if not r['accepted_test'] or not r['finding']: bad.append(r['id']+':missing_required')
        result[s]={'rows':len(rows),'bad_rows':len(bad),'relations':{x:sum(r['relation']==x for r in rows) for x in sorted(allowed) if any(r['relation']==x for r in rows)}}
        failures.extend([s+':'+x for x in bad])
    payload={'total_findings':total,'surfaces':result,'failure_count':len(failures),'failures':failures[:100]}
    (OUT/'PHASE0D_FINDINGS_VALIDATION.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(payload,ensure_ascii=False,indent=2)); raise SystemExit(1 if failures else 0)
if __name__=='__main__': main()
