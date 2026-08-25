from pathlib import Path
import re

root=Path('/tmp/nabd-main-audit')
raw=Path('/tmp/nabd-phase0d-diffcheck-final.out')
out=root/'audit-artifacts/phase0d/PHASE0D_DIFF_CHECK_EXCEPTIONS_2026-08-25.tsv'
rows=['file\tline\treason']
for line in raw.read_text(encoding='utf-8',errors='replace').splitlines():
    m=re.match(r'(.+?):(\d+): trailing whitespace\.',line)
    if m:
        rows.append(f'{m.group(1)}\t{m.group(2)}\tTrailing whitespace is inside a quoted baseline/source excerpt retained in audit evidence; audit artifact only, not product source.')
out.write_text('\n'.join(rows)+'\n',encoding='utf-8')
print(f'EXCEPTIONS={len(rows)-1}')
print(f'OUTPUT={out}')
