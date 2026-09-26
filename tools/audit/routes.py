"""Backend route inventory (static).
  python3 tools/audit/routes.py [out.json]   (from repo root) -> writes the route list, prints the count
  python3 tools/audit/routes.py --dups       -> same METHOD+path declared in more than one file; exit 1 if any
     (Nest serves only the first registered handler; the other one is dead code that looks alive.)
"""
import os,re,json,sys,collections
root='backend/src'
routes=[]
dec=re.compile(r"@(Get|Post|Put|Patch|Delete|All)\(\s*(?:'([^']*)'|\"([^\"]*)\"|`([^`]*)`|\[([^\]]*)\])?")
ctl=re.compile(r"@Controller\(\s*(?:'([^']*)'|\"([^\"]*)\"|\{[^}]*path:\s*'([^']*)'[^}]*\}|\[([^\]]*)\])?\s*\)")
for r,_,fs in os.walk(root):
  for f in fs:
    if not f.endswith('.ts') or f.endswith('.spec.ts'): continue
    p=os.path.join(r,f); s=open(p,encoding='utf-8',errors='ignore').read()
    # split by controller class
    parts=[(m.start(),m) for m in ctl.finditer(s)]
    for i,(pos,m) in enumerate(parts):
      end=parts[i+1][0] if i+1<len(parts) else len(s)
      body=s[pos:end]
      prefs=[m.group(1) or m.group(2) or m.group(3) or '']
      if m.group(4): prefs=re.findall(r"'([^']*)'",m.group(4))
      vm=re.search(r"version:\s*(?:VERSION_NEUTRAL|'([^']*)')",m.group(0))
      for d in dec.finditer(body):
        paths=[d.group(2) or d.group(3) or d.group(4) or '']
        if d.group(5): paths=re.findall(r"'([^']*)'",d.group(5))
        line=s[:pos+d.start()].count('\n')+1
        for pr in prefs:
          for pa in paths:
            full='/'+'/'.join(x.strip('/') for x in [pr,pa] if x.strip('/'))
            routes.append({'m':d.group(1).upper(),'p':full,'f':p,'l':line})
if '--dups' in sys.argv:
  d=collections.defaultdict(list)
  for x in routes:
    d[(x['m'],re.sub(r':[A-Za-z_]+','*',x['p'].rstrip('/') or '/'))].append(f"{x['f'][len(root)+1:]}:{x['l']}")
  dups=sorted((k,v) for k,v in d.items() if len({f.split(':')[0] for f in v})>1)
  print(f"== duplicate routes across files: {len(dups)}")
  for (m,pth),v in dups: print(f"  {m} {pth}  <-  {' | '.join(v)}")
  sys.exit(1 if dups else 0)
json.dump(routes,open(sys.argv[1] if len(sys.argv)>1 else 'routes.json','w'))
print(len(routes))
