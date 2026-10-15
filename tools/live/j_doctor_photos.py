"""Journey: a doctor's photo and clinic photos reach patients (needs-review 2-web#3 issue 401, 2-app#13 issue 395).
  - The doctor adds a photo and a clinic photo in the provider app's registration (POST /storage/upload, then step2
    profile_photo / clinic_images). Those are private file ids; the public doctor (GET /care/doctors/:id) now gives them as
    addresses anyone can open (photo_url, clinicPhotos -> GET /care/doctors/:id/media/:mediaId).
  - Only that doctor's own images are served: another file id through the same route is a 404, and so is an unknown doctor.
  - The website's doctor page draws the photo and the clinic photo through its /api/doctor-media route (real images that load).
  Stack: backend :8002, patient-web :3100.
"""
import os
import urllib.request
import urllib.error

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
API = os.environ.get('NABD_API', 'http://127.0.0.1:8002/api/v1')


def fetch(url):
    """GET without following redirects: (status, content type)."""
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None
    try:
        res = urllib.request.build_opener(NoRedirect).open(url, timeout=20)
        return res.status, res.headers.get('content-type', '')
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get('content-type', '')


def main():
    import j_admin, j_onboarding
    admin, _ = j_admin.login()
    d = j_onboarding.register_type('doctor')
    doctor = Client(d['token'], 'doctor')

    journey('2-web#3 / 2-app#13: the doctor adds a photo and a clinic photo')
    photo = j_onboarding.upload(doctor, 'doctor-photo.png')
    clinic = j_onboarding.upload(doctor, 'clinic.png')
    other = j_onboarding.upload(doctor, 'licence.png')
    r = doctor.post('/provider-onboarding/step2', {'profile_photo': photo, 'clinic_images': [clinic]})
    step('the registration keeps the photo and the clinic photo', r.ok, r)
    j_onboarding.admin_review(admin, d)
    j_onboarding.provider_after_approval(d)
    did = doctor.get('/provider-onboarding/my-profile').get('id')

    journey('2-web#3 / 2-app#13: patients get addresses they can open')
    anon = Client(None, 'anon')
    r = anon.get(f'/care/doctors/{did}')
    body = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    purl, cphotos = body.get('photo_url') or '', body.get('clinicPhotos') or []
    step('the public doctor has a photo address', purl == f'/api/v1/care/doctors/{did}/media/{photo}', purl)
    step('and the clinic photo address (not the private file id)', cphotos == [f'/api/v1/care/doctors/{did}/media/{clinic}'], cphotos)
    origin = API.rsplit('/api/v1', 1)[0]
    status, ctype = fetch(origin + purl)
    step('anyone opens the photo (an image, or a short link to it)', (status == 200 and ctype.startswith('image/')) or status == 302, f'{status} {ctype}')
    status, _ = fetch(f'{API}/care/doctors/{did}/media/{other}')
    step('another file of the doctor is not served', status == 404, status)
    status, _ = fetch(f'{API}/care/doctors/00000000-0000-0000-0000-000000000000/media/{photo}')
    step('nor through another doctor', status == 404, status)

    journey('2-web#3: the website draws the photos')
    status, ctype = fetch(f'{WEB}/api/doctor-media/{did}/{photo}')
    step('the website\'s media route passes the image on', (status == 200 and ctype.startswith('image/')) or status == 302, f'{status} {ctype}')
    status, _ = fetch(f'{WEB}/api/doctor-media/{did}/{other}')
    step('and refuses a file that is not the doctor\'s photo', status == 404, status)
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    page = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844}).new_page()
    try:
        page.goto(f'{WEB}/ar/consultations/doctors/{did}', wait_until='load', timeout=60000)
        img = page.locator(f'img[src="/api/doctor-media/{did}/{photo}"]').first
        img.wait_for(timeout=30000)
        page.wait_for_function('(el) => el.complete', arg=img.element_handle(), timeout=20000)
        step('the doctor page shows the photo (it loads)', img.evaluate('(el) => el.naturalWidth > 0'), img.get_attribute('alt'))
        gallery = page.locator(f'img[src="/api/doctor-media/{did}/{clinic}"]').first
        gallery.scroll_into_view_if_needed(timeout=20000)
        page.wait_for_function('(el) => el.complete', arg=gallery.element_handle(), timeout=20000)
        step('and the clinic photo', gallery.evaluate('(el) => el.naturalWidth > 0'), gallery.get_attribute('alt'))
    except Exception as e:
        step('web flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
