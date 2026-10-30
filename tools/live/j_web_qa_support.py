"""Journey (QA A-13, patient-web in a real browser): the support chat.
  - the patient signs in on the website and opens /ar/support/chat;
  - the patient types a message in the composer and sends it (the website posts to /api/patient/support/chat, 2xx);
  - MongoDB supportrequests holds the message in the patient's thread (by = patient id, message = the text);
  - GET /support/chat/messages reads the same message back from the patient's side;
  - after a reload the thread still shows the message.
Quick replies, attachments and the ticket page are not covered here.
A missing browser or website is a FAIL, never a PASS."""
import json
import os
import subprocess
import time

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def mongo_json(js):
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', f'JSON.stringify({js})'],
                         capture_output=True, text=True).stdout.strip()
    return json.loads(out) if out and out != 'null' else None


def thread_rows(user_id, text):
    return mongo_json(f'db.supportrequests.find({{thread: {{$elemMatch: {{by: "{user_id}", message: "{text}"}}}}}}, {{_id: 0, channel: 1, status: 1}}).toArray()') or []


def main():
    import j_accounts
    from playwright.sync_api import sync_playwright
    from lib import summary

    acct = j_accounts.app_signup(label='web-support')
    pat = Client(acct['token'], 'patient')
    user_id = pat.get('/auth/me').get('id')
    text = f'QA web support {int(time.time())}'

    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        journey('support A-13 (web): the patient sends a chat message')
        r = web_login(ctx, WEB, acct['email'], acct['password'], path='/api/auth/login')
        step('the patient signs in on the website', r.status == 200, r.status)
        page.goto(f'{WEB}/ar/support/chat', wait_until='load', timeout=60000)
        composer = page.locator('form input[maxlength="2000"]').first
        composer.wait_for(timeout=60000)
        composer.fill(text)
        with page.expect_response(lambda resp: '/api/patient/support/chat' in resp.url and resp.request.method == 'POST', timeout=60000) as info:
            page.locator('form button[type=submit]').first.click()
        resp = info.value
        step('the website posts the message (2xx)', 200 <= resp.status < 300, resp.status)
        step('the sent message appears in the thread', page.get_by_text(text, exact=True).count() > 0, text)
        rows = thread_rows(user_id, text)
        step('MongoDB: the message is in the patient\'s support thread', len(rows) == 1, rows)

        api = pat.get('/support/chat/messages')
        msgs = api.body if isinstance(api.body, list) else (api.body or {}).get('items', (api.body or {}).get('messages', []))
        step('GET /support/chat/messages reads it back from the patient', api.ok and any(m.get('body') == text and m.get('from') == 'patient' for m in msgs), api.status)

        page.reload(wait_until='load')
        page.locator('form input[maxlength="2000"]').first.wait_for(timeout=60000)
        step('after reload the thread still shows the message', page.get_by_text(text, exact=True).count() > 0, text)
    finally:
        browser.close()
        pw.stop()
    summary()


if __name__ == '__main__':
    main()
