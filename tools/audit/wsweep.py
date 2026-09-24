import json,sys,urllib.request,urllib.error,re
live=json.load(open('/home/claude/aud/live_routes.json'))
B='http://127.0.0.1:8002/api/v1'
tok=sys.argv[1]; label=sys.argv[2]; flt=sys.argv[3]
res=[]
for m,p in live:
    if m not in('POST','PUT','PATCH','DELETE'): continue
    if not re.search(flt,p): continue
    if re.search(r'logout|auth/|webhook|stream',p): continue
    p2=re.sub(r':[A-Za-z_]+','00000000-0000-0000-0000-000000000000',p)
    req=urllib.request.Request(B+p2,data=b'{}',method=m,headers={'authorization':'Bearer '+tok,'content-type':'application/json','x-admin-bff':'next-pages-router','x-admin-device':'auditdevice0123456789abcdef','idempotency-key':'audit-'+str(len(res))})
    try:
        with urllib.request.urlopen(req,timeout=20) as r: code=r.status; body=r.read(200)
    except urllib.error.HTTPError as e: code=e.code; body=e.read(200)
    except Exception as e: code=-1; body=str(e).encode()
    res.append(dict(code=code,m=m,p=p,body=body.decode('utf-8','ignore')[:160]))
json.dump(res,open(f'/home/claude/aud/w_{label}.json','w'))
from collections import Counter
print(label,len(res),Counter(x['code'] for x in res))
for x in res:
    if x['code']>=500 or x['code']==-1 or (x['code'] in (200,201) and x['m']!='GET'): print(' ',x['code'],x['m'],x['p'],x['body'][:90])
