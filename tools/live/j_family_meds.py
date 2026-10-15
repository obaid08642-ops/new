"""Journey: a family caregiver and a member's medicines (journeys 67, 68).
  - The group owner writes a medicine reminder for a member (POST /health/reminders with for_member_id) and edits it
    (PATCH); someone outside the family cannot.
  - The member misses a dose (POST /health/reminders/:id/log); the member's record shows the week's doses with the missed
    one (GET /family/member-records/:id), and the caregiver's group says it may manage medicines.
  - On the website (a real browser) the owner's medications page offers "for whom" with the member, and the member page
    shows "this week: 0 taken, 1 missed".
  Stack: backend :8002, patient-web :3100.
"""
import datetime
import hashlib
import os
import uuid

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def main():
    import j_accounts
    owner_acct = j_accounts.app_signup(label='meds-owner')
    owner = Client(owner_acct['token'], 'patient')
    member_acct = j_accounts.app_signup(label='meds-member')
    member = Client(member_acct['token'], 'patient')
    stranger = Client(j_accounts.app_signup(label='meds-stranger')['token'], 'patient')
    member_id = (member_acct.get('user') or {}).get('id') or member.get('/auth/me').get('id')

    journey('journeys 67: the caregiver writes the member\'s reminder')
    owner.post('/family/create', {'name': 'عائلة الأدوية'})
    code = owner.post('/family/invite', {}).get('invite_code')
    r = member.post('/family/join', {'invite_code': code or '', 'relation': 'parent'})
    step('the member joins the family', r.ok, r)
    now_hm = datetime.datetime.utcnow().strftime('%H:%M')
    body = {'medicine_name_ar': 'دواء الضغط', 'dose': '1 قرص', 'times': [now_hm], 'time_zone': 'UTC', 'frequency': 'daily', 'chronic': True, 'for_member_id': member_id}
    r = stranger.post('/health/reminders', body, headers={'Idempotency-Key': f'rem-{uuid.uuid4()}'})
    step('someone outside the family cannot', r.status == 403, r)
    r = owner.post('/health/reminders', body, headers={'Idempotency-Key': f'rem-{uuid.uuid4()}'})
    rid = r.get('id')
    step('the owner writes it for the member', r.ok and rid and r.get('patient_id') == member_id, r)
    if not rid:
        return
    r = owner.req('PATCH', f'/health/reminders/{rid}', {'dose': '2 قرص', 'for_member_id': member_id})
    step('the owner edits it', r.ok and r.get('dose') == '2 قرص', r)
    r = member.get('/health/reminders')
    rows = r.body if isinstance(r.body, list) else r.items()
    step('it is in the member\'s own reminders', any(x.get('id') == rid for x in rows), [x.get('id') for x in rows])
    r = owner.get('/family/my-group')
    g = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('the group says the owner may manage medicines', (g.get('viewer') or {}).get('can_manage_meds') is True, g.get('viewer'))

    journey('journeys 68: the member misses a dose; the caregiver sees it')
    r = member.post(f'/health/reminders/{rid}/log', {'status': 'missed', 'time_key': now_hm}, headers={'Idempotency-Key': f'log-{uuid.uuid4()}'})
    step('the member\'s dose is logged as missed', r.ok, r)
    r = owner.get(f'/family/member-records/{member_id}')
    rec = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    med = next((m for m in (rec.get('meds') or []) if m.get('id') == rid), {})
    step('the record has the week\'s doses with the missed one', med.get('missed_7d') == 1 and med.get('taken_7d') == 0 and (med.get('doses') or [{}])[0].get('status') == 'missed', med)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
        r = web_login(ctx, WEB, owner_acct['email'], owner_acct['password'])
        step('the owner signs in on the website', r.ok, f'{r.status}')
        ref = hashlib.sha256(f'nabd-family-member:{member_id}'.encode()).hexdigest()[:32]
        page.goto(f'{WEB}/ar/family/{ref}', wait_until='load', timeout=60000)
        week = page.get_by_text('هذا الأسبوع: 0 جرعة مأخوذة، 1 فائتة')
        try:
            week.first.wait_for(timeout=30000)
            ok = True
        except Exception:
            ok = False
        step('the member page shows the week\'s doses', ok, page.locator('main').first.inner_text()[:400])
        step('the member page can add a reminder for the member', page.get_by_role('button', name='إضافة تذكير دواء').count() > 0, '')
        page.goto(f'{WEB}/ar/health/medications?tab=all&add=1', wait_until='load', timeout=60000)
        dialog = page.get_by_role('dialog', name='إضافة تذكير')
        dialog.wait_for(timeout=30000)
        sel = dialog.locator('label', has_text='لمن هذا التذكير؟').locator('select')
        step('the add sheet has one "for whom" field', sel.count() == 1, f'{sel.count()} fields, {page.get_by_role("dialog").count()} dialogs')
        opts = sel.first.locator('option').all_inner_texts()
        step('"for whom" offers me and the member', len(opts) >= 2, opts)
    except Exception as e:
        step('web flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
