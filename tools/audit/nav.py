import os,re,sys
def screens(base):
    S=set()
    for r,_,fs in os.walk(base):
        for f in fs:
            if f.endswith('.tsx') and not f.startswith('_') and not f.startswith('+'):
                p=os.path.join(r,f)[len(base)+1:-4]
                p=re.sub(r'\([^)]*\)/?','',p); p=re.sub(r'(^|/)index$','',p)
                S.add('/'+p.strip('/'))
    return S
def m(t,S):
    ts=[x for x in t.split('/') if x]
    for s in S:
        ss=[x for x in s.split('/') if x]
        if len(ss)==len(ts) and all(a==b or (a.startswith('[')) or b==':x' for a,b in zip(ss,ts)): return True
    return False
base=sys.argv[1]; S=screens(base)
pat=re.compile(r"(?:router\.(?:push|replace|navigate)|navigate|href|pathname|Redirect[^>]*href)\s*[=(:]\s*\{?\s*(?:pathname:\s*)?([`'\"])(/[^`'\"]*)\1")
bad={}
for d in sys.argv[1:]:
  for r,_,fs in os.walk(d):
    if 'node_modules' in r: continue
    for f in fs:
      if not f.endswith(('.ts','.tsx')): continue
      p=os.path.join(r,f); s=open(p,errors='ignore').read()
      for mm in pat.finditer(s):
        t=re.sub(r'\$\{[^}]*\}',':x',mm.group(2)).split('?')[0].rstrip('/') or '/'
        if t.startswith('/(') : t=re.sub(r'\([^)]*\)/?','',t)
        if not m(t,S): bad.setdefault(t,[]).append(p.replace('/home/claude/repo/','')+':'+str(s[:mm.start()].count('\n')+1))
print(len(S),'screens; dead nav targets:',len(bad))
for k,v in sorted(bad.items()): print(k,'<-',v[0],('(+%d)'%(len(v)-1) if len(v)>1 else ''))
