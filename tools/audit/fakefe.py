import re,os,sys
pats={
 'fallback_number': r"(\|\||\?\?)\s*\d{2,}(\.\d+)?\b(?!\s*(px|ms|%|\)|,\s*\d))",
 'math_random': r"Math\.random\(",
 'mock_word': r"(?i)\b(mock|dummy|fake|lorem|sample[A-Z_]|demo[A-Z_]|placeholderData|seedData)\w*",
 'fake_person': r"(محمد أحمد|أحمد محمد|سارة|فاطمة|John Doe|Jane|Dr\. Ahmed|د\. أحمد|خالد العتيبي|نورة)",
 'fake_contact': r"(example\.com|05\d{8}|\+9665\d{8}|test@)",
 'static_stat_obj': r"\b(value|count|total|revenue|amount|orders|users|rating)\s*:\s*['\"]?\d[\d,\.]{2,}",
 'fixed_date': r"['\"]20(2[3-6])-\d\d-\d\d",
 'setTimeout_fake': r"setTimeout\([^)]*(setSuccess|setDone|setSaved|Alert|toast|resolve\(\{)",
}
roots=sys.argv[1:]
out={}
for root in roots:
  for r,_,fs in os.walk(root):
    if 'node_modules' in r or '/.next' in r or '__tests__' in r: continue
    for f in fs:
      if not f.endswith(('.tsx','.ts')) or re.search(r'\.(test|spec|d)\.',f) or 'i18n' in r or 'locales' in r: continue
      p=os.path.join(r,f); lines=open(p,errors='ignore').read().split('\n')
      for i,l in enumerate(lines):
        if len(l)>600: l=l[:600]
        for k,rx in pats.items():
          if re.search(rx,l) and not re.search(r'(placeholder=|aria-|className|style=|//\s*eslint)',l[:40]):
            out.setdefault(p.replace('/home/claude/repo/',''),[]).append((i+1,k,l.strip()[:120]))
from collections import Counter
tot=Counter(k for v in out.values() for _,k,_ in v)
print(tot)
for p,v in sorted(out.items(),key=lambda x:-len(x[1]))[:int(os.environ.get('TOP','40'))]:
  print(f"## {p} ({len(v)})")
  for i,k,l in v[:int(os.environ.get('PER','4'))]: print(f"   {i} [{k}] {l}")
