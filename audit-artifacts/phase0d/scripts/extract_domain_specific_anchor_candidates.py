from __future__ import annotations
import csv,re,zipfile
from pathlib import Path
ROOT=Path('/tmp/nabd-main-audit'); BASE=ROOT/'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc'
ARCH={'patient-mobile':'nabd_plus_patient_app.zip','patient-web':'nabd-patient-web.zip','provider':'NabdProvider-provider.zip','admin':'web_admin_dashboard.zip','backend':'nabdah-backend.zip'}
DEFS={
 'Pharmacy':(r'(?i)(pharmacy|cart|checkout|offer|order|medicine|prescription)', ['pharmacy','cart','checkout','offer','order','medicine','prescription']),
 'Consultation':(r'(?i)(consult|appointment|booking|doctor|slot|livekit|video)', ['consult','appointment','booking','doctor','slot','livekit','video']),
 'Labs':(r'(?i)(lab|laboratory|result|test)', ['lab','laboratory','result']),
 'Radiology':(r'(?i)(radiology|imaging|xray|x-ray)', ['radiology','imaging','xray','x-ray']),
 'Nursing/Home-care':(r'(?i)(nursing|home-care|home_care|homecare|visit)', ['nursing','home-care','home care','visit']),
 'Identity/OTP/Roles':(r'(?i)(auth|login|register|otp|session|role|permission|logout)', ['auth','login','register','otp','session','role','permission']),
 'Family/Health':(r'(?i)(family|consent|vital|maternity|mental|health)', ['family','consent','vital','maternity','mental','health']),
 'Prescription/Chat/Support':(r'(?i)(prescription|chat|support|community|message|notification)', ['prescription','chat','support','community','message','notification']),
 'Wallet/Insurance/Payment':(r'(?i)(wallet|payment|insurance|refund|invoice|copay|co-pay|ledger)', ['wallet','payment','insurance','refund','invoice','copay','co-pay','ledger']),
 'Settings/Accessibility/Location':(r'(?i)(settings|language|locale|rtl|accessib|map|location|emergency|notification)', ['settings','language','locale','rtl','accessib','map','location','emergency']),
}
def scan(archive,journey,pattern,terms):
 out=[]
 with zipfile.ZipFile(BASE/archive) as z:
  for i in z.infolist():
   if i.is_dir() or not re.search(pattern,i.filename): continue
   try: text=z.read(i).decode('utf-8')
   except UnicodeDecodeError: continue
   for n,line in enumerate(text.splitlines(),1):
    if any(t in line.lower() for t in terms): out.append((i.filename,n,line.strip()[:300]))
 return out
def main():
 rows=[]
 for journey,(pattern,terms) in DEFS.items():
  for surface,archive in ARCH.items():
   for path,line,snippet in scan(archive,journey,pattern,terms):
    rows.append({'journey':journey,'surface':surface,'archive':archive,'member_path':path,'line':line,'snippet':snippet,'anchor_kind':'candidate_only','selection_status':'NOT_SELECTED'})
 out=ROOT/'audit-artifacts/phase0d/PHASE0D_DOMAIN_ANCHOR_CANDIDATES.tsv'
 with out.open('w',encoding='utf-8',newline='') as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0]),delimiter='\t',lineterminator='\n');w.writeheader();w.writerows(rows)
 print('CANDIDATE_ROWS',len(rows))
 from collections import Counter
 print('BY_JOURNEY',dict(Counter(r['journey'] for r in rows)))
 print('BY_SURFACE',dict(Counter(r['surface'] for r in rows)))
if __name__=='__main__': main()
