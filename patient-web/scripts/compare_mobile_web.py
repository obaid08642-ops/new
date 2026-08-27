from __future__ import annotations
import json,re
from pathlib import Path
from collections import Counter,defaultdict
M=Path('/home/ubuntu/nabdah_review/extracted/mobile/app'); W=Path('/home/ubuntu/nabdah_impl/repo/app'); O=Path('/home/ubuntu/nabdah_impl/repo/audit-artifacts/full-audit-20260823'); O.mkdir(parents=True,exist_ok=True)
mobile=[p for p in M.rglob('*') if p.is_file() and p.suffix in {'.tsx','.ts','.jsx','.js'} and '__tests__' not in p.parts]
webpages=[p for p in W.rglob('page.tsx')]
webpaths=['/'+str(p.parent.relative_to(W)).replace('[locale]','[locale]') for p in webpages]

def domain(p):
    parts=p.relative_to(M).parts
    return parts[0] if parts else 'root'

def key(name):
    s=re.sub(r'\[[^]]+\]','',name.lower().replace('.tsx','').replace('.ts',''))
    s=re.sub(r'[^a-z0-9]+','-',s).strip('-')
    return s
web_keys=defaultdict(list)
for x in webpaths: web_keys[key(x.split('/')[-1] or 'home')].append(x)
rows=[]
for p in sorted(mobile):
    rel=p.relative_to(M); k=key(p.name)
    candidates=web_keys.get(k,[])
    s=p.read_text(errors='ignore')
    nav=len(re.findall(r'navigation\.(navigate|push|replace|goBack|pop|reset)|router\.(push|replace)',s))
    acts=len(re.findall(r'onPress\s*=|onSubmit|Alert\.alert|dispatch\(',s))
    methods=Counter(re.findall(r'method\s*:\s*["\'](GET|POST|PUT|PATCH|DELETE)["\']',s))
    rows.append({'mobile_screen':str(rel),'domain':domain(p),'web_candidates':candidates,'nav_markers':nav,'action_markers':acts,'methods':dict(methods),'status':'candidate' if candidates else 'missing_web_candidate'})
(O/'mobile_to_web_screen_map.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
summary={'mobile_app_source_screens':len(mobile),'mobile_domains':dict(Counter(x['domain'] for x in rows)),'with_web_filename_candidate':sum(bool(x['web_candidates']) for x in rows),'without_web_filename_candidate':sum(not x['web_candidates'] for x in rows),'mobile_screens_with_actions':sum(x['action_markers']>0 for x in rows),'mobile_screens_with_mutation_markers':sum(bool(x['methods']) and any(k!='GET' for k in x['methods']) for x in rows)}
(O/'screen_map_summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
for r in rows:
    print(f"{r['status']}\t{r['domain']}\t{r['mobile_screen']}\t{','.join(r['web_candidates'])}")
print(json.dumps(summary,ensure_ascii=False))
