import os,re,json,sys,urllib.request,urllib.error
app=sys.argv[1]; tok=open(sys.argv[2]).read().strip(); label=sys.argv[3]
roots=sys.argv[4].split(',')
B='http://127.0.0.1:8002/api/v1'
lit=re.compile(r"(apiFetch|client\.get|http\.get|api\.get|fetchJson|get)\s*(?:<[^>]*>)?\(\s*([`'\"])(/[a-z][^`'\"]*)\2")
cache={}; out=[]
def call(p):
    if p in cache: return cache[p]
    try:
        with urllib.request.urlopen(urllib.request.Request(B+p,headers={'authorization':'Bearer '+tok}),timeout=15) as r: c=r.status; b=r.read(200).decode('utf-8','ignore')
    except urllib.error.HTTPError as e: c=e.code; b=e.read(200).decode('utf-8','ignore')
    except Exception as e: c=-1; b=str(e)
    cache[p]=(c,b); return cache[p]
for root in roots:
  for r,_,fs in os.walk(root):
    if 'node_modules' in r: continue
    for f in fs:
      if not f.endswith('.tsx'): continue
      p=os.path.join(r,f); s=open(p,errors='ignore').read()
      calls=[]
      for m in lit.finditer(s):
        u=m.group(3)
        if u.startswith('/api/v1'): u=u[7:]
        tail=s[m.end():m.end()+120]
        if re.search(r"method:\s*['\"](POST|PUT|PATCH|DELETE)",tail): continue
        u=re.sub(r'\$\{[^}]*\}','00000000-0000-0000-0000-000000000000',u)
        calls.append(u.split('`')[0])
      if not calls: continue
      res=[(u,)+call(u) for u in dict.fromkeys(calls)]
      bad=[x for x in res if x[1]>=500 or (x[1]==404 and 'Cannot GET' in x[2]) or x[1]==-1]
      out.append(dict(screen=p.replace('/home/claude/repo/',''),calls=len(res),bad=[(x[0],x[1],x[2][:80]) for x in bad],forbidden=[x[0] for x in res if x[1]==403]))
json.dump(out,open(f'/home/claude/aud/screenapi_{label}.json','w'),ensure_ascii=False)
nb=[o for o in out if o['bad']]; nf=[o for o in out if o['forbidden']]
print(label,'screens with GET calls:',len(out),'| broken data calls:',len(nb),'| 403:',len(nf))
for o in nb: print(' ',o['screen'],[(b[0][:60],b[1]) for b in o['bad'][:3]])
print('--403 screens:')
for o in nf: print(' ',o['screen'],o['forbidden'][:3])
