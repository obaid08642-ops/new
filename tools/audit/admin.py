import re,os,json,sys
sys.path.insert(0,'/home/claude/aud'); from match import *
root='/home/claude/repo/admin/src'
call=re.compile(r"(apiFetch|fetchWithAdminGuard|adminFetch|adminMutation)(?:<[^>]*>)?\(\s*([`'\"])(.*?)\2",re.S)
def proxy(dec):
    up='/api/v1/admin/'+'/'.join(dec)
    mp={'support','medicines','storage','insurance','emergency','legal','ai','labs','radiology','nursing'}
    if dec[0]=='providers':
        up='/api/v1/providers/provider-deltas/'+'/'.join(dec[2:]) if len(dec)>1 and dec[1]=='provider-deltas' else '/api/v1/admin/providers/'+'/'.join(dec[1:])
    elif dec[0] in mp:
        stay=(dec[0]=='insurance' and len(dec)>1 and dec[1] in('stats','requests')) or (dec[0]=='nursing' and len(dec)>1 and dec[1]=='requests')
        up=('/api/v1/admin/' if stay else '/api/v1/')+'/'.join(dec)
    if dec[0]=='ambulance' and len(dec)>1 and dec[1]=='fleet': up='/api/v1/admin/'+'/'.join(dec)
    if dec[0]=='locations' and len(dec)>1: up='/api/v1/locations/'+'/'.join(dec[1:])
    for k in ['community','loyalty','auth','support-session','system-health']:
        if dec[0]==k: up=f'/api/v1/{k}/'+'/'.join(dec[1:])
    if dec[0] in('chat','chats'): up=f'/api/v1/{dec[0]}/'+'/'.join(dec[1:])
    if dec[0]=='search' and len(dec)>1 and dec[1]=='intent': up='/api/v1/search/intent'
    if dec[0] in('provider-onboarding','nabd-extensions') and len(dec)>1 and dec[1]=='admin': up=f'/api/v1/{dec[0]}/admin/'+'/'.join(dec[2:])
    return up
def bff(u):
    if u.startswith('/api/admin/'): return u[len('/api/admin/'):]
    if u.startswith('/api/v1/admin/'): return u[len('/api/v1/admin/'):]
    if u.startswith('/admin/'): return u[len('/admin/'):]
    if u.startswith('/api/'): return None
    if u.startswith('/'): return u[1:]
    return None
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
        b=bff(u)
        if b is None: out.append(('NON_BFF',meth,u,p,s[:m.start()].count('\n')+1)); continue
        dec=[x for x in b.split('/') if x]
        if not dec: continue
        up=proxy(dec)
        st,_=match(meth,up)
        out.append((st,meth,u+' -> '+up,p.replace('/home/claude/repo/',''),s[:m.start()].count('\n')+1))
from collections import Counter
print(Counter(o[0].split(':')[0] for o in out))
for o in out:
    if o[0]!='OK': print(o)
