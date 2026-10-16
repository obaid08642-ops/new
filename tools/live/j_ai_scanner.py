"""Journey: the AI scanner beside search (owner decision 36, changed 2026-10-16).
  - POST /ai/scan takes one photo; the vision model (through the AI gateway) says pack / barcode / QR / prescription and
    reads name, strength and form; for a pack the closest PUBLIC catalogue medicines come back ranked (a medicine that is
    not public never does); a prescription photo goes through the normal prescription flow (OCR, then the patient upload
    with the photo, kept with the patient's prescriptions) and no purchasable item is returned; an answer that is not the
    strict JSON is refused (422); a photo that is not an image type is refused (400).
  - On the website (a real browser) the scanner button takes a photo file and lists the closest matches.
  The vision provider is the gateway's own registry (ai_providers, base_url): on the TEST database only, the openai entry
  is pointed at a local OpenAI-compatible stand-in (like fake_moyasar for payments) for the run and restored after.
  Stack: backend :8002, patient-web :3100, mongo in the `mongo` container.
"""
import base64
import json
import os
import subprocess
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
DB = os.environ.get('DB_NAME') or 'nabd_live'  # start-backend.sh's default
FAKE_PORT = int(os.environ.get('FAKE_AI_PORT', '9101'))
TAG = uuid.uuid4().hex[:6]
NAME = f'Scanolex{TAG}'
# a 1x1 PNG: the stand-in does not look at the pixels, the backend checks type and size
PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
IMAGE = PNG * 4  # long enough for the backend's minimum
MODE = {'scan': 'pack'}
CALLS = []


def mongo(js):
    """TEST database only."""
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', '--eval', f'const d = db.getSiblingDB("{DB}"); {js}'],
                         capture_output=True, text=True, timeout=60)
    return out.stdout.strip()


class FakeVision(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get('content-length') or 0)) or b'{}')
        content = body.get('messages', [{}])[0].get('content', [])
        prompt = next((c.get('text', '') for c in content if c.get('type') == 'text'), '')
        has_image = any(c.get('type') == 'image_url' for c in content)
        CALLS.append({'prompt': prompt[:60], 'image': has_image, 'model': body.get('model')})
        if 'Extract text from this image' in prompt:
            answer = {'items': [{'medicine_id': None, 'raw_name_string': NAME, 'requested_quantity': 1, 'notes': 'from OCR'}]}
        elif MODE['scan'] == 'garbage':
            answer = 'This looks like a box of medicine.'
        elif MODE['scan'] == 'prescription':
            answer = {'kind': 'prescription', 'name': None, 'strength': None, 'form': None, 'confidence': 0.93}
        else:
            answer = {'kind': 'pack', 'name': NAME, 'strength': '500 mg', 'form': 'tablet', 'confidence': 0.91}
        out = json.dumps({'choices': [{'message': {'content': answer if isinstance(answer, str) else json.dumps(answer)}}]}).encode()
        self.send_response(200)
        self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(out)))
        self.end_headers()
        self.wfile.write(out)


def seed_medicines():
    base = '{is_deleted: false, public_eligibility: true, indexing_eligibility: true, medical_review_status: "approved", category: "medications", price: 12, createdAt: new Date(), updatedAt: new Date()}'
    js = (f'const b = {base}; d.medicines.insertMany(['
          f'{{...b, id: "scan-{TAG}-1", slug: "scan-{TAG}-1", name_en: "{NAME} 500 mg tablets", name_ar: "{NAME} 500", strength: "500 mg", form: "tablet", requires_prescription: false}},'
          f'{{...b, id: "scan-{TAG}-2", slug: "scan-{TAG}-2", name_en: "{NAME} 250 mg syrup", name_ar: "{NAME} 250", strength: "250 mg", form: "syrup", requires_prescription: true}},'
          f'{{...b, id: "scan-{TAG}-3", slug: "scan-{TAG}-3", name_en: "{NAME} hidden", name_ar: "{NAME} hidden", strength: "500 mg", form: "tablet", public_eligibility: false}}'
          ']).insertedIds ? "ok" : "no"')
    return mongo(js)


def point_gateway_at_stand_in():
    """Saves the registry and the mode, then leaves only the openai entry, pointed at the stand-in."""
    saved = mongo('print(EJSON.stringify({p: d.ai_providers.find({}, {_id: 0}).toArray(), m: d.featureflags.findOne({key: "ai_mode"}, {_id: 0})}))')
    mongo('d.ai_providers.updateMany({}, {$set: {enabled: false}});'
          f' d.ai_providers.updateOne({{key: "openai"}}, {{$set: {{key: "openai", enabled: true, api_key: "sk_test_live_journeys", model: "gpt-4o-mini", vision_model: "gpt-4o-mini", priority: 0, daily_quota: 0, used_today: 0, usage_date: "", base_url: "http://127.0.0.1:{FAKE_PORT}/v1"}}}}, {{upsert: true}});'
          ' d.featureflags.updateOne({key: "ai_mode"}, {$set: {key: "ai_mode", value: "auto", pinned_provider: null, enabled: true}}, {upsert: true})')
    return saved


def restore_gateway(saved):
    try:
        data = json.loads(saved.splitlines()[-1]) if saved else {'p': [], 'm': None}
    except Exception:
        data = {'p': [], 'm': None}
    providers = json.dumps(data.get('p') or [])
    mode = json.dumps(data.get('m'))
    mongo(f'd.ai_providers.deleteMany({{}}); const p = EJSON.parse({json.dumps(providers)}); if (p.length) d.ai_providers.insertMany(p);'
          f' const m = EJSON.parse({json.dumps(mode)}); if (m) d.featureflags.replaceOne({{key: "ai_mode"}}, m, {{upsert: true}}); else d.featureflags.deleteOne({{key: "ai_mode"}});'
          f' d.medicines.deleteMany({{id: /^scan-{TAG}-/}})')


def main():
    import j_accounts
    server = ThreadingHTTPServer(('127.0.0.1', FAKE_PORT), FakeVision)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    acct = j_accounts.app_signup(label='ai-scan')
    patient = Client(acct['token'], 'patient')

    journey('decision 36: the AI scanner, set up on the test database')
    step('three test medicines: two public, one not public', seed_medicines() == 'ok')
    saved = point_gateway_at_stand_in()
    step('the gateway registry points its vision provider at the stand-in', '"p"' in saved, saved[:200])
    time.sleep(21)  # the gateway caches its registry for 20 s
    try:
        journey('a pack photo: the closest public catalogue medicines, ranked')
        MODE['scan'] = 'pack'
        r = patient.post('/ai/scan', {'image_base64': f'data:image/png;base64,{IMAGE}'})
        ids = [m.get('id') for m in (r.get('matches') or [])]
        step('the scan answers kind=pack with what the model read', r.ok and r.get('kind') == 'pack' and (r.get('reading') or {}).get('name') == NAME, r)
        step('the same strength and form come first', ids[:2] == [f'scan-{TAG}-1', f'scan-{TAG}-2'], ids)
        step('a medicine that is not public is never offered', f'scan-{TAG}-3' not in ids, ids)
        step('the vision model got the photo through the gateway', any(c['image'] and c['model'] == 'gpt-4o-mini' for c in CALLS), CALLS[-1:])

        journey('a prescription photo: the normal prescription flow, never a purchasable list')
        MODE['scan'] = 'prescription'
        r = patient.post('/ai/scan', {'image_base64': IMAGE, 'mime_type': 'image/png'})
        rx_id = r.get('prescription_id')
        step('the scan answers kind=prescription, saved, with no matches', r.ok and r.get('kind') == 'prescription' and r.get('status') == 'saved' and rx_id and r.get('matches') == [], r)
        step('the client is sent to the prescription order', r.get('route') == f'/pharmacy/rx-order?prescriptionId={rx_id}', r.get('route'))
        mine = patient.get('/prescriptions/mine')
        rows = mine.body if isinstance(mine.body, list) else (mine.get('data') or mine.get('items') or [])
        rx = next((x for x in rows if isinstance(x, dict) and x.get('id') == rx_id), None)
        step('the prescription is with the patient\'s prescriptions, uploaded by the patient, for the pharmacist to review',
             rx is not None and str(rx.get('state', '')).lower() in ('uploaded_by_patient',), rx and {k: rx.get(k) for k in ('id', 'state', 'notes')})
        state = mongo(f'print(d.prescriptions.findOne({{id: "{rx_id}"}})?.upload_image?.startsWith("data:image/png;base64,"))')
        step('the photo is stored with the prescription (health data)', state.endswith('true'), state)

        journey('what the scanner refuses')
        MODE['scan'] = 'garbage'
        r = patient.post('/ai/scan', {'image_base64': IMAGE})
        step('a model answer that is not the strict JSON is 422, never a guess', r.status == 422, r)
        r = patient.post('/ai/scan', {'image_base64': 'data:application/pdf;base64,' + IMAGE})
        step('a file that is not a photo is refused by validation', r.status == 400, r)
        r = Client(None, 'patient').post('/ai/scan', {'image_base64': IMAGE})
        step('signed out it is refused', r.status == 401, r)

        web(acct)
    finally:
        restore_gateway(saved)
        server.shutdown()


def web(acct):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web scan', False, 'python playwright not installed')
    MODE['scan'] = 'pack'
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='en-US', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        journey('decision 36 on the web: a photo file, then the closest matches to pick')
        page.goto(f'{WEB}/en', wait_until='load', timeout=60000)
        r = web_login(ctx, WEB, acct['email'], acct['password'])
        step('the patient signs in on the website', r.ok, f'{r.status}')
        page.goto(f'{WEB}/en/pharmacy/barcode', wait_until='load', timeout=60000)
        page.wait_for_function("() => { const i = document.querySelector('input[type=file]'); return !!i && Object.keys(i).some((k) => k.startsWith('__react')); }", timeout=30000)
        page.locator('input[type=file]').set_input_files(files=[{'name': 'pack.png', 'mimeType': 'image/png', 'buffer': base64.b64decode(PNG)}])
        page.get_by_role('heading', name='Closest matches').wait_for(timeout=60000)
        links = page.locator('#scan-matches ~ ul a')
        step('the closest matches are listed', links.count() == 2, links.count())
        step('the first match opens its product page', f'scan-{TAG}-1' in (links.first.get_attribute('href') or ''), links.first.get_attribute('href'))
        step('the prescription-only match carries the "Needs a prescription" chip', 'Needs a prescription' in links.nth(1).inner_text(), links.nth(1).inner_text())
    except Exception as e:
        step('web scan flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
