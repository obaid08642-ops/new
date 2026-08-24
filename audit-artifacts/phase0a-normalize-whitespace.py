from pathlib import Path
import re

ROOT = Path('/tmp/nabd-main-audit')
DIFF = Path('/tmp/nabd-phase0a-diffcheck.txt')
OUT = ROOT / 'audit-artifacts/phase0-main-audit/NABD_AUDIT_ARTIFACT_WHITESPACE_EXCEPTIONS_2026-08-24.md'

# These files are generated source-excerpt inventories: the trailing spaces are
# part of copied source lines and must not be silently rewritten.
SOURCE_EXCERPT_MARKERS = (
    'truthfulness-security-candidate-scan.txt',
    'truthfulness-context-review.txt',
    'NABD_Contract_Route_Raw_Index_2026-08-24.md',
    'route-consumer-reconciliation-scan.txt',
    'web_admin_dashboard-surface-index.txt',
    'admin-action-api-inventory.txt',
)

issues = []
for line in DIFF.read_text(encoding='utf-8').splitlines():
    m = re.match(r'([^:]+):([0-9]+): (trailing whitespace|new blank line at EOF)\.', line)
    if m:
        issues.append((m.group(1), int(m.group(2)), m.group(3)))

exceptions = []
normalized = []
for rel, lineno, reason in issues:
    if any(marker in rel for marker in SOURCE_EXCERPT_MARKERS):
        exceptions.append((rel, lineno, reason, 'copied source/evidence line; preserved byte-for-byte'))
    else:
        p = ROOT / rel
        normalized.append(rel)

# Strip trailing spaces/tabs and extra blank EOF lines only from non-excerpt
# audit artifacts that were introduced by the audit package itself.
for rel in sorted(set(normalized)):
    p = ROOT / rel
    if not p.exists() or not p.is_file():
        continue
    text = p.read_text(encoding='utf-8')
    lines = text.splitlines()
    text = '\n'.join(line.rstrip(' \t') for line in lines).rstrip('\n') + '\n'
    p.write_text(text, encoding='utf-8')

with OUT.open('w', encoding='utf-8') as f:
    f.write('# Audit artifact whitespace exceptions\n\n')
    f.write('This is a line-specific exception register for `git diff --check origin/main..HEAD`. No global or wildcard exception is used. Non-excerpt audit reports were normalized by removing trailing spaces and extra EOF blank lines.\n\n')
    f.write('| File | Line | Check | Reason for preserving whitespace |\n|---|---:|---|---|\n')
    for rel, lineno, reason, why in exceptions:
        f.write(f'| `{rel}` | {lineno} | {reason} | {why} |\n')
    f.write(f'\n**Exceptions:** {len(exceptions)} line-specific source-evidence lines. **Normalized files:** {len(set(normalized))}.\n')

print(f'issues={len(issues)} exceptions={len(exceptions)} normalized_files={len(set(normalized))}')
print(f'exception_file={OUT}')
