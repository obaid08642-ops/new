import re,os,json
root='/home/claude/repo/admin/src'
call=re.compile(r"(apiFetch|fetchWithAdminGuard|adminFetch|adminMutation)(?:<[^>]*>)?\(\s*([`'\"])(.*?)\2",re.S)
out=[]
for r,_,fs in os.walk(root):
  for f in fs:
    if not f.endswith('.tsx'): continue
    p=os.path.join(r,f); s=open(p).read()
    for m in call.finditer(s):
      tail=s[m.end():m.end()+700]
      mm=re.search(r"method:\s*['\"](POST|PUT|PATCH)",tail) or (re.match(r"\s*,\s*['\"](POST|PUT|PATCH)",tail) if m.group(1)=='adminMutation' else None)
      if not mm: continue
      b=re.search(r"JSON\.stringify\(\s*(\{.*?\}|\w+)\s*\)",tail,re.S)
      body=b.group(1) if b else ''
      keys=re.findall(r"(?:^|[{,]\s*)([a-zA-Z_]\w*)\s*(?=[:,}])",body) if body.startswith('{') else ['<var:'+body+'>']
      out.append(dict(page=p.split('/pages/')[-1],line=s[:m.start()].count('\n')+1,method=mm.group(1),url=re.sub(r'\$\{[^}]*\}',':x',m.group(3))[:80],keys=keys[:14]))
json.dump(out,open('/home/claude/aud/admin_writes.json','w'))
print(len(out),'admin write calls')
for o in out:
  if any(k in o['url'] for k in ['catalog','articles','services','medicines','legal','commission','pricing','price','insurance','loyalty','locations','config','feature','kill']): print(o['page'],o['line'],o['method'],o['url'],o['keys'])
