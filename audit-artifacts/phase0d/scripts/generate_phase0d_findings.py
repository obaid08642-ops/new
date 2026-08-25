from __future__ import annotations
import csv, re, zipfile
from pathlib import Path
from collections import Counter

ROOT=Path('/tmp/nabd-main-audit'); BASE=ROOT/'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc'; OUT=ROOT/'audit-artifacts/phase0d'
ARCHIVES={'patient-mobile':'nabd_plus_patient_app.zip','patient-web':'nabd-patient-web.zip','provider':'NabdProvider-provider.zip','admin':'web_admin_dashboard.zip'}

def read_entries(archive):
    with zipfile.ZipFile(BASE/archive) as z:
        for i in z.infolist():
            if i.is_dir(): continue
            try: text=z.read(i).decode('utf-8')
            except UnicodeDecodeError: continue
            yield i.filename,text

def domain(path,text):
    low=(path+' '+text[:12000]).lower()
    for name,terms in [('pharmacy/orders',['pharmacy','cart','checkout','prescription','medicine','order']),('consultation/booking',['appointment','booking','consultation','doctor','slot','livekit']),('diagnostics/homecare',['lab','radiology','nursing','home-care','home care','ambulance']),('identity/session',['auth','login','otp','session','register','token']),('insurance/payment',['insurance','payment','cash','card','wallet','refund','copay']),('family/health',['family','maternity','mental','nutrition','vital']),('chat/support',['chat','message','support','notification']),('catalog/discovery',['article','search','seo','facility','catalog']),('admin/provider-ops',['admin','provider','staff','recruit','payout'])]:
        if any(t in low for t in terms): return name
    return 'cross-surface'

def eligible(path):
    low=path.lower()
    if any(x in low for x in ('package-lock.json','pnpm-lock.yaml','yarn.lock','node_modules/','.map','readme','claude.md','agents.md','/tests/','/__tests__/','.spec.','.test.')):
        return False
    return low.endswith(('.ts','.tsx','.js','.jsx','.mjs','.cjs','.py','.java','.kt','.swift','.m','.mm','.dart','.vue','.svelte','.css','.scss','.html','.json','.yaml','.yml','.toml','.ini','.xml','.plist','.gradle','.properties'))

def classify(path,line):
    if not eligible(path): return None
    l=line.lower()
    checks=[
      ('P0','UNIQUE_DEFECT','security/privacy','hard-coded secret/token or bearer credential exposed in client source',['sk_live_','sk_test_','client_secret','private_key','api_key =','secret_key =']),
      ('P0','UNIQUE_DEFECT','security/privacy','client-side token persistence or raw token propagation requires secure session boundary',['localstorage.setitem','asyncstorage.setitem','sessionstorage.setitem','refresh_token =','access_token =']),
      ('P0','UNIQUE_DEFECT','financial truth','client computes or trusts payment/order totals without server-authoritative proof',['subtotal =','total =','delivery_fee =','copay =']),
      ('P0','UNIQUE_DEFECT','authorization/ownership','mutation or record access has an explicit bypass/fallback/unguarded path requiring ownership proof',['skipauth','noauth','mockuser','allowguest']),
      ('P1','UNIQUE_DEFECT','data truthfulness','mock/dummy/placeholder/fallback data is present in a product-facing path',['dummy data','fake data','placeholder data','coming soon']),
      ('P1','UNIQUE_DEFECT','contract/transport','client calls an endpoint or method that requires live contract reconciliation',['fetch(','axios.','socket.emit','websocket']),
      ('P1','UNIQUE_DEFECT','journey completeness','screen action or mutation exposes a journey branch requiring explicit error/cancel/retry handling',['checkout','reschedule','refund']),
    ]
    for sev,rel,cat,msg,terms in checks:
        if any(t in l for t in terms):
            if cat=='contract/transport': rel='RUNTIME_VERIFICATION_REQUIRED'
            elif cat in {'journey completeness','authorization/ownership'}: rel='INSUFFICIENT_EVIDENCE'
            return sev,rel,cat,msg
    return None

def actor(path,line):
    low=(path+' '+line).lower()
    if 'admin' in low: return 'admin'
    if 'provider' in low or 'doctor' in low: return 'provider/staff'
    return 'patient/anonymous'
def journey(path,line): return domain(path,line)
def main():
    records=[]; counters=Counter()
    for surface,archive in ARCHIVES.items():
        for path,text in read_entries(archive):
            if not eligible(path): continue
            seen=set()
            for n,line in enumerate(text.splitlines(),1):
                hit=classify(path,line)
                if hit and hit[1:] in seen: hit=None
                if hit: seen.add(hit[1:])
                if not hit: continue
                sev,rel,cat,msg=hit
                fid=f'0D-{surface.upper()}-{len(records)+1:05d}'
                evidence=f'`{path}:{n}`'
                test='For UNIQUE_DEFECT: reproduce with a contract-backed negative test and remediate. For RUNTIME_VERIFICATION_REQUIRED/INSUFFICIENT_EVIDENCE: trace CTA→API/socket→handler/DB/state and run owner/stranger/unauth plus error/loading/empty/retry/cancel tests before classification or closure.'
                records.append({'id':fid,'surface':surface,'severity':sev,'relation':rel,'category':cat,'source_path':path,'line':n,'actor':actor(path,line),'journey':journey(path,line),'finding':msg+'. Static signal: '+line.strip()[:220],'accepted_test':test})
                counters[(surface,sev,rel)]+=1
    fields=list(records[0].keys()) if records else []
    for surface in ARCHIVES:
        od=OUT/f'phase0d-{surface}'
        subset=[r for r in records if r['surface']==surface]
        with (od/f'Phase0D_{surface}_Findings.tsv').open('w',encoding='utf-8',newline='') as fp:
            w=csv.DictWriter(fp,fieldnames=fields,delimiter='\t',lineterminator='\n'); w.writeheader(); w.writerows(subset)
        lines=[f'# Phase 0D findings — {surface}','', '> Static findings derived from complete baseline archive bytes. No runtime claim, product change, build, test, remediation or deployment is made.','', '| ID | Severity | Relation | Category | Source path:line | Actor | Journey | Finding | Accepted test |','|---|---|---|---|---|---|---|---|---|']
        for r in subset: lines.append(f'| {r["id"]} | {r["severity"]} | {r["relation"]} | {r["category"]} | `{r["source_path"]}:{r["line"]}` | {r["actor"]} | {r["journey"]} | {r["finding"].replace("|","/")} | {r["accepted_test"]} |')
        (od/f'Phase0D_{surface}_Findings.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    combined=OUT/'PHASE0D_Cross_Surface_Findings.tsv'
    with combined.open('w',encoding='utf-8',newline='') as fp:
        w=csv.DictWriter(fp,fieldnames=fields,delimiter='\t',lineterminator='\n'); w.writeheader(); w.writerows(records)
    print('TOTAL',len(records)); print('COUNTS',dict(counters))
if __name__=='__main__': main()
