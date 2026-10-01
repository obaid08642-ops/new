import re,os,json,sys
sys.path.insert(0,'/home/claude/aud'); from match import *
root='/home/claude/repo/admin/src'
call=re.compile(r"(apiFetch|fetchWithAdminGuard|adminFetch|adminMutation)(?:<[^>]*>)?\(\s*([`'\"])(.*?)\2",re.S)
def upstream(u):
    # mirrors admin/src/utils/api.ts toBffUrl, then the BFF's 1:1 map /api/admin/<x> -> /api/v1/<x> (R6-2)
    if u.startswith('/api/v1/admin/'): u='/api/admin/'+u[len('/api/v1/admin/'):]
    elif u.startswith('/admin/'): u='/api/admin/'+u[len('/admin/'):]
    elif u.startswith('/api/') and not u.startswith('/api/admin/'): return None
    elif not u.startswith('/api/'): u='/api/admin'+u
    return '/api/v1/'+u[len('/api/admin/'):]
out=[]
for r,_,fs in os.walk(root):
  for f in fs:
    if not f.endswith(('.ts','.tsx')): continue
    p=os.path.join(r,f); s=open(p).read()
    for m in call.finditer(s):
        u=norm_client(m.group(3)); tail=s[m.end():m.end()+400]
        mm=re.search(r"method:\s*['\"](\w+)",tail.split(');')[0]) or (re.match(r"\s*,\s*['\"](\w+)",tail) if m.group(1)=='adminMutation' else None)
        meth=(mm.group(1).upper() if mm else 'GET')
        if u.startswith(':x'): out.append(('DYNAMIC',meth,u,p,s[:m.start()].count('\n')+1)); continue
        up=upstream(u)
        if up is None: out.append(('NON_BFF',meth,u,p,s[:m.start()].count('\n')+1)); continue
        st,_=match(meth,up)
        out.append((st,meth,u+' -> '+up,p.replace('/home/claude/repo/',''),s[:m.start()].count('\n')+1))
from collections import Counter
print(Counter(o[0].split(':')[0] for o in out))
for o in out:
    if o[0]!='OK': print(o)
