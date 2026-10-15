"""Journey (patient-web in a real browser, signed in): the website writes the logs the app writes (issues 862, 864, 869).
  Water on /nutrition, a mood on /mental-health/mood, baby kicks and a contraction on /maternity, and the baby's growth on
  /maternity?tab=baby, each through the app's own call; then the server's own reads show them.
  Stack: backend :8002, patient-web :3100.
"""
import datetime
import os

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def main():
    import j_accounts
    acct = j_accounts.app_signup(label='web-logs')
    pat = Client(acct['token'], 'patient')
    due = (datetime.date.today() + datetime.timedelta(days=120)).isoformat()
    r = pat.post('/maternity/profile', {'is_pregnant': True, 'due_date': due})
    step('the patient has a pregnancy profile (maternity setup)', r.ok, r)
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web logging', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()

    def submit(form_label, fills, choice=None):
        form = page.get_by_role('form', name=form_label)
        form.wait_for(timeout=30000)
        # the form is interactive once React has hydrated it (its DOM node carries React's fiber key)
        page.wait_for_function("(name) => { const f = [...document.querySelectorAll('form')].find((x) => x.getAttribute('aria-label') === name); return !!f && Object.keys(f).some((k) => k.startsWith('__react')); }", arg=form_label, timeout=30000)
        if choice:
            # the choice is a client button: click until the page (hydrated) marks it pressed
            btn = form.get_by_role('button', name=choice, exact=True)
            for _ in range(10):
                btn.click()
                if btn.get_attribute('aria-pressed') == 'true':
                    break
                page.wait_for_timeout(500)
        for label, value in fills:
            form.get_by_label(label).fill(value)
        form.locator('button[type="submit"]').click()
        done = form.locator('[role="status"], [role="alert"]').first
        done.wait_for(timeout=30000)
        return done.inner_text()

    try:
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
        r = ctx.request.post(f'{WEB}/api/auth/login', data={'identifier': acct['email'], 'password': acct['password']})
        step('patient signs in on the website', r.ok, f'{r.status}')

        journey('issue 869: water is logged on the website')
        page.goto(f'{WEB}/ar/nutrition', wait_until='load', timeout=60000)
        msg = submit('سجّل الماء', [('الكمية (مل)', '350')])
        step('the water form says it was saved', 'تم الحفظ' in msg, msg)
        today = datetime.date.today().isoformat()
        s = pat.get(f'/nutrition/daily-summary?date={today}')
        water = (s.get('water') or {}).get('consumed_ml') if isinstance(s.get('water'), dict) else s.get('water_ml')
        step('the day summary counts the 350 ml', s.ok and float(water or 0) >= 350, s)
        page.goto(f'{WEB}/ar/nutrition', wait_until='load', timeout=60000)
        tile = page.get_by_text('350').first
        try:
            tile.wait_for(timeout=20000)
            shown = True
        except Exception:
            shown = False
        step('the water tile on the page shows the 350 ml (it showed 0 before)', shown, page.locator('main').first.inner_text()[:300])

        journey('issue 864: a mood is logged on the website')
        page.goto(f'{WEB}/ar/mental-health/mood', wait_until='load', timeout=60000)
        msg = submit('سجّل مزاجك', [('الطاقة (1-10، اختياري)', '6')], choice='جيد')
        step('the mood form says it was saved', 'تم الحفظ' in msg, msg)
        rows = pat.get('/mental-health/mood?days=30')
        items = rows.body if isinstance(rows.body, list) else rows.items()
        step('the mood history holds the good mood with energy 6', any(x.get('mood') == 'good' and x.get('energy_level') == 6 for x in items), str(items)[:300])

        journey('issue 862: kicks, a contraction and the baby\'s growth are logged on the website')
        page.goto(f'{WEB}/ar/maternity', wait_until='load', timeout=60000)
        msg = submit('سجّل حركات الجنين', [('عدد الحركات', '12'), ('خلال كم دقيقة', '2')])
        step('the kicks form says it was saved', 'تم الحفظ' in msg, msg)
        msg = submit('سجّل انقباضًا', [('الدقائق منذ الانقباض السابق', '6'), ('مدته بالثواني', '40')])
        step('the contraction form says it was saved', 'تم الحفظ' in msg, msg)
        page.goto(f'{WEB}/ar/maternity?tab=baby', wait_until='load', timeout=60000)
        msg = submit('سجّل نمو الطفل', [('العمر بالأشهر', '2'), ('الوزن (كجم، اختياري)', '5.4')])
        step('the growth form says it was saved', 'تم الحفظ' in msg, msg)
        prof = pat.get('/maternity/profile')
        body = prof.body.get('data', prof.body) if isinstance(prof.body, dict) else {}
        flat = str(body)
        step('the profile holds 12 kicks over 120 seconds', "'count': 12" in flat and '120' in flat, flat[:400])
        step('the profile holds the contraction (360 s apart, 40 s long)', '360' in flat and "'duration_seconds': 40" in flat, flat[:400])
        step('the profile holds month 2 at 5.4 kg', '5.4' in flat, flat[:400])
    except Exception as e:
        step('web logging flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
