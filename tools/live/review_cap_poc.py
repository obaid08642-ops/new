import sys, json
sys.path.insert(0, '/home/user/new/tools/live')
from lib import Client
from playwright.sync_api import sync_playwright
OUT='/tmp/claude-0/-home-user-new/cb3d4777-aead-53e4-8549-55a9915fadbb/scratchpad/cap/'
p = json.load(open('/tmp/seed/patient.json'))
t = Client().post('/auth/login', {'identifier': p['email'], 'password': p['password']}).get('token')
st = {'cookies': [], 'origins': [{'origin': 'http://localhost:8081', 'localStorage': [
    {'name': '@nabdah_auth_token', 'value': t['accessToken']}, {'name': '@nabdah_refresh_token', 'value': t.get('refreshToken', '')}]}]}
pw = sync_playwright().start(); b = pw.chromium.launch(executable_path='/opt/pw-browsers/chromium')
for name, url, state, vp in [('patient-app(web export)', 'http://localhost:8081/orders', st, (390, 844)),
                             ('provider-app(web export)', 'http://localhost:8082/', None, (390, 844)),
                             ('website', 'http://127.0.0.1:3000/ar', None, (1280, 900)),
                             ('admin', 'http://127.0.0.1:3001/', None, (1280, 900))]:
    ctx = b.new_context(viewport={'width': vp[0], 'height': vp[1]}, locale='ar-SA', storage_state=state)
    ctx.route('**://1.1.1.1/**', lambda r: r.fulfill(status=200, body='{}'))
    pg = ctx.new_page(); errs = []; calls = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:100]))
    pg.on('response', lambda r: calls.append(r.status) if ':8002' in r.url or '/api/' in r.url else None)
    pg.goto(url); pg.wait_for_timeout(6000)
    n = pg.locator('button, [role=button], a, input, [tabindex="0"]').count()
    txt = pg.inner_text('body').replace('\n', ' ')[:90]
    pg.screenshot(path=OUT + name.split('(')[0] + '.png')
    print(f'{name:26} js_errors={len(errs)} api_calls={len(calls)} (>=400: {sum(c>=400 for c in calls)}) interactive={n} | {txt}')
    ctx.close()
b.close(); pw.stop()
