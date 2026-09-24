import re,os,json
root='/home/claude/repo/backend/src/modules'
hits=[]
dec=re.compile(r"@(Get|Post|Put|Patch|Delete)\(([^)]*)\)")
for r,_,fs in os.walk(root):
  for f in fs:
    if not f.endswith('.ts') or f.endswith('.spec.ts'): continue
    p=os.path.join(r,f); s=open(p).read()
    for m in dec.finditer(s):
      i=s.find('{',s.find(')',s.find('(',m.end()+1)))  # method body start approx
      # find method signature end: first '{' after the decorators & signature
      j=m.end(); depth=0; start=None
      k=s.find('\n',j)
      # locate body
      bm=re.compile(r"\)\s*(?::\s*[^{]+)?\{").search(s,m.end())
      if not bm: continue
      b=bm.end(); d=1; e=b
      while e<len(s) and d>0:
        if s[e]=='{': d+=1
        elif s[e]=='}': d-=1
        e+=1
      body=s[b:e-1]
      if len(body)>1500: continue
      uses=re.search(r"this\.|await |\bsvc\b|service|Model|\.find|\.update|\.create|throw ",body)
      lit=re.search(r"return\s*\{|return\s*\[",body)
      comment=re.search(r"(?i)in reality|mock|dummy|fake|placeholder|stub|hardcod|simulat|not implemented|todo",body)
      if (lit and not uses) or comment:
        line=s[:m.start()].count('\n')+1
        hits.append((p.replace('/home/claude/repo/backend/src/modules/',''),line,m.group(1),m.group(2),re.sub(r'\s+',' ',body)[:130],bool(comment)))
print(len(hits))
for h in hits: print(h)
