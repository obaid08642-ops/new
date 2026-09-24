import os,re,json,sys
base=sys.argv[1]; out=[]
api=re.compile(r"(apiFetch|client\.(get|post|put|patch|delete)|HttpClient\.|useQuery|useMutation|use[A-Z]\w*(Query|Mutation)\b|fetch\(|axios|dispatch\(|api\.)")
for r,_,fs in os.walk(base):
  if 'node_modules' in r: continue
  for f in fs:
    if not f.endswith('.tsx') or f.startswith('_') or f.startswith('+'): continue
    p=os.path.join(r,f); s=open(p,errors='ignore').read(); L=s.count('\n')
    hooks=set(re.findall(r"\buse[A-Z]\w+",s))
    has_api=bool(api.search(s)) or any(h.endswith(('Query','Mutation','Data','Fetch')) for h in hooks) or bool(re.search(r"from ['\"][^'\"]*(services|api|store|hooks)/",s))
    loading=bool(re.search(r"loading|isLoading|ActivityIndicator|Skeleton|isFetching",s))
    err=bool(re.search(r"\berror\b|isError|catch\s*\(",s))
    empty=bool(re.search(r"length\s*===?\s*0|!\w+\.length|EmptyState|لا توجد|لا يوجد|No \w+ (found|yet)",s,re.I))
    arrays=len(re.findall(r"(?m)^\s*(?:const|let)\s+\w+\s*(?::[^=]+)?=\s*\[\s*\{",s))
    redirect=bool(re.search(r"<Redirect|router\.replace\(\s*['\"`]",s)) and L<40
    out.append(dict(f=p.replace('/home/claude/repo/',''),lines=L,api=has_api,loading=loading,error=err,empty=empty,static_arrays=arrays,redirect=redirect))
json.dump(out,open(sys.argv[2],'w'))
from collections import Counter
print(len(out),'screens')
print('no API usage:',sum(1 for o in out if not o['api'] and not o['redirect']))
print('redirect stubs:',sum(1 for o in out if o['redirect']))
print('API but no loading state:',sum(1 for o in out if o['api'] and not o['loading']))
print('API but no error state:',sum(1 for o in out if o['api'] and not o['error']))
print('with static object arrays:',sum(1 for o in out if o['static_arrays']))
