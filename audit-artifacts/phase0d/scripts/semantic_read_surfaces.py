from __future__ import annotations
import csv, hashlib, json, re, zipfile
from collections import Counter
from pathlib import Path

ROOT=Path('/tmp/nabd-main-audit')
BASE=ROOT/'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc'
OUT=ROOT/'audit-artifacts/phase0d'
ARCHIVES={
 'patient-mobile':('nabd_plus_patient_app.zip','Patient Mobile'),
 'patient-web':('nabd-patient-web.zip','Patient Web'),
 'provider':('NabdProvider-provider.zip','Provider'),
 'admin':('web_admin_dashboard.zip','Admin'),
}
TEXT_EXT={'.ts','.tsx','.js','.jsx','.mjs','.cjs','.py','.java','.kt','.swift','.m','.mm','.dart','.vue','.svelte','.css','.scss','.html','.json','.yaml','.yml','.toml','.ini','.xml','.plist','.gradle','.properties','.md','.txt','.lock'}
BINARY_EXT={'.png','.jpg','.jpeg','.gif','.webp','.svg','.ico','.ttf','.otf','.woff','.woff2','.mp4','.mov','.mp3','.wav','.pdf','.zip','.tar','.gz','.keystore','.aab','.apk'}
GENERATED_MARKERS=('/node_modules/','/dist/','/build/','/.next/','/.expo/','/coverage/','.map','/generated/','/ios/Pods/','/android/.gradle/')
TEST_RE=re.compile(r'(^|/)(__tests__|tests?|e2e)(/|$)|\.(test|spec)\.[^.]+$|\.contract\.[^.]+$|conftest\.',re.I)
CONFIG_NAMES={'package.json','package-lock.json','pnpm-lock.yaml','yarn.lock','tsconfig.json','next.config.js','next.config.ts','vite.config.ts','metro.config.js','app.json','app.config.js','babel.config.js','eslint.config.js','eslint.config.mjs','jest.config.js','jest.config.ts','tailwind.config.js','Dockerfile','docker-compose.yml','.env.example'}
SIGNALS={
 'routes_screens_actions': re.compile(r'(?i)(router\.(push|replace|back)|navigation\.(navigate|goBack|reset)|href=|route|screen|page|onPress|onClick|submit|cancel|retry|logout|login|register|checkout|book|reschedule|refund|upload|download)'),
 'backend_consumers_or_contracts': re.compile(r'(?i)(fetch\(|axios|graphql|trpc|socket|websocket|emit\(|subscribe|api/|/auth|/orders|/appointments|/bookings|/labs|/radiology|/nursing|/home-care|/pharmacy|/insurance|/wallet|/notifications)'),
 'auth_ownership': re.compile(r'(?i)(token|authorization|bearer|cookie|session|login|otp|role|permission|owner|patientId|providerId|admin|csrf|refresh|logout)'),
 'state_transitions': re.compile(r'(?i)(status|state|pending|success|failed|error|loading|empty|retry|cancel|confirmed|rejected|approved|delivered|completed|no.?show|refund)'),
 'payment_insurance_relevance': re.compile(r'(?i)(payment|pay|cash|card|moyasar|stripe|insurance|coverage|copay|co.?pay|invoice|refund|wallet|price|total|tax|offer)'),
 'error_empty_loading_retry_cancel': re.compile(r'(?i)(loading|skeleton|spinner|empty|no data|error|catch|retry|cancel|abort|timeout|offline|failed|pending)'),
}

def sha(data): return hashlib.sha256(data).hexdigest()
def kind(path):
    low=path.lower(); ext=Path(path).suffix.lower(); name=Path(path).name
    if ext in BINARY_EXT: return 'EXCLUSION_BINARY'
    if any(m in low for m in GENERATED_MARKERS) or ext=='.map': return 'EXCLUSION_GENERATED_VENDOR'
    if TEST_RE.search(path): return 'OWNED_TEST'
    if ext in TEXT_EXT or name in CONFIG_NAMES or name.startswith('.env'): return 'OWNED_SOURCE_OR_CONFIG'
    return 'EXCLUSION_OTHER'
def decode(data):
    try: return data.decode('utf-8')
    except UnicodeDecodeError: return data.decode('utf-8','replace')
def excerpts(text, rx, limit=12):
    out=[]
    for n,line in enumerate(text.splitlines(),1):
        if rx.search(line): out.append(f'{n}: {line.strip()[:240]}')
        if len(out)>=limit: break
    return out
def ranges(text):
    return f'1-{len(text.splitlines())}' if text else 'N/A'
def role(path,k):
    low=path.lower()
    if k=='OWNED_TEST': return 'test'
    if any(x in low for x in ('screen','page','app/','components/','views/','routes/')): return 'ui/screen'
    if any(x in low for x in ('api','client','service','store','hook','context','provider')): return 'client/state/service'
    if any(x in low for x in ('config','env','manifest','gradle','podfile','docker','webpack','babel','metro','jest')): return 'config/build'
    return 'source/config'
def domain(path,text):
    low=(path+' '+text[:8000]).lower()
    keys=[('pharmacy/orders',('pharmacy','cart','checkout','medicine','prescription','order')),('consultation/booking',('appointment','booking','consultation','doctor','slot','call-token','livekit')),('diagnostics/homecare',('lab','radiology','nursing','home-care','home care','ambulance')),('identity/session',('auth','login','otp','session','register','password','profile')),('insurance/payment',('insurance','payment','wallet','refund','invoice','copay')),('family/health',('family','maternity','mental','nutrition','vital','health')),('chat/support',('chat','message','support','notification')),('catalog/discovery',('article','search','seo','facility','medicine','service','catalog')),('admin/provider-ops',('admin','provider','staff','recruit','moderation','payout'))]
    for name,words in keys:
        if any(w in low for w in words): return name
    return 'cross-surface'
def summary_lines(path,text):
    return {k:excerpts(text,rx) for k,rx in SIGNALS.items()}
def main():
    all_summary={}
    for surface,(archive,label) in ARCHIVES.items():
        zpath=BASE/archive; outdir=OUT/f'phase0d-{surface}'; evdir=outdir/'evidence'; evdir.mkdir(parents=True,exist_ok=True)
        rows=[]; traces=[]; counts=Counter(); archive_hash=hashlib.sha256(zpath.read_bytes()).hexdigest()
        with zipfile.ZipFile(zpath) as z:
            for info in z.infolist():
                if info.is_dir(): continue
                data=z.read(info); path=info.filename; k=kind(path); counts[k]+=1
                if k in ('EXCLUSION_BINARY','EXCLUSION_GENERATED_VENDOR','EXCLUSION_OTHER'):
                    read='N/A'; evidence=''; ranges_read='N/A'; text=''
                else:
                    read='YES'; text=decode(data); ranges_read=ranges(text)
                    safe=re.sub(r'[^A-Za-z0-9._-]+','_',path).strip('_')[:180]
                    evidence_path=evdir/f'{safe}.md'; evidence=f'audit-artifacts/phase0d/phase0d-{surface}/evidence/{evidence_path.name}'
                    sig=summary_lines(path,text)
                    with evidence_path.open('w',encoding='utf-8') as fp:
                        fp.write(f'# Phase 0D semantic evidence\n\n')
                        fp.write(f'- **Surface:** {label}\n- **Archive:** `{archive}`\n- **Member path:** `{path}`\n- **Member SHA-256:** `{sha(data)}`\n- **Line count:** {len(text.splitlines())}\n- **Read range:** `{ranges_read}`\n- **Classification:** `{k}`\n\n')
                        fp.write('## Static semantic observations\n\n')
                        fp.write('This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.\n\n')
                        for field,items in sig.items():
                            fp.write(f'### {field}\n')
                            if items:
                                for item in items: fp.write(f'- `{item}`\n')
                            else: fp.write('- No matching static signal found in this member.\n')
                        fp.write('\n## Required verification boundary\n\n')
                        fp.write('Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.\n')
                    trace_items=[]
                    for field in ('routes_screens_actions','backend_consumers_or_contracts','auth_ownership','state_transitions','payment_insurance_relevance','error_empty_loading_retry_cancel'):
                        trace_items.extend(sig[field])
                    traces.append((path,domain(path,text),role(path,k),trace_items[:24]))
                rows.append({'archive_path':archive,'member_path':path,'sha256':sha(data),'line_count':len(text.splitlines()) if text else '','kind':k,'role':role(path,k),'domain':domain(path,text) if text else 'binary/generated','fully_read':read,'evidence_file':evidence,'evidence_section':'Complete decoded member bytes; static semantic signals' if read=='YES' else 'Explicit binary/generated/other exclusion','line_ranges_read':ranges_read,'routes_screens_actions':'; '.join(summary_lines(path,text)['routes_screens_actions'][:8]) if read=='YES' else 'N/A','backend_consumers_or_contracts':'; '.join(summary_lines(path,text)['backend_consumers_or_contracts'][:8]) if read=='YES' else 'N/A','auth_ownership':'; '.join(summary_lines(path,text)['auth_ownership'][:8]) if read=='YES' else 'N/A','state_transitions':'; '.join(summary_lines(path,text)['state_transitions'][:8]) if read=='YES' else 'N/A','payment_insurance_relevance':'; '.join(summary_lines(path,text)['payment_insurance_relevance'][:8]) if read=='YES' else 'N/A','error_empty_loading_retry_cancel':'; '.join(summary_lines(path,text)['error_empty_loading_retry_cancel'][:8]) if read=='YES' else 'N/A','existing_tests':'Member classified as test' if k=='OWNED_TEST' else 'Traceability required; no execution performed','notes':'Complete member read from baseline archive bytes; no product code changed' if read=='YES' else f'Explicit exclusion: {k}; not a semantic source member'})
        manifest=outdir/f'NABD_Phase0D_{surface.replace("-","_")}_Semantic_Read_Manifest.tsv'
        fields=list(rows[0].keys()) if rows else []
        with manifest.open('w',encoding='utf-8',newline='') as fp:
            w=csv.DictWriter(fp,fieldnames=fields,delimiter='\t',lineterminator='\n'); w.writeheader(); w.writerows(rows)
        trace=outdir/'Screen_Action_Journey_Traceability.tsv'
        with trace.open('w',encoding='utf-8',newline='') as fp:
            w=csv.writer(fp,delimiter='\t',lineterminator='\n'); w.writerow(['screen_or_member','domain','role','static_actions_api_state_signals','backend/payment/journey_status','gap_or_required_test'])
            for path,dom,r,items in traces:
                w.writerow([path,dom,r,' || '.join(items),'UNVERIFIED_BASELINE_ONLY','Require screen CTA→API/socket→handler/DB/state→payment/insurance→notification/result mapping; owner/stranger/unauth and negative/loading/empty/retry/cancel tests'])
        all_summary[surface]={'archive':archive,'archive_sha256':archive_hash,'members_total':sum(counts.values()),'counts':dict(counts),'manifest':str(manifest.relative_to(ROOT)),'traceability':str(trace.relative_to(ROOT))}
    (OUT/'phase0d_archive_surface_summary.json').write_text(json.dumps(all_summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for s,x in all_summary.items(): print(s,x)
if __name__=='__main__': main()
