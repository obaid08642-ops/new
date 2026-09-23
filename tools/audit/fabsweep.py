# Empty-DB fabrication test: call every GET; flag responses with non-zero metrics when DB has ~no business data
import json,sys,urllib.request,urllib.error,re
live=json.load(open('/home/claude/aud/live_routes.json'))
B='http://127.0.0.1:8002/api/v1'; tok=sys.argv[1]; flt=sys.argv[2]; label=sys.argv[3]
SEEDISH=re.compile(r'locations|regions|cities|districts|catalog|services|packages|specialt|conditions|config|feature-flags|kill-switch|legal|policy|banks|insurance/companies|networks|degrees|rbac|permissions|roles|i18n|languages|seo|sitemap|robots|llms|mcp|openapi|lifecycle|workflow|tools|fields|health|articles|home|faq|tiers|commission|surge|rules|templates|checklist|supplies|questions|categories|modalities|nursing')
out=[]
for m,p in live:
  if m!='GET' or ':' in p or not re.search(flt,p): continue
  req=urllib.request.Request(B+p,headers={'authorization':'Bearer '+tok,'x-admin-bff':'next-pages-router','x-admin-device':'auditdevice0123456789abcdef'})
  try:
    with urllib.request.urlopen(req,timeout=20) as r: code=r.status; body=r.read(4000).decode('utf-8','ignore')
  except urllib.error.HTTPError as e: code=e.code; body=''
  except Exception as e: code=-1; body=''
  if code!=200: continue
  nums=[float(x) for x in re.findall(r'":\s*(-?\d+(?:\.\d+)?)[,}\]]',body) if 1<abs(float(x))<1e9 and not re.match(r'^(19|20)\d\d$',x)]
  if nums and not SEEDISH.search(p):
    out.append((p,len(nums),body[:230].replace('\n',' ')))
json.dump(out,open(f'/home/claude/aud/fab_{label}.json','w'),ensure_ascii=False)
print(label,len(out),'endpoints return non-zero numbers on an empty business DB')
for o in out: print(' ',o[0],'|',o[2][:200])
