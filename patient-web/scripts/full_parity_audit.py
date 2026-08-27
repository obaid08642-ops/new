from __future__ import annotations
import json, re
from pathlib import Path

MOBILE=Path('/home/ubuntu/nabdah_review/extracted/mobile')
WEB=Path('/home/ubuntu/nabdah_impl/repo')
OUT=WEB/'audit-artifacts/full-audit-20260823'
OUT.mkdir(parents=True, exist_ok=True)
EXT={'.ts','.tsx','.js','.jsx'}

def files(root): return [p for p in root.rglob('*') if p.is_file() and p.suffix in EXT and 'node_modules' not in p.parts]
def write(name, text): (OUT/name).write_text(text, encoding='utf-8')

mobile_files=files(MOBILE)
web_files=files(WEB/'app')+files(WEB/'components-next')+files(WEB/'lib')
nav=[]; actions=[]; api=[]
for p in mobile_files:
    s=p.read_text(errors='ignore')
    for i,line in enumerate(s.splitlines(),1):
        if re.search(r'navigation\.(navigate|push|replace|goBack|pop|reset)|<Stack\.Screen|<Tab\.Screen|<Drawer\.Screen|router\.(push|replace)',line): nav.append(f'{p.relative_to(MOBILE)}\t{i}\t{line.strip()}')
        if re.search(r'onPress\s*=|onSubmit|Alert\.alert|Linking\.openURL|dispatch\(',line): actions.append(f'{p.relative_to(MOBILE)}\t{i}\t{line.strip()}')
        if re.search(r'fetch\(|axios\.|API_BASE|/api/v1/|/api/',line): api.append(f'{p.relative_to(MOBILE)}\t{i}\t{line.strip()}')
write('mobile_navigation_actions.tsv','kind\tfile\tline\ttext\n'+'\n'.join('navigation\t'+x for x in nav)+'\n'+'\n'.join('action\t'+x for x in actions))
write('mobile_api_calls.tsv','file\tline\ttext\n'+'\n'.join(api))

web_routes=[]
for p in sorted((WEB/'app').rglob('*')):
    if p.name=='page.tsx': web_routes.append('/'+str(p.parent.relative_to(WEB/'app')).replace('[locale]','[locale]').replace('/','/'))
    if p.name=='route.ts': web_routes.append('API /'+str(p.parent.relative_to(WEB/'app')).replace('/','/'))
write('web_routes.txt','\n'.join(web_routes))
web_api=[]
for p in web_files:
    s=p.read_text(errors='ignore')
    for i,line in enumerate(s.splitlines(),1):
        if re.search(r'getPublic|callPatientApi|fetch\(.*api/|patientApiUrl|/api/',line): web_api.append(f'{p.relative_to(WEB)}\t{i}\t{line.strip()}')
write('web_api_usage.tsv','file\tline\ttext\n'+'\n'.join(web_api))

# Count non-empty route directories and source breadth.
summary={
 'mobile_source_files':len(mobile_files),
 'mobile_navigation_lines':len(nav),
 'mobile_action_lines':len(actions),
 'mobile_api_lines':len(api),
 'web_source_files':len(web_files),
 'web_routes':len(web_routes),
 'web_api_usage_lines':len(web_api),
}
write('summary.json',json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
