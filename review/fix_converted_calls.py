from pathlib import Path
import re
root = Path(__file__).resolve().parents[1] / 'admin/src/pages/admin'
for path in [root / name for name in ['ambulance-fleet.tsx','config-portal.tsx','dashboard.tsx','financial-ledger.tsx','fraud-monitoring.tsx','provider-moderation.tsx']]:
    text = path.read_text()
    text = re.sub(r'fetchWithAdminGuard`([^`]+)`', r'fetchWithAdminGuard(`\1`)', text)
    text = text.replace('fetchWithAdminGuard`', 'fetchWithAdminGuard(`')
    # The previous regex covers complete template calls; this normalizes remaining whitespace only.
    text = '\n'.join(line.rstrip() for line in text.splitlines()) + '\n'
    path.write_text(text)
    print(path)
