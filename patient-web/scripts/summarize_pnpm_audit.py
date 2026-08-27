import json
from pathlib import Path
p=Path('/home/ubuntu/nabdah_impl/repo/audit-artifacts/full-audit-20260823/phase9-pnpm-audit.json')
obj=json.loads(p.read_text())
# pnpm audit JSON versions differ; preserve a normalized, small summary.
advisories=[]
for key, value in (obj.get('advisories') or {}).items():
    if isinstance(value, dict):
        advisories.append({'id': value.get('module_name') or key, 'severity': value.get('severity'), 'title': value.get('title'), 'via': value.get('via'), 'fixAvailable': value.get('fixAvailable')})
if not advisories and isinstance(obj.get('packages'), dict):
    for key, value in obj['packages'].items():
        if isinstance(value, dict) and value.get('severity'):
            advisories.append({'id': key, 'severity': value.get('severity'), 'title': value.get('title'), 'via': value.get('via'), 'fixAvailable': value.get('fixAvailable')})
sev={}
for a in advisories: sev[a['severity']]=sev.get(a['severity'],0)+1
out={'total_records':len(advisories),'severity_counts':sev,'records':advisories}
Path('/home/ubuntu/nabdah_impl/repo/audit-artifacts/full-audit-20260823/phase9-pnpm-audit-summary.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'total_records':len(advisories),'severity_counts':sev},ensure_ascii=False))
