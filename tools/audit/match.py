import json,re,os,sys
from urllib.parse import quote
R=json.load(open('/home/claude/aud/routes.json'))
def rx(p):
    segs=[s for s in p.split('/') if s]
    return segs
BR=[(r['m'],rx('/api/v1'+r['p']),r) for r in R]
def match(method,path):
    segs=[s for s in path.split('?')[0].split('/') if s]
    best=[]
    for m,bs,r in BR:
        if len(bs)!=len(segs): continue
        ok=True
        for a,b in zip(segs,bs):
            if b.startswith(':') or a==':x' or b=='*': continue
            if a!=b: ok=False;break
        if ok: best.append((m,r))
    if not best: return 'NO_PATH',None
    ms=[m for m,_ in best]
    if method in ms or 'ALL' in ms: return 'OK',best[0][1]
    return 'WRONG_METHOD:'+','.join(sorted(set(ms))),best[0][1]
def norm_client(u):
    u=re.sub(r'\$\{[^}]*\}',':x',u)
    u=u.split('?')[0]
    u=re.sub(r':x:x',':x',u)
    u=re.split(r'\$\{|\s',u)[0]
    segs=[]
    for g in u.split('/'):
        if g!=':x' and ':x' in g: g=g.split(':x')[0]
        segs.append(g)
    return '/'.join(segs).rstrip('/')
