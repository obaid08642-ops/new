"""Journey: a lab result's push opens the result, with "discuss with a doctor" (decision 19, issue 338).
  The lab sends the result as provider-app LabDashboard does (POST /labs/bookings/:id/upload-report with the values it
  typed). The patient's notification points at that result (/health/results/:id, payload result_id + discuss), the
  patient can read it (GET /lab-results/:id: the values, the critical flag) and another patient cannot; on the website the
  notification opens /diagnostics/results/:id, which shows the values and links to the doctors.
  Stack: backend :8002, patient-web :3100.
"""
import os
import uuid

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def lab_reports(lab, pat, lab_id):
    """provider-app LabDashboard: accept, register the sample, analyse, send the typed values."""
    import j_lab
    bid, picks = j_lab.patient_books(pat, lab_id)
    if not bid:
        return None
    r = lab.req('PATCH', f'/labs/bookings/{bid}/state', {'state': 'CONFIRMED', 'note': 'accepted_by_lab'})
    step('the lab confirms the booking', r.ok, r)
    r = lab.post('/labs/samples/register', {'lab_order_id': bid, 'barcode': f'SMP-{uuid.uuid4().hex[:8].upper()}', 'tests': [p['id'] for p in picks]})
    step('the sample is registered', r.ok, r)
    sample = next((s for s in lab.get('/labs/samples').items() if s.get('lab_order_id') == bid), None)
    for stage in ('analyzing', 'result_ready'):
        r = lab.req('PATCH', f"/labs/samples/{sample['id']}/stage", {'stage': stage})
        step(f'sample stage -> {stage}', r.ok, r)
    rows = [{'analyte': 'Hemoglobin', 'value': '14.1', 'unit': 'g/dL', 'range': '13-17', 'isCritical': False},
            {'analyte': 'Potassium', 'value': '6.9', 'unit': 'mmol/L', 'range': '3.5-5.1', 'isCritical': True}]
    r = lab.post(f'/labs/bookings/{bid}/upload-report', {'structuredData': rows, 'send_to': 'both'})
    step('the lab sends the result with its values', r.ok and r.get('state') == 'REPORTED', r)
    return bid


def main():
    import j_admin, j_accounts, j_onboarding, j_lab
    admin, _ = j_admin.login()
    j_lab.admin_publishes_tests(admin)
    catalog = [x['id'] for x in Client(None, 'anon').get('/labs/services').items()]
    p = j_onboarding.register_type('lab', {'test_categories': catalog})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    lab = Client(p['token'], 'lab')
    lab_id = lab.get('/provider/me').get('account', 'id')
    acct = j_accounts.app_signup(label='lab-push')
    pat = Client(acct['token'], 'patient')
    other = Client(j_accounts.app_signup(label='lab-push-other')['token'], 'patient')

    journey('decision 19: the result push points at the result')
    bid = lab_reports(lab, pat, lab_id)
    if not bid:
        return
    import time
    note = {}
    for _ in range(10):
        rows = pat.get('/notifications').items()
        note = next((n for n in rows if 'lab_result' in str(n.get('title_key') or n.get('titleKey') or '')), {})
        if note:
            break
        time.sleep(1)
    action = note.get('action') or {}
    route = str(action.get('route') or '')
    rid = route.rsplit('/', 1)[-1] if route.startswith('/health/results/') else ''
    step('the notification opens /health/results/<result>', bool(rid), note or 'no lab_result notification')
    step('it offers "discuss with a doctor" and names the result', rid and rid in str(action.get('payload')) and 'discuss' in str(action), action)
    step('a critical value makes it the critical notification', 'critical' in str(note.get('title_key') or ''), note.get('title_key'))
    if not rid:
        return

    journey('decision 19: the patient reads the result the push opens')
    r = pat.get(f'/lab-results/{rid}')
    entries = r.get('entries') or []
    step('the result answers with the values the lab typed', r.ok and [e.get('name') for e in entries] == ['Hemoglobin', 'Potassium'], r)
    step('the critical value is flagged and the result is critical', r.ok and entries[1].get('flag') == 'critical' and r.get('critical') is True, r)
    r = other.get(f'/lab-results/{rid}')
    step('another patient cannot read it', r.status in (403, 404), r)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web result', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        journey('decision 19 on the web: the result page')
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
        r = web_login(ctx, WEB, acct['email'], acct['password'])
        step('patient signs in on the website', r.ok, f'{r.status}')
        page.goto(f'{WEB}/ar/diagnostics/results/{rid}', wait_until='load', timeout=60000)
        body = page.locator('body').inner_text()
        step('the page shows the values', 'Hemoglobin' in body and '14.1' in body and 'Potassium' in body, body[:300])
        # while the page streams in, React briefly holds a hidden copy of the section: count on the settled page
        try:
            page.wait_for_function('() => document.querySelectorAll(\'a[href="/ar/consultations/doctors"]\').length === 1', timeout=15000)
        except Exception:
            pass
        step('and "discuss the result with a doctor" opens the doctors', page.locator('a[href="/ar/consultations/doctors"]', has_text='ناقش النتيجة مع طبيب').count() == 1, page.url)
        page.goto(f'{WEB}/ar/notifications', wait_until='load', timeout=60000)
        link = page.locator(f'a[href="/ar/diagnostics/results/{rid}"]')
        step('the notification on the website opens that result', link.count() > 0, f'{link.count()} link(s)')
    except Exception as e:
        step('web result flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
