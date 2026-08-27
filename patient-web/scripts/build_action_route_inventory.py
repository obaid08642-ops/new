from __future__ import annotations
import csv,re
from pathlib import Path

M=Path('/home/ubuntu/nabdah_review/extracted/mobile'); W=Path('/home/ubuntu/nabdah_impl/repo'); O=W/'audit-artifacts/comprehensive-audit-20260823'; O.mkdir(parents=True,exist_ok=True)
EXT={'.ts','.tsx','.js','.jsx'}

def scan(root: Path, prefix: str):
    rows=[]
    for p in sorted(x for x in root.rglob('*') if x.is_file() and x.suffix in EXT and 'node_modules' not in x.parts):
        text=p.read_text(errors='ignore')
        for i,line in enumerate(text.splitlines(),1):
            kind=None; target=''
            if re.search(r'onPress\s*=',line): kind='button/onPress'
            elif re.search(r'onSubmit',line): kind='form/onSubmit'
            elif re.search(r'Alert\.alert',line): kind='dialog/alert'
            elif re.search(r'Linking\.openURL',line): kind='external/openURL'
            elif re.search(r'router\.(push|replace)|navigation\.(navigate|push|replace|goBack|pop|reset)',line): kind='navigation'
            elif re.search(r'<(Stack|Tab|Drawer)\.Screen',line): kind='screen-registration'
            elif re.search(r'fetch\(|axios\.|apiFetch\(|HttpClient\.',line): kind='api-call'
            if kind:
                for pat in [r'router\.(?:push|replace)\(([^)]*)',r'navigation\.(?:navigate|push|replace)\(([^)]*)',r'apiFetch\(([^,)]*)',r'fetch\(([^,)]*)',r'HttpClient\.(?:get|post|put|patch|delete)\(([^,)]*)',r'axios\.(?:get|post|put|patch|delete)\(([^,)]*)']:
                    m=re.search(pat,line)
                    if m: target=m.group(1).strip(); break
                rows.append({'surface':prefix,'file':str(p.relative_to(root)),'line':i,'kind':kind,'target_or_expression':target,'source':line.strip()})
    return rows

mobile=scan(M,'mobile'); web=scan(W/'app','web-app')+scan(W/'components-next','web-components')
fields=['surface','file','line','kind','target_or_expression','source']
for name,rows in [('mobile_action_route_inventory.tsv',mobile),('web_action_route_inventory.tsv',web)]:
    with (O/name).open('w',encoding='utf-8',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields,delimiter='\t'); w.writeheader(); w.writerows(rows)
print({'mobile_action_route_rows':len(mobile),'web_action_route_rows':len(web)})
