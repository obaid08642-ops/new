"""Journey (patient-web in a real browser, signed in): the one AI assistant (decisions 7 and 15, issue 326).
  The symptoms mode asks POST /ai/assistant (through the patient proxy) in the page's language, and draws what the server
  decided: a red flag puts the urgent-help page first; a symptom names the specialty and the doctor list opens on it; a
  medicine of our catalogue shows its leaflet and "ask the pharmacist". Every answer carries the server's disclaimer.
  Stack: backend :8002, patient-web :3100.
"""
import os
import uuid

from lib import journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def catalogue_medicine(admin, tag):
    """admin/src/pages/admin/medicines-catalog.tsx saveForm (create) then approve: a medicine with its leaflet text."""
    body = {'name_ar': f'ليفليتول {tag}', 'name_en': f'Leafletol {tag}', 'active_ingredient': f'leaflet-{tag}', 'generic_name': f'leaflet-{tag}',
            'manufacturer': 'Nabd Test', 'brand': 'Leaf', 'category': 'vitamins', 'sub_category': '', 'form': 'tablet', 'strength': '500mg',
            'package_size': '20', 'barcode': '', 'price': 15, 'requires_prescription': False, 'online_exclusive': False, 'images': [], 'image': '',
            'description_ar': 'مسكن', 'description_en': 'pain relief', 'usage_instructions_ar': 'بعد الأكل', 'usage_instructions_en': 'after food',
            'indications_ar': ['تسكين الألم'], 'indications_en': ['Pain relief'], 'contraindications_ar': [], 'contraindications_en': [],
            'warnings_ar': [], 'warnings_en': [], 'side_effects_ar': [], 'side_effects_en': [], 'precautions_ar': [], 'precautions_en': [],
            'reason': 'إنشاء صنف جديد عبر واجهة الإدارة'}
    r = admin.post('/medicines/admin/catalog', body)
    mid = r.get('id')
    step('admin adds a catalogue medicine with its leaflet', r.ok and mid, r)
    if mid:
        r = admin.post(f'/medicines/admin/catalog/{mid}/approve', {'approve': True})
        step('admin publishes it', r.ok, r)
    return mid


def main():
    import j_admin, j_accounts
    admin, _ = j_admin.login()
    tag = uuid.uuid4().hex[:6]
    med_id = catalogue_medicine(admin, tag)
    acct = j_accounts.app_signup(label='assistant')
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web assistant', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    asked = []
    page.on('request', lambda req: asked.append(req.url) if req.method == 'POST' and '/api/patient/ai/' in req.url else None)

    def ask(text):
        page.goto(f'{WEB}/ar/ai?mode=symptoms', wait_until='load', timeout=60000)
        page.locator('textarea').fill(text)
        page.locator('form button[type="submit"]').click()
        page.locator('section[role="alert"], section[role="status"]').first.wait_for(timeout=60000)
        return page.locator('section[role="alert"], section[role="status"]').first

    try:
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
        r = ctx.request.post(f'{WEB}/api/auth/login', data={'identifier': acct['email'], 'password': acct['password']})
        step('patient signs in on the website', r.ok, f'{r.status}')

        journey('decision 15 on the web: a red flag puts urgent help first')
        card = ask('عندي ألم شديد في الصدر')
        step('the question went to the one assistant', any(u.endswith('/api/patient/ai/assistant') for u in asked), asked[-3:])
        links = card.locator('a')
        first = links.first.get_attribute('href') if links.count() else ''
        step('the answer is urgent, and its first action is the urgent-help page', card.get_attribute('role') == 'alert' and first == '/ar/emergency', f"role={card.get_attribute('role')} first={first}")
        step('the answer carries the disclaimer', 'ليست تشخيص' in card.inner_text(), card.inner_text()[:300])

        journey('decision 15 on the web: a symptom opens the doctor list on its specialty')
        card = ask('عندي طفح جلدي وحكة')
        step('the book button opens dermatology', card.locator('a[href="/ar/consultations/doctors?specialty=dermatology"]').count() == 1, card.inner_text()[:300])

        journey('decision 15 on the web: a catalogue medicine shows its leaflet and the pharmacist')
        card = ask(f'ما هو Leafletol {tag}؟')
        text = card.inner_text()
        step('the medicine answer offers "ask the pharmacist"', card.locator('a[href="/ar/pharmacy/chat"]', has_text='اسأل الصيدلي').count() == 1 and bool(med_id), text[:300])
        step('and no "book a consultation" for a medicine question', card.locator('a[href^="/ar/consultations/doctors"]').count() == 0, text[:200])
    except Exception as e:
        step('web assistant flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
