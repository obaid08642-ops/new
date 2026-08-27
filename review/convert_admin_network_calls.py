from pathlib import Path
root = Path(__file__).resolve().parents[1] / 'admin/src/pages/admin'
files = [root / name for name in ['ambulance-fleet.tsx','config-portal.tsx','dashboard.tsx','financial-ledger.tsx','fraud-monitoring.tsx','provider-moderation.tsx']]
for path in files:
    text = path.read_text()
    text = text.replace("const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';\n", '')
    text = text.replace("const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';", '')
    replacements = {
        '${API_BASE}/api/v1/admin/': '/api/admin/',
        '${API_BASE}/api/v1/system-health/': '/api/admin/system-health/',
        '${API_BASE}/api/v1/nabd-extensions/admin/': '/api/admin/nabd-extensions/admin/',
        '${API_BASE}/api/v1/providers/provider-deltas': '/api/admin/providers/provider-deltas',
        '`${API_BASE}/api/v1/admin/': '(`/api/admin/',
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    # Restore template literal syntax for the broad replacement if it was hit.
    text = text.replace('(`/api/admin/', '`/api/admin/')
    path.write_text(text)
    print(path)
