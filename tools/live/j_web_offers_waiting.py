"""Journey (patient-web in a real browser, signed in): offers waiting is never an endless wait (decision 13, issue 332).
  While the order is broadcasting the offers page says which round and how far the search reached (the server's
  `search: {state: expanding, round, radius_km}`); once the last round ends with no offer (the expiry command,
  POST /admin/pharmacy/broadcasts/expire-due) the page says no pharmacy is available, instead of "reviewing".
  The round end is moved into the past in the local TEST database only (no pharmacy answers in a fresh database).
  Stack: backend :8002 (DB_NAME from the queue), patient-web :3100.
"""
import datetime
import os
import subprocess

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def end_round_now(order_id):
    """TEST database only: the current round's end moves into the past, as if its minutes had passed."""
    db = os.environ.get('DB_NAME', '')
    past = (datetime.datetime.utcnow() - datetime.timedelta(minutes=1)).strftime('%Y-%m-%dT%H:%M:%SZ')
    js = f'db.getSiblingDB("{db}").pharmacy_broadcasts.updateOne({{order_id: "{order_id}"}}, {{$set: {{round_expires_at: new Date("{past}")}}}}).modifiedCount'
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', '--eval', js], capture_output=True, text=True, timeout=60)
    return out.stdout.strip()


def main():
    import j_admin, j_accounts, j_pharmacy
    admin, _ = j_admin.login()
    meds = j_pharmacy.admin_adds_medicines(admin)
    acct = j_accounts.app_signup(label='offers-wait')
    pat = Client(acct['token'], 'patient')
    addr = j_pharmacy.patient_address(pat)

    journey('decision 13: the patient sends an order no pharmacy answers')
    draft = {'items': [{'raw_name': meds[0]['name_ar'], 'qty': 1, 'sku': meds[0]['id'], 'intake_source': 'cart'}],
             'delivery_address': {'label': 'المنزل', 'street': addr.get('street') or '', 'city': addr.get('city') or '',
                                  'lat': float(addr.get('lat') or 0), 'lng': float(addr.get('lng') or 0)}, 'prescription_attachments': []}
    key = f'offers-wait-{os.urandom(8).hex()}'
    oid = pat.post('/patient/pharmacy/orders', draft, headers={'Idempotency-Key': key}).get('id')
    r = pat.post(f'/patient/pharmacy/orders/{oid}/submit', {}, headers={'Idempotency-Key': key + '-submit'})
    step('the order is broadcast', r.ok, r)
    r = pat.get(f'/patient/pharmacy/orders/{oid}')
    search = r.get('search') or {}
    step('the server says the search is widening, with its round and radius', search.get('state') == 'expanding' and search.get('radius_km'), search)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web offers', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
        r = ctx.request.post(f'{WEB}/api/auth/login', data={'identifier': acct['email'], 'password': acct['password']})
        step('patient signs in on the website', r.ok, f'{r.status}')
        journey('decision 13 on the web: while the search widens')
        page.goto(f'{WEB}/ar/pharmacy/broadcast-status?orderId={oid}', wait_until='load', timeout=60000)
        body = page.locator('body').inner_text()
        step('the offers page says the round and the radius', 'الجولة' in body and 'كم' in body, body[:300])

        journey('decision 13: every round ends with no offer')
        for _ in range(6):
            end_round_now(oid)
            r = admin.post('/admin/admin/pharmacy/broadcasts/expire-due', {})
            order = pat.get(f'/patient/pharmacy/orders/{oid}')
            if (order.get('search') or {}).get('state') == 'no_pharmacy_available':
                break
        step('the server says no pharmacy is available', (order.get('search') or {}).get('state') == 'no_pharmacy_available' and order.get('governed_state') == 'AUTO_CANCELLED', {k: order.get(k) for k in ('status', 'governed_state', 'search')})

        journey('decision 13 on the web: the end is said, not an endless "reviewing"')
        page.goto(f'{WEB}/ar/pharmacy/broadcast-status?orderId={oid}', wait_until='load', timeout=60000)
        body = page.locator('body').inner_text()
        step('the offers page says no pharmacy is available now', 'لا توجد صيدلية متاحة الآن' in body, body[:300])
        step('and offers the way back to the pharmacy', page.locator('a[href="/ar/pharmacy"]', has_text='العودة إلى الصيدلية').count() > 0, page.url)
        step('it no longer says the pharmacies are reviewing the request', 'الصيدليات القريبة تراجع طلبك' not in body and 'لا توجد عروض بعد' not in body, body[:200])
    except Exception as e:
        step('web offers flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
