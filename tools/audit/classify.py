import re,json,sys
start=int(sys.argv[1]); lines=open('/tmp/be.log',errors='ignore').read().split('\n')[start:]
lines=[re.sub(r'\x1b\[[0-9;]*m','',l) for l in lines]
ENV=re.compile(r'not implemented yet|NotImplemented|startTransaction|\$ifNull|\$avg|\$first|\$literal|\$near|geoNear|2dsphere|FailedToParse|unknown field|\$unionWith|\$lookup')
res={}
pending=None
for l in lines:
    m=re.search(r'(error)\s*:\s*(.*?)\s*\{"(?:context|code|_message|stack)',l)
    if m and 'Media storage' not in l and 'mail provider' not in l.lower(): pending=m.group(2)[:120]; continue
    if l.startswith('[slow'): continue
    r=re.search(r'\] (GET|POST|PUT|PATCH|DELETE) /api/v1(\S+) 500',l)
    if r:
        key=r.group(1)+' '+re.sub(r'00000000-0000-0000-0000-000000000000',':id',r.group(2).split('?')[0])
        cls='ENV' if pending and ENV.search(pending) else 'REAL'
        res[key]=(cls,pending or '?'); pending=None
real={k:v for k,v in res.items() if v[0]=='REAL'}
print('500s:',len(res),'| REAL:',len(real),'| ENV:',len(res)-len(real))
for k,v in sorted(real.items()): print(' REAL',k,'::',v[1][:110])
json.dump(res,open('/home/claude/aud/classified_500.json','w'),ensure_ascii=False)
