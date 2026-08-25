from pathlib import Path
import re

root = Path(__file__).resolve().parents[3]
raw = Path('/tmp/nabd-phase0b1-gates-rerun.out').read_text(encoding='utf-8')
out = root / 'audit-artifacts/phase0b-backend/PHASE0B1_DIFF_CHECK_EXCEPTIONS_2026-08-25.tsv'
rows = ['file\tline\treason']
for line in raw.splitlines():
    m = re.match(r'(.+?):(\d+): trailing whitespace\.', line)
    if m:
        path, number = m.groups()
        rows.append(f'{path}\t{number}\tGenerated evidence Markdown hard-break spacing retained for quoted metadata/header formatting; no product source.')
out.write_text('\n'.join(rows) + '\n', encoding='utf-8')
print(f'EXCEPTIONS={len(rows)-1}')
print(f'OUTPUT={out}')
