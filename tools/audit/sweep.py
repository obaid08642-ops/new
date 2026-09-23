import json,sys,urllib.request,urllib.error,time
R=json.load(open('/home/claude/aud/routes.json'))
B='http://127.0.0.1:8002/api/v1'
tok=sys.argv[1] if len(sys.argv)>1 and sys.argv[1]!='-' else None
label=sys.argv[2] if len(sys.argv)>2 else 'anon'
res=[]; seen=set()
for r in R:
    if r['m']!='GET': continue
    p=r['p']
    p2='/'.join(('00000000-0000-0000-0000-000000000000' if s.startswith(':') else s) for s in p.split('/'))
    if p2 in seen: continue
    seen.add(p2)
    if any(k in p for k in ['stream','sse','events/stream','export','pdf','download']): continue
    req=urllib.request.Request(B+p2,headers={'authorization':'Bearer '+tok} if tok else {})
    t=time.time()
    try:
        with urllib.request.urlopen(req,timeout=20) as resp: code=resp.status; body=resp.read(300)
    except urllib.error.HTTPError as e: code=e.code; body=e.read(300)
    except Exception as e: code=-1; body=str(e).encode()
    res.append(dict(code=code,p=p,f=r['f'],l=r['l'],ms=int((time.time()-t)*1000),body=body.decode('utf-8','ignore')[:200]))
json.dump(res,open(f'/home/claude/aud/sweep_{label}.json','w'))
from collections import Counter
print(label,Counter(x['code'] for x in res))
