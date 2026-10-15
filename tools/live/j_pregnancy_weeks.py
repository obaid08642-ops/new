"""Journey: the pregnancy week catalogue and "Read this week" (issues #849 / #861, owner decision D).
  The admin fills a pregnancy week (size line, development text, an https image URL on the CDN; TEST data) in
  admin/src/pages/admin/pregnancy-weeks.tsx and publishes an article tagged with that week (content-growth.tsx). A patient whose
  maternity profile is at that week reads the entry and the article from GET /maternity/content; a week the admin has not filled
  answers null (no invented text). The website /ar/maternity draws the size line and links the article.
  Stack: backend :8002, admin BFF :3001, patient-web :3100 (PATIENT_WEB_PORT=3100 tools/live/start-web.sh).
  A missing browser or a missing patient-web is a FAIL, never a PASS.
"""
import datetime
import os
import uuid

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
WEEK = 12


def lmp_for_week(week):
    """A last-period date the backend turns into `week` (maternity.service: ceil(days since LMP / 7))."""
    return (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7 * (week - 1) + 3)).date().isoformat()


def admin_fills_week(admin, tag):
    size_ar = f'بحجم ثمرة الليمون (بيانات اختبار {tag})'
    body = {
        'size_ar': size_ar,
        'size_en': f'About the size of a lime (test data {tag})',
        'development_ar': f'نص تجريبي لنمو الجنين في الأسبوع {WEEK} (بيانات اختبار).',
        'development_en': f'Test development text for week {WEEK} (test data).',
        'image_url': f'https://cdn.nabd.plus/test/pregnancy-weeks/week-{WEEK}.jpg',
        'published': True,
        'reason': 'تعبئة أسبوع حمل لاختبار حي (بيانات اختبار)',
    }
    r = admin.put(f'/admin/admin/maternity/weeks/{WEEK}', body)
    step(f'admin fills and publishes pregnancy week {WEEK} (CDN https image, TEST data)', r.ok and r.get('week') == WEEK and r.get('published') is True, r)
    bad = admin.put(f'/admin/admin/maternity/weeks/{WEEK}', {**body, 'image_url': f'http://cdn.nabd.plus/test/week-{WEEK}.jpg'})
    step('a plain-http image URL is refused (400)', bad.status == 400, bad)
    bad = admin.put('/admin/admin/maternity/weeks/43', body)
    step('week 43 is refused (400)', bad.status == 400, bad)
    r = admin.get('/admin/admin/maternity/weeks')
    rows = r.body if isinstance(r.body, list) else []
    step('the admin list shows the week', r.ok and any(row.get('week') == WEEK and row.get('size_ar') == size_ar for row in rows), r)
    filled = {row.get('week') for row in rows}
    unfilled = next((w for w in range(1, 43) if w not in filled), None)
    return size_ar, unfilled


def admin_publishes_week_article(admin, tag):
    title = f'مقال الأسبوع {WEEK} للاختبار {tag}'
    slug = f'pregnancy-week-{WEEK}-test-{tag}'
    r = admin.post('/admin/admin/cms/articles', {'title_ar': title, 'title_en': f'Week {WEEK} test article {tag}', 'body_ar': 'نص مقال تجريبي (بيانات اختبار).',
                                                 'slug': slug, 'tags': ['pregnancy'], 'pregnancy_week': WEEK, 'reason': 'مقال اختبار لأسبوع الحمل'})
    aid = r.get('id')
    step(f'admin creates an article tagged with pregnancy week {WEEK}', r.ok and aid and r.get('pregnancy_week') == WEEK, r)
    if not aid:
        return None, None
    r = admin.post(f'/admin/admin/cms/{aid}/publish', {'reason': 'نشر مقال اختبار أسبوع الحمل'})
    step('admin publishes the article', r.ok, r)
    return slug, title


def main():
    import j_accounts
    import j_admin
    journey('pregnancy weeks: the admin fills a week and tags an article')
    try:
        admin, _ = j_admin.login()
    except Exception as e:
        step('admin session', False, str(e)[:200])
        return
    tag = uuid.uuid4().hex[:6]
    size_ar, unfilled = admin_fills_week(admin, tag)
    slug, title = admin_publishes_week_article(admin, tag)

    journey(f'pregnancy weeks: a patient at week {WEEK} reads the week and "Read this week"')
    p = j_accounts.app_signup(label='pregnancy-weeks')
    patient = Client(p['token'], 'patient')
    r = patient.post('/maternity/profile', {'is_pregnant': True, 'lmp_date': lmp_for_week(WEEK)})
    step(f'patient sets a pregnancy profile at week {WEEK}', r.ok and r.get('current_week') == WEEK, r)
    r = patient.get('/maternity/content')
    entry = r.get('week_content') or {}
    step('GET /maternity/content answers the week of the profile', r.ok and r.get('week') == WEEK, r)
    step('the entry is the admin\'s (size line and the CDN image)', entry.get('size_ar') == size_ar and str(entry.get('image_url', '')).startswith('https://cdn.nabd.plus/'), r)
    articles = r.get('read_this_week') or []
    step('"Read this week" lists the published article tagged with the week', bool(slug) and any(a.get('slug') == slug for a in articles), r)
    if unfilled is not None:
        r = patient.get(f'/maternity/content?week={unfilled}')
        step(f'an unfilled week ({unfilled}) answers week_content = null (nothing invented)', r.ok and r.get('week') == unfilled and r.get('week_content') is None, r)
    else:
        step('an unfilled week answers null', False, 'every week 1-42 is filled in this database: no unfilled week to check')
    r = patient.get('/maternity/content?week=43')
    step('?week=43 is refused (400)', r.status == 400, r)
    r = Client().get('/maternity/content')
    step('the content needs a signed-in patient (401)', r.status == 401, r)

    journey('pregnancy weeks: the website /ar/maternity draws the week and links the article')
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web maternity week', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        return step('web maternity week', False, f'no chromium: {e}')
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    try:
        r = ctx.request.post(f'{WEB}/api/auth/login', data={'identifier': p['email'], 'password': p['password']})
        step('patient signs in on the website', r.ok, f'{r.status}')
        page = ctx.new_page()
        page.goto(f'{WEB}/ar/maternity?tab=pregnancy', wait_until='load', timeout=60000)
        page.wait_for_selector('#this-week', timeout=30000)
        step('the page shows the week\'s size line', page.locator(f'text={size_ar}').count() > 0, 'size line missing')
        link = page.locator(f'a[href="/ar/articles/{slug}"]') if slug else None
        step('"Read this week" links the article page', bool(link) and link.count() > 0 and page.locator(f'text={title}').count() > 0, 'article link missing')
        if link is not None and link.count():
            link.first.click()
            page.wait_for_url(f'**/ar/articles/{slug}', timeout=30000)
            step('the link opens the article', page.locator(f'text={title}').count() > 0, page.url)
    except Exception as e:
        step('web maternity week', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
