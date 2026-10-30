"""Journey (QA A-11, patient-web in a real browser): notification settings from the website.
  - the patient signs in on the website and opens /ar/settings/notifications;
  - the first notification switch is turned off: the page sends PATCH /api/patient/users/me/notification-settings (2xx);
  - the saved value is read back from the API (GET /users/me/notification-settings, MongoDB-backed account setting);
  - after a reload the switch shows the saved value;
  - the switch is turned back on, the same way, and read back again.
Stack: backend :8002, patient-web (NABD_WEB_JOURNEYS_URL, default :3100). A missing browser or website is a FAIL, never a PASS."""
import json
import os

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def read_row(client, group, key):
    r = client.get('/users/me/notification-settings')
    return r, ((r.body or {}).get(group) or {}).get(key)


def toggle(page, switch_index):
    """Clicks one switch; returns the PATCH response and the (group, key, value) the page sent."""
    with page.expect_response(lambda resp: 'notification-settings' in resp.url and resp.request.method == 'PATCH', timeout=30000) as info:
        page.locator('[role=switch]').nth(switch_index).click()
    body = json.loads(info.value.request.post_data or '{}')
    group, inner = next(iter(body.items()))
    key, value = next(iter(inner.items()))
    return info.value, group, key, value


def main():
    import j_accounts
    from playwright.sync_api import sync_playwright
    from lib import summary

    acct = j_accounts.app_signup(label='web-notif')
    api = Client(acct['token'], 'patient')

    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        journey('account A-11 (web): notification settings from the website')
        r = web_login(ctx, WEB, acct['email'], acct['password'])
        step('the patient signs in on the website', r.status == 200, r.status)
        page.goto(f'{WEB}/ar/settings/notifications', wait_until='load', timeout=60000)
        switches = page.locator('[role=switch]')
        switches.first.wait_for(timeout=30000)
        count = switches.count()
        step('the notification switches are on the page', count > 0, f'{count} switches')

        before = switches.first.get_attribute('aria-checked') == 'true'
        resp, group, key, sent = toggle(page, 0)
        step('the page saves the switch (PATCH notification-settings 2xx)', resp.ok, resp.status)
        r, val = read_row(api, group, key)
        step(f'the API read-back shows {group}.{key} = {sent}', r.ok and val is sent, f'{val}')
        page.reload(wait_until='load')
        page.locator('[role=switch]').first.wait_for(timeout=30000)
        step('after reload the first switch shows the saved value', (page.locator('[role=switch]').first.get_attribute('aria-checked') == 'true') is sent, 'aria-checked')

        resp, group, key, sent_back = toggle(page, 0)
        step('the switch is turned back (PATCH 2xx)', resp.ok and sent_back is before, resp.status)
        r, val = read_row(api, group, key)
        step('the API read-back shows the original value again', r.ok and val is before, f'{val}')
    finally:
        browser.close()
        pw.stop()
    summary()


if __name__ == '__main__':
    main()
