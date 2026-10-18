"""Journey 16.1: AI provider keys are ciphertext at rest and masked in the admin view.

  POST /ai/admin/gateway/provider/:key {api_key}   super admin saves a key (SETTINGS_EDIT)
  GET  /ai/admin/gateway                            the registry the admin page shows
Checked on the RAW document in the journey database (health_db.find_raw), the way someone with database access sees it:
  - the stored value starts with 'enc:' and does not contain the key;
  - a legacy plaintext row (written straight to the database) is still readable and masked from the real key;
  - the admin view shows has_key and a preview of the end of the real key, never the key, never the ciphertext tail;
  - role admin without settings.edit cannot save a key.
Stack: backend :8002 started by start-backend.sh (AI_KEYS_ENC_KEY is set there).
"""
import json
import os
import subprocess

from lib import step, journey
from health_db import find_raw, BACKEND, MONGO, DB

OWNER_EMAIL = os.environ.get('LIVE_OWNER_EMAIL', 'owner@nabd.test')
OWNER_PASSWORD = os.environ.get('LIVE_OWNER_PASSWORD', 'Own3r!Live-Pass')
KEY = 'live-test-key-0123456789-ABCD'
LEGACY = 'legacy-plain-key-9876543210-WXYZ'


def set_raw(provider, api_key):
    code = ("const m=require('mongoose');(async()=>{await m.connect(process.env.MONGO_URL,{dbName:process.env.DB_NAME});"
            f"await m.connection.db.collection('ai_providers').updateOne({{key:{json.dumps(provider)}}},{{$set:{{api_key:{json.dumps(api_key)}}}}});"
            "await m.disconnect();})().catch(e=>{console.error(e);process.exit(1)})")
    r = subprocess.run(['node', '-e', code], cwd=BACKEND, capture_output=True, text=True, timeout=60,
                       env={**os.environ, 'MONGO_URL': MONGO, 'DB_NAME': DB})
    return r.returncode == 0


def row(view, key):
    return next((p for p in (view.get('providers') or []) if p.get('key') == key), {})


def run():
    import j_admin
    gate_web, _ = j_admin.login()

    journey('16.1 a role admin without settings.edit cannot save a key')
    r = gate_web.post('/ai/admin/gateway/provider/deepseek', {'api_key': KEY})
    step('role admin is refused (403)', r.status == 403, r)

    owner, _ = j_admin.login(OWNER_EMAIL, OWNER_PASSWORD)

    journey('16.1 a saved key is ciphertext in the database and masked in the view')
    r = owner.post('/ai/admin/gateway/provider/deepseek', {'api_key': KEY})
    step('super admin saves the key', r.ok, r)
    raw = find_raw('ai_providers', {'key': 'deepseek'}) or {}
    stored = raw.get('api_key') or ''
    step('stored value is enc: ciphertext', stored.startswith('enc:'), stored[:12])
    step('stored value does not contain the key', KEY not in stored, stored[-12:])
    view = owner.get('/ai/admin/gateway')
    d = row(view.body if isinstance(view.body, dict) else {}, 'deepseek')
    step('view shows has_key and the end of the real key', d.get('has_key') is True and d.get('key_preview') == '••••ABCD', d)
    step('the key itself never appears in the response', KEY not in json.dumps(view.body), '')

    try:
        journey('16.1 a legacy plaintext row still works and is masked from the real key')
        # an old release wrote the key as plaintext; the wrapping itself is proven on the raw document in
        # ai-gateway-keys-at-rest.spec.ts, here only the read side is checked on the live stack
        step('plaintext row written', set_raw('deepseek', LEGACY), '')
        view = owner.get('/ai/admin/gateway')
        d = row(view.body if isinstance(view.body, dict) else {}, 'deepseek')
        step('preview is the end of the real key', d.get('key_preview') == '••••WXYZ', d)
        step('legacy value never returned whole', LEGACY not in json.dumps(view.body), '')

    finally:
        r = owner.post('/ai/admin/gateway/provider/deepseek', {'api_key': ''})
        step('journey leaves the provider key cleared', r.ok, r)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
