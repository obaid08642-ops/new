from __future__ import annotations
import csv, json, re, zipfile
from pathlib import Path

ROOT=Path('/tmp/nabd-main-audit'); BASE=ROOT/'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc'; OUT=ROOT/'audit-artifacts/phase0d'
SURFACES={'patient-mobile':'nabd_plus_patient_app.zip','patient-web':'nabd-patient-web.zip','provider':'NabdProvider-provider.zip','admin':'web_admin_dashboard.zip'}
required={'archive_path','member_path','sha256','line_count','kind','role','domain','fully_read','evidence_file','evidence_section','line_ranges_read','routes_screens_actions','backend_consumers_or_contracts','auth_ownership','state_transitions','payment_insurance_relevance','error_empty_loading_retry_cancel','existing_tests','notes'}

def parse_range(value, maxline):
    if value=='N/A': return True
    for part in value.split(','):
        m=re.fullmatch(r'(\d+)(?:-(\d+))?',part.strip())
        if not m: return False
        if int(m.group(1))<1 or int(m.group(2) or m.group(1))>maxline: return False
    return True

def main():
    result={}; failures=[]
    for surface,archive in SURFACES.items():
        manifest=OUT/f'phase0d-{surface}'/f'NABD_Phase0D_{surface.replace("-","_")}_Semantic_Read_Manifest.tsv'
        with zipfile.ZipFile(BASE/archive) as z: members={i.filename for i in z.infolist() if not i.is_dir()}
        with manifest.open(encoding='utf-8',newline='') as fp:
            reader=csv.DictReader(fp,delimiter='\t'); fields=set(reader.fieldnames or []); rows=list(reader)
        if fields != required: failures.append(f'{surface}:header mismatch')
        counts={k:sum(r['fully_read']==k for r in rows) for k in ('YES','N/A','NO')}
        missing_members=[r['member_path'] for r in rows if r['member_path'] not in members]
        duplicate_members=[p for p in set(r['member_path'] for r in rows) if sum(r['member_path']==p for r in rows)>1]
        missing_evidence=[]; bad_ranges=[]; bad_hash=[]
        for r in rows:
            if r['fully_read']=='YES':
                if not r['evidence_file'] or not (ROOT/r['evidence_file']).is_file(): missing_evidence.append(r['member_path'])
                try: maxline=int(r['line_count'])
                except: maxline=0
                if not parse_range(r['line_ranges_read'],maxline): bad_ranges.append(r['member_path'])
                if r['member_path'] not in (ROOT/r['evidence_file']).read_text(encoding='utf-8',errors='replace') if r['evidence_file'] else True: failures.append(f'{surface}:evidence missing member literal:{r["member_path"]}')
            if r['fully_read']=='N/A' and not r['notes']: failures.append(f'{surface}:N/A without reason:{r["member_path"]}')
        bad_kind=[r['member_path'] for r in rows if r['kind'] in ('OWNED_SOURCE_OR_CONFIG','OWNED_TEST') and r['fully_read']!='YES']
        result[surface]={'archive':archive,'archive_sha256':__import__('hashlib').sha256((BASE/archive).read_bytes()).hexdigest(),'total_members':len(rows),'YES':counts['YES'],'N/A':counts['N/A'],'NO':counts['NO'],'missing_members':len(missing_members),'duplicate_members':len(duplicate_members),'missing_evidence':len(missing_evidence),'bad_line_ranges':len(bad_ranges),'owned_unread':len(bad_kind)}
        if missing_members: failures.append(f'{surface}:missing members {missing_members[:3]}')
        if duplicate_members: failures.append(f'{surface}:duplicate members {duplicate_members[:3]}')
        if missing_evidence: failures.append(f'{surface}:missing evidence {missing_evidence[:3]}')
        if bad_ranges: failures.append(f'{surface}:bad line ranges {bad_ranges[:3]}')
        if bad_kind: failures.append(f'{surface}:owned unread {bad_kind[:3]}')
    (OUT/'PHASE0D_MANIFEST_VALIDATION.json').write_text(json.dumps({'surfaces':result,'failures':failures},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'surfaces':result,'failure_count':len(failures)},ensure_ascii=False,indent=2))
    raise SystemExit(1 if failures else 0)
if __name__=='__main__': main()
