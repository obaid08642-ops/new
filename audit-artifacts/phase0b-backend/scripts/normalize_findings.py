from __future__ import annotations
import csv, re
from collections import defaultdict, Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
FINDINGS = ROOT / 'audit-artifacts/phase0-main-audit/confirmed-findings-v1.md'
OUT_TSV = ROOT / 'audit-artifacts/phase0b-backend/NABD_Normalized_Remediation_Backlog_2026-08-25.tsv'
OUT_MD = ROOT / 'audit-artifacts/phase0b-backend/NABD_Normalized_Remediation_Backlog_2026-08-25.md'

WORKSTREAM_RULES = [
 ('platform/identity/audit', ['auth','identity','jwt','otp','cookie','session','permission','rbac','role','ownership','tenant','bola','audit','pii','phi','device','velocity','rate limit','csrf','webhook','secret','encryption']),
 ('catalog/quote', ['catalog','medicine','service','facility','doctor','provider profile','quote','price','pricing','availability','publication','seo','indexing','search','slug','translation']),
 ('pharmacy offers+settlement', ['pharmacy','medicine order','cart','checkout','prescription','stock','inventory','payout','wallet','ledger','settlement','refund','reorder']),
 ('consultation', ['appointment','booking','slot','consultation','call-token','livekit','reschedule','check-in','checkin','no-show']),
 ('diagnostics/homecare', ['lab','radiology','nursing','home-care','home care','ambulance','diagnostic','sample','result','imaging']),
 ('insurance/payment', ['insurance','payment','moyasar','zatca','invoice','tax','copay','coverage','claim','financial']),
 ('provider/admin operations', ['admin','moderation','recruitment','job','staff','leave','availability','withdrawal','procurement','governance','support ticket']),
 ('patient web/mobile parity', ['patient web','mobile','screen','button','route','animation','deep link','locale','rtl','accessibility','notification','chat']),
 ('release operations', ['docker','compose','livekit','turn','redis','mongo','deployment','release','build','e2e','test','runtime','staging','production','sitemap','robots','llms']),
]
CATEGORY_RULES = [
 ('privacy/authorization', ['pii','phi','privacy','ownership','tenant','bola','stranger','unauth','authorization','access control','consent','confidential']),
 ('financial truth/settlement', ['payment','price','pricing','total','tax','currency','refund','settlement','ledger','payout','invoice','copay','financial']),
 ('state/concurrency/idempotency', ['state','transition','atomic','transaction','concurrency','race','cas','lock','idempotency','replay','duplicate']),
 ('clinical/safety validation', ['clinical','medical','dosage','diagnosis','critical','allergy','prescription','safety','triage','symptom','health']),
 ('catalog/provenance/publication', ['catalog','publication','provenance','review','approval','seo','index','canonical','translation','source']),
 ('runtime/deployment evidence', ['runtime','not executed','build','deploy','docker','compose','live','sandbox','external','health','readiness','network','tls','certificate']),
 ('input/schema validation', ['validation','schema','dto','enum','range','format','sanit','injection','payload','attachment']),
 ('observability/lifecycle', ['audit','logging','notification','retention','cleanup','monitor','metric','trace','alert']),
 ('ux/parity/completeness', ['screen','button','route','journey','animation','locale','rtl','accessibility','empty','loading','error']),
]
OWNER_RULES = [
 ('Backend', ['backend','api','schema','dto','controller','service','repository','mongo','redis','transaction','webhook']),
 ('Patient Mobile', ['mobile','expo','react native','patient app','deep link']),
 ('Patient Web', ['patient web','next.js','website','web page','seo','sitemap','robots','llms']),
 ('Provider', ['provider','doctor','nursing','recruitment']),
 ('Admin', ['admin','moderation','governance']),
 ('Platform', ['docker','livekit','turn','redis','mongo','deployment','infra','security']),
 ('QA', ['test','e2e','assertion','coverage','fixture','runtime']),
 ('Operations', ['insurance','payment','settlement','notification','support','payout']),
]
P0_RULES = ['remote code','injection','credential','secret','token leakage','unauthorized','bola','cross-tenant','pii exposure','phi exposure','patient data','payment capture','refund','financial loss','webhook forgery','privilege escalation','arbitrary file','tls disabled','database exposed']
DECISION_RULES = ['decision','policy','approval','eligibility','coverage','pricing','source of truth','medical review','public eligibility','indexing eligibility','contract missing','contract unknown','must not','pending review','legal','license']
RUNTIME_RULES = ['not executed','runtime','live','sandbox','external','deployment','build','health','readiness','network','tls','certificate','e2e','test coverage','no evidence','unverified']

def rows():
    out=[]
    occurrences=defaultdict(int)
    for line in FINDINGS.read_text(encoding='utf-8').splitlines():
        if not line.startswith('| F-'): continue
        parts=[x.strip() for x in line.strip().strip('|').split('|')]
        if len(parts) < 5: continue
        fid,severity=parts[0],parts[1]
        if not re.fullmatch(r'F-\d+\??', fid) or severity not in {'P0','P1','P2'}: continue
        finding='|'.join(parts[2:-2]).strip()
        evidence=parts[-2]
        condition=parts[-1]
        occurrences[fid] += 1
        obs_id = f'{fid}#{occurrences[fid]:02d}'
        out.append({'id':fid, 'observation_id':obs_id, 'severity':severity, 'finding':finding, 'evidence':evidence, 'condition':condition})
    return out

def pick(text, rules, default):
    low=text.lower()
    for name, words in rules:
        if any(w in low for w in words): return name
    return default

def workstream(f): return pick(f['finding']+' '+f['evidence'], WORKSTREAM_RULES, 'platform/identity/audit')
def category(f): return pick(f['finding']+' '+f['condition'], CATEGORY_RULES, 'input/schema validation')
def owner(f): return pick(f['finding']+' '+f['evidence'], OWNER_RULES, 'Backend')
def normalized_severity(group):
    text=' '.join(x['finding']+' '+x['condition'] for x in group).lower()
    if any(w in text for w in P0_RULES): return 'P0'
    if any(w in text for w in ['not executed','unverified','missing test','coverage','observability','documentation','fallback','placeholder','incomplete']): return 'P1'
    return 'P2'
def relation(f, root_size):
    low=(f['finding']+' '+f['condition']).lower()
    if any(w in low for w in ['not executed','unverified','runtime']) : return 'unverified-runtime'
    if any(w in low for w in DECISION_RULES): return 'blocked-by-decision'
    return 'derived-from' if root_size > 1 else 'root'

def main():
    obs=rows()
    groups=defaultdict(list)
    for f in obs: groups[(workstream(f), category(f))].append(f)
    root_items=[]; mapping=[]
    for idx, ((ws,cat), group) in enumerate(sorted(groups.items()),1):
        rid=f'RD-{idx:04d}'
        sev=normalized_severity(group)
        text=' '.join(x['finding'] for x in group[:3])
        journeys=sorted(set(re.findall(r'(?i)(?:patient|provider|admin|catalog|booking|appointment|order|payment|insurance|lab|radiology|home-care|nursing|chat|auth|seo|release|deployment|e2e)', text)))
        dec=any(any(w in (x['finding']+' '+x['condition']).lower() for w in DECISION_RULES) for x in group)
        runtime=any(any(w in (x['finding']+' '+x['condition']).lower() for w in RUNTIME_RULES) for x in group)
        status='BLOCKED_BY_DECISION' if dec else ('BLOCKED_BY_EVIDENCE' if runtime else 'READY_FOR_BUILD')
        if cat in {'financial truth/settlement','state/concurrency/idempotency','privacy/authorization','clinical/safety validation'} and status=='READY_FOR_BUILD': status='BLOCKED_BY_EVIDENCE'
        list_name='SECURITY_RELEASE_BLOCKER' if sev=='P0' else ('PRODUCT_DECISION_REQUIRED' if dec else ('RUNTIME_OR_EXTERNAL_VERIFICATION_REQUIRED' if runtime else 'FUNCTIONAL_ROOT_DEFECT'))
        root_items.append({'root_id':rid,'severity':sev,'list':list_name,'workstream':ws,'category':cat,'owner':owner(group[0]),'status':status,'root_cause':f'Cross-cutting {cat} control is inconsistent or not evidenced across the {ws} surface.','journeys':';'.join(journeys) or 'cross-surface','decision':'Required before build' if dec else 'None identified; acceptance must be contract-backed','accepted':'Server-governed behavior, fail-closed authorization/validation, truthful state and redacted evidence; no mocks.','tests':'Owner/stranger/unauth where applicable; replay/concurrency for mutations; negative/error/cleanup; contract and runtime evidence as applicable.','observation_count':len(group),'source_paths':';'.join(sorted(set(re.findall(r'`([^`]+)`', ' '.join(x['evidence'] for x in group))))[:20])})
        for f in group:
            mapping.append({'observation_id':f['observation_id'],'original_f_id':f['id'],'root_id':rid,'relation':relation(f,len(group)),'observation_severity':f['severity'],'normalized_severity':sev,'workstream':ws,'category':cat,'owner':owner(f),'source_evidence':f['evidence'],'finding':f['finding']})
    fields=['observation_id','original_f_id','root_id','relation','observation_severity','normalized_severity','workstream','category','owner','source_evidence','finding']
    with OUT_TSV.open('w',encoding='utf-8',newline='') as fp:
        w=csv.DictWriter(fp,fieldnames=fields,delimiter='\t',lineterminator='\n'); w.writeheader(); w.writerows(mapping)
    counts=Counter(x['severity'] for x in obs); norm=Counter(x['severity'] for x in root_items); lists=Counter(x['list'] for x in root_items); statuses=Counter(x['status'] for x in root_items)
    lines=['# NABD Normalized Remediation Backlog — 2026-08-25','', '> This is an audit-only normalization of the confirmed findings register. It does not delete evidence, change the baseline, authorize remediation, or claim runtime verification.','', '## Counts before and after normalization','', '| Measure | Count |','|---|---:|',f'| Raw observations | {len(obs)} |',f'| Raw P0/P1/P2 | {counts["P0"]}/{counts["P1"]}/{counts["P2"]} |',f'| Root defects | {len(root_items)} |',f'| Normalized P0/P1/P2 | {norm["P0"]}/{norm["P1"]}/{norm["P2"]} |','', 'Each raw F-ID is preserved in the companion TSV; duplicate occurrences are retained as stable `F-ID#NN` observation IDs. Repeated repository/header/config observations are represented as `derived-from`; observations explicitly dependent on runtime evidence use `unverified-runtime`; observations requiring a policy or product decision use `blocked-by-decision`. No raw evidence is deleted or rewritten.','', '## Workstream status','', '| Workstream | Root defects | Status distribution |','|---|---:|---|']
    byws=defaultdict(list)
    for x in root_items: byws[x['workstream']].append(x)
    for ws in sorted(byws):
        c=Counter(x['status'] for x in byws[ws]); dist=', '.join(f'{k}={v}' for k,v in sorted(c.items())); lines.append(f'| {ws} | {len(byws[ws])} | {dist} |')
    lines += ['', '## Four normalized queues','', '| Queue | Root defects | Rule |','|---|---:|---|']
    for q in ['SECURITY_RELEASE_BLOCKER','FUNCTIONAL_ROOT_DEFECT','PRODUCT_DECISION_REQUIRED','RUNTIME_OR_EXTERNAL_VERIFICATION_REQUIRED']:
        lines.append(f'| {q} | {lists[q]} | Disjoint priority queue assigned from normalized severity, decision dependency and runtime evidence. |')
    lines += ['', '## Root defect register','', '| Root ID | Severity | Queue | Workstream | Category | Owner | Status | Observations | Affected journeys | Source paths | Root cause | Decision | Acceptance/tests |','|---|---|---|---|---|---|---|---:|---|---|---|---|']
    for x in root_items:
        lines.append(f'| {x["root_id"]} | {x["severity"]} | {x["list"]} | {x["workstream"]} | {x["category"]} | {x["owner"]} | {x["status"]} | {x["observation_count"]} | {x["journeys"]} | {x["source_paths"]} | {x["root_cause"]} | {x["decision"]} | {x["accepted"]} {x["tests"]} |')
    lines += ['', '## Acceptance rule','', 'A root defect may move to build only after the listed owner, affected journey, server-governed accepted behavior and tests are explicit. Financial, clinical, authorization and state-machine roots remain blocked unless their source of truth and runtime evidence are established. Phase 0C does not execute those tests.','', '## Deliverables','', '- Companion mapping: `NABD_Normalized_Remediation_Backlog_2026-08-25.tsv` (one row for every raw observation occurrence (including duplicate F-IDs)).','- Raw evidence remains in `audit-artifacts/phase0-main-audit/confirmed-findings-v1.md`.','- This normalization is not a remediation plan and does not authorize product changes.']
    OUT_MD.write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print(f'RAW={len(obs)} ROOTS={len(root_items)} RAW_P0={counts["P0"]} RAW_P1={counts["P1"]} RAW_P2={counts["P2"]} NORM_P0={norm["P0"]} NORM_P1={norm["P1"]} NORM_P2={norm["P2"]}')
    print('QUEUES',dict(lists)); print('STATUS',dict(statuses))

if __name__ == '__main__': main()
