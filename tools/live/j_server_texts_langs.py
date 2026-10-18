"""Journey: server-sent texts follow the page language (issue 1585).
  - GET /users/me/storage names its items by stable key (uploaded_prescriptions, medical_reports), with no Arabic text.
  - GET /support/faqs: the admin writes a FAQ (TEST data; there are no built-in questions); every FAQ has an English question.
  - On the website (a real browser, signed in): /en/settings/privacy?tab=data shows the storage items in English and
    /en/settings/help shows the FAQ questions in English; neither has Arabic letters in those items.
  Stack: backend :8002, patient-web :3100.
"""
import os
import re

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
ARABIC = re.compile('[؀-ۿ]')


def main():
    import j_accounts
    acct = j_accounts.app_signup(label='server-texts')
    me = Client(acct['token'], 'patient')
    import j_admin
    admin, _ = j_admin.login()

    journey('issue 1585: the server sends keys and six-language FAQs')
    r = me.get('/users/me/storage')
    body = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    items = body.get('items') or []
    step('storage items come by stable key', r.ok and [i.get('key') for i in items] == ['uploaded_prescriptions', 'medical_reports'], items)
    # Only the legacy `label`, kept for app builds already installed, may still carry Arabic.
    bare = {**body, 'items': [{k: v for k, v in i.items() if k != 'label'} for i in items]}
    step('the storage reply has no Arabic text outside the legacy label', not ARABIC.search(str(bare)), bare)
    r = admin.post('/support/admin/faqs', {'question_ar': 'كيف أغيّر لغة التطبيق؟', 'question_en': 'How do I change the app language?',
                                           'answer_ar': 'من الإعدادات ثم اللغة.', 'answer_en': 'Open Settings, then Language.', 'sort': 1})
    step('admin writes a FAQ in Arabic and English (TEST data)', r.ok and r.get('id'), r)
    r = me.get('/support/faqs')
    faqs = r.body if isinstance(r.body, list) else r.items()
    step('there are FAQs', r.ok and len(faqs) > 0, r)
    english = [str(f.get('question_en') or '') for f in faqs]
    step('every FAQ has an English question without Arabic letters', all(q and not ARABIC.search(q) for q in english), english)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='en-US', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        page.goto(f'{WEB}/en', wait_until='load', timeout=60000)
        r = web_login(ctx, WEB, acct['email'], acct['password'])
        step('the patient signs in on the website', r.ok, f'{r.status}')

        journey('issue 1585: /en/settings/privacy?tab=data')
        page.goto(f'{WEB}/en/settings/privacy?tab=data', wait_until='load', timeout=60000)
        main_el = page.locator('main').first
        try:
            page.get_by_text('Uploaded prescriptions').first.wait_for(timeout=30000)
            shown = True
        except Exception:
            shown = False
        text = main_el.inner_text()
        step('the storage items show in English', shown and 'Medical reports' in text, text[:400])
        step('no Arabic storage label on the English page', 'الوصفات المرفوعة' not in text and 'التقارير الطبية' not in text, text[:400])

        journey('issue 1585: /en/settings/help')
        page.goto(f'{WEB}/en/settings/help', wait_until='load', timeout=60000)
        main_el = page.locator('main').first
        try:
            page.get_by_text(english[0]).first.wait_for(timeout=30000) if english and english[0] else None
            shown = bool(english and english[0])
        except Exception:
            shown = False
        text = main_el.inner_text()
        step('the FAQ questions show in English', shown and all(q in text for q in english), text[:400])
        arabic_q = [str(f.get('question') or f.get('question_ar') or '') for f in faqs]
        step('no Arabic FAQ question on the English page', not any(q and q in text for q in arabic_q), [q for q in arabic_q if q in text])
        lines = [ln for ln in text.splitlines() if any(q and q in ln for q in english)]
        step('the FAQ items have no Arabic letters', lines and not any(ARABIC.search(ln) for ln in lines), lines)
    except Exception as e:
        step('web flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
