import re,os,sys,json
sys.path.insert(0,'/home/claude/aud'); from match import *
first=set(r['p'].split('/')[1] for r in R if r['p']!='/')
lit=re.compile(r"([`'\"])(/[a-z][a-zA-Z0-9_\-/${}.:?=&]*?)\1")
meth=re.compile(r"\.(get|post|put|patch|delete)\s*(?:<[^>]*>)?\(\s*$")
def scan(dirs,skip=()):
  res=[]
  for d in dirs:
    for r,_,fs in os.walk(d):
      if 'node_modules' in r or any(k in r for k in skip): continue
      for f in fs:
        if not f.endswith(('.ts','.tsx')) or re.search(r'\.(test|spec)\.',f): continue
        p=os.path.join(r,f); s=open(p,errors='ignore').read()
        for m in lit.finditer(s):
          u=m.group(2)
          if u.startswith('/api/v1/'): u=u[7:]
          elif u.startswith('/api/'): continue
          u=norm_client(u)
          seg=u.split('/')[1] if len(u.split('/'))>1 else ''
          if seg not in first or len(u)<3: continue
          pre=s[max(0,m.start()-40):m.start()]
          mm=meth.search(pre); me=mm.group(1).upper() if mm else None
          st,_=match(me or 'GET','/api/v1'+u)
          if me is None and st.startswith('WRONG'): st='OK'
          res.append((st,me,u,p.replace('/home/claude/repo/',''),s[:m.start()].count('\n')+1))
  return res
from collections import Counter
for name,dirs in [('patient-app',['/home/claude/repo/patient-app/src','/home/claude/repo/patient-app/app']),('provider-app',['/home/claude/repo/provider-app/src','/home/claude/repo/provider-app/app']),('patient-web',['/home/claude/repo/patient-web/app','/home/claude/repo/patient-web/lib','/home/claude/repo/patient-web/components','/home/claude/repo/patient-web/components-next'])]:
  res=scan(dirs)
  print('=====',name,Counter(x[0].split(':')[0] for x in res))
  seen=set()
  for x in res:
    if x[0]!='OK' and (x[0],x[2]) not in seen:
      seen.add((x[0],x[2])); print(' ',x)
