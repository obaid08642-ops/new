"""Journey (patient-web in a real browser + the local LiveKit): a paid video consultation reaches the CONNECTED call
(needs-review 2-web#9, issue 407; owner decision 4 of 2026-10-14: camera/microphone toggles in the call, a real call on
our own LiveKit).
  Stack: backend :8002 started by start-backend.sh (LIVEKIT_* -> the local server), LiveKit :7880 (tools/live/start-livekit.sh),
  admin BFF :3001 (admin API session), patient-web :3100 (start-web.sh, NABD_LIVEKIT_URL -> the local server).
  A missing browser, website or LiveKit is a FAIL, never a PASS.

Two calls, both with the doctor's camera and microphone and the patient's, through the real media server:
  1. The provider-app way (VideoCallRoom.tsx): the doctor checks the patient in, starts the visit, POST /calls/initiate and
     /calls/:id/join; the patient opens the call room on the website (/room/<session>).
  2. The website's own way: the waiting room -> "join" -> the video-call page, whose token
     (GET /unified-bookings/:id/call-token) the backend issues only from 15 minutes before the appointment. The journey
     books the earliest slot the doctor can take and waits on the real clock for that window; nothing is moved in the DB.
The doctor is not a website user, so the doctor's side is a minimal page that runs the same livekit-client build
(patient-web/node_modules) with the token the backend issues to the doctor.
"""
import datetime
import http.server
import os
import threading
import time
import urllib.request

from lib import Client, journey, step, web_login

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
LIVEKIT_WS = os.environ.get('NABD_LIVEKIT_URL') or f"ws://127.0.0.1:{os.environ.get('LIVEKIT_PORT', '7880')}"
LIVEKIT_HTTP = LIVEKIT_WS.replace('wss://', 'https://').replace('ws://', 'http://')
LIVEKIT_UMD = os.path.join(ROOT, 'patient-web', 'node_modules', 'livekit-client', 'dist', 'livekit-client.umd.js')
DOCTOR_PAGE = 'http://127.0.0.1:7999/doctor-call'   # an empty page served by doctor_page_server()
MEDIA_FLAGS = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
QUARTER = datetime.timedelta(minutes=15)


def livekit_up():
    try:
        with urllib.request.urlopen(LIVEKIT_HTTP + '/', timeout=5) as r:
            return r.read().decode().strip() == 'OK'
    except Exception:
        return False


LEAD = QUARTER + datetime.timedelta(seconds=150)   # the backend lists a slot >= 15 min ahead; 150 s to publish the hours and book


def first_bookable_quarter(now):
    """The earliest slot the backend lists (>= 15 min ahead, care/slot.service.ts) on a quarter hour
    (appointments.service.ts), with LEAD - 15 min to publish the hours and book; never across midnight (end > start rule).
    The time is rounded UP to the quarter (seconds included): rounding the minute down first could leave a slot only
    ~15 min 8 s ahead, which the setup (admin 2FA login, onboarding, approval) then pushed under the 15-min cut-off, so
    the slot was never listed ("matrix video+card: free slot")."""
    t = now + LEAD
    if t.second or t.microsecond:
        t = t.replace(second=0, microsecond=0) + datetime.timedelta(minutes=1)
    t += datetime.timedelta(minutes=(-t.minute) % 15)
    # one 30-minute slot (slot.service.ts) must end by 23:59; only then does the window move to tomorrow 00:00
    if (t + datetime.timedelta(minutes=30)).replace(second=0) > t.replace(hour=23, minute=59):
        t = (t + datetime.timedelta(days=1)).replace(hour=0, minute=0)
    return t


def window_end(t):
    """45 minutes after `t`, but never past 23:59 of the same day (the hours rule is end > start on one day)."""
    return min(t + datetime.timedelta(minutes=45), t.replace(hour=23, minute=59))


def doctor_publishes_video_window(doctor, admin, t):
    """j_consultation.doctor_publishes_hours with one 45-minute video window starting at `t` (UTC, as slot.service reads it),
    so the only slot is `t`: the 08:00-18:00 window of tomorrow could never reach the call-token window today."""
    journey('web call: doctor opens a video window (admin approves)')
    end = window_end(t)
    body = {'day_of_week': (t.weekday() + 1) % 7, 'start_time': t.strftime('%H:%M'), 'end_time': end.strftime('%H:%M'), 'service_type': 'video'}
    r = doctor.post('/provider/schedule-slots', body)
    step(f"doctor submits video hours {body['start_time']}-{body['end_time']} UTC", r.ok, r)
    r = admin.get('/admin/admin/providers/provider-deltas')
    pend = [x for x in r.items() if x.get('status') == 'pending']
    step('admin sees the pending schedule change', r.ok and pend, f'{r.status} {[x.get("target") for x in pend][:5]}')
    for x in pend:
        a = admin.post(f"/admin/admin/providers/provider-deltas/{x['id']}/approve", {'reason': 'ساعات الفيديو معتمدة'})
        step(f"admin approves the {x.get('target')} change", a.ok, a)


def setup():
    """Doctor (video only, approved, hours), patient, a paid video appointment the doctor has started. Returns a dict or None."""
    import j_accounts, j_admin, j_consultation, j_onboarding
    journey('web call: setup')
    step('the local LiveKit answers (tools/live/start-livekit.sh)', livekit_up(), LIVEKIT_HTTP)
    try:
        admin, _ = j_admin.login()   # the admin web (BFF) session: every admin path below is the panel's /admin/admin/...
    except Exception as e:
        step('admin api session', False, str(e)[:200])
        return None
    if not admin:
        return None
    specs = Client().get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    prov = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant', 'consultation_modes': ['video']})
    j_onboarding.admin_review(admin, prov)
    j_onboarding.provider_after_approval(prov)
    doctor = Client(prov['token'], 'doctor')   # the token issued after approval
    pat_acct = j_accounts.app_signup(label='web-call-patient')
    pat = Client(pat_acct['token'], 'patient')
    cfg = pat.get('/config')
    step('the backend advertises video calls (LiveKit configured, F37)', cfg.ok and (cfg.get('features') or {}).get('video_calls') is True, cfg)

    t = first_bookable_quarter(datetime.datetime.now(datetime.timezone.utc))
    doctor_publishes_video_window(doctor, admin, t)
    # book_variant books on the day j_consultation.tomorrow() names; here that is the day of `t`.
    j_consultation.tomorrow = lambda: t.date()
    aid = j_consultation.book_variant(pat, doctor, 'video', 'card')
    if not aid:
        return None
    journey('web call: the doctor starts the visit (provider-app LiveConsultationScreen)')
    r = pat.get(f'/care/appointments/{aid}')
    slot = str(r.get('slot_start') or '')
    step('the appointment is the paid video slot the doctor opened', r.ok and r.get('payment_status') == 'paid' and r.get('service_type') == 'video'
         and slot[:16] == t.strftime('%Y-%m-%dT%H:%M'), f'{slot} want {t.isoformat()} {r}')
    q = doctor.get('/provider/jobs/queue?status=incoming&kind=consultation')
    if aid in [j.get('id') for j in (q.body if isinstance(q.body, list) else q.items())]:
        a = doctor.post(f'/provider/jobs/consultation/{aid}/accept', {})
        step('doctor accepts', a.ok, a)
    for action in ('check-in', 'start'):
        r = doctor.req('PATCH', f'/care/appointments/{aid}/{action}', {})
        step(f'doctor: appointment {action}', r.ok, r)
    return {'admin': admin, 'doctor': doctor, 'pat': pat, 'acct': pat_acct, 'aid': aid, 't': t}


# ── the doctor's side: livekit-client in a page of its own ─────────────────────────────────────────────────────────
DOCTOR_JOIN = """async ({ url, token }) => {
  if (window.__room) await window.__room.disconnect();
  const room = new window.LivekitClient.Room();
  window.__room = room;
  await room.connect(url, token);
  await room.localParticipant.enableCameraAndMicrophone();
  return { identity: room.localParticipant.identity, camera: room.localParticipant.isCameraEnabled, mic: room.localParticipant.isMicrophoneEnabled };
}"""
# what the doctor's LiveKit client knows about the patient's tracks (the server relays every mute)
PATIENT_TRACK_MUTED = """([source, muted]) => {
  const room = window.__room; if (!room) return false;
  for (const p of room.remoteParticipants.values()) for (const t of p.trackPublications.values()) if (t.source === source && t.isMuted === muted) return true;
  return false;
}"""
PLAYING = """(sel) => [...document.querySelectorAll(sel)].some((v) => v.srcObject && v.srcObject.getVideoTracks().length > 0 && v.videoWidth > 0)"""


class _DoctorPage(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        body = b'<!doctype html><meta charset="utf-8"><title>doctor</title>'
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def doctor_page_server():
    """A real loopback server for the doctor's page. A page fulfilled by a browser route lives in the 'unknown' address
    space, and Chromium's local-network checks then refuse its requests to the loopback LiveKit."""
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 7999), _DoctorPage)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def doctor_page(browser):
    ctx = browser.new_context(permissions=['camera', 'microphone'])
    page = ctx.new_page()
    page.goto(DOCTOR_PAGE)
    page.add_script_tag(path=LIVEKIT_UMD)
    return ctx, page


def prove_connected_call(page, doc_page, doctor_token, label):
    """The patient's call screen is connected, sees the doctor, and the toggles change the real tracks."""
    page.wait_for_selector('[data-call-state="live"]', timeout=45000)
    step(f'{label}: the call screen reaches the connected state', True)
    page.wait_for_function(PLAYING, arg='[data-tile="local"] video', timeout=30000)
    step(f'{label}: the patient sees their own camera (local tile plays)', True)
    joined = doc_page.evaluate(DOCTOR_JOIN, {'url': LIVEKIT_WS, 'token': doctor_token})
    step(f'{label}: the doctor joins the same room with camera and microphone', joined.get('camera') and joined.get('mic'), joined)
    page.wait_for_selector('[data-tile="remote"][data-participants="1"]', timeout=30000)
    page.wait_for_function(PLAYING, arg='[data-tile="remote"] video', timeout=30000)
    status = page.locator('[data-call-state="live"] [role="status"]').inner_text()
    step(f'{label}: the patient sees the doctor (remote video plays, status "متصل")', 'متصل' in status, status)
    for media, source in (('microphone', 'microphone'), ('camera', 'camera')):
        btn = page.locator(f'button[data-media="{media}"]')
        step(f'{label}: {media} toggle starts on (aria-pressed=true)', btn.get_attribute('aria-pressed') == 'true', btn.get_attribute('aria-pressed'))
        btn.click()
        page.wait_for_selector(f'button[data-media="{media}"][aria-pressed="false"]', timeout=15000)
        doc_page.wait_for_function(PATIENT_TRACK_MUTED, arg=[source, True], timeout=15000)
        step(f'{label}: {media} off -> aria-pressed=false and the doctor sees the track muted', True)
        btn.click()
        page.wait_for_selector(f'button[data-media="{media}"][aria-pressed="true"]', timeout=15000)
        doc_page.wait_for_function(PATIENT_TRACK_MUTED, arg=[source, False], timeout=15000)
        step(f'{label}: {media} on again -> aria-pressed=true and the doctor sees it unmuted', True)


def guarded(name, fn):
    try:
        fn()
    except Exception as e:
        step(name, False, str(e)[:400])


def main():
    s = setup()
    if not s:
        step('web call setup', False, 'no started video appointment (see the failed steps above)')
        return
    doctor, pat, aid, t = s['doctor'], s['pat'], s['aid'], s['t']
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web call', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None, args=MEDIA_FLAGS)
    except Exception as e:
        return step('web call', False, f'no chromium: {e}')
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844}, permissions=['camera', 'microphone'])
    page = ctx.new_page()
    doc_srv = doctor_page_server()
    try:
        r = web_login(ctx, WEB, s['acct']['email'], s['acct']['password'])
        step('the patient signs in on the website', r.ok, f'{r.status} {r.text()[:200]}')
        doc_ctx, doc_page = doctor_page(browser)
        step("the doctor's page loads livekit-client", doc_page.evaluate('() => typeof window.LivekitClient?.Room') == 'function', '')
    except Exception as e:
        browser.close(); pw.stop(); doc_srv.shutdown()
        return step('web call', False, f'patient-web not running at {WEB}, or no livekit-client build: {e}')

    journey('web call 1: the doctor calls from the provider app, the patient answers in the website call room')
    sid = None
    try:
        r = doctor.post('/calls/initiate', {'appointmentId': aid, 'call_type': 'video'})
        sid = r.get('session_id') or r.get('id')
        step('doctor: POST /calls/initiate (VideoCallRoom)', r.ok and sid, r)
        j = doctor.post(f'/calls/{sid}/join') if sid else None
        step('doctor: POST /calls/:id/join returns the room token', j is not None and j.ok and j.get('token') and j.get('room_name'), j)
        if sid and j is not None and j.get('token'):
            page.goto(f'{WEB}/ar/room/{sid}', wait_until='load', timeout=60000)
            prove_connected_call(page, doc_page, j.get('token'), 'call room')
            page.locator('[data-call-state="live"] button.nabd-button--danger').click()
            page.wait_for_selector('[data-call-state="ended"]', timeout=15000)
            step('call room: leaving ends the call on the patient side', True)
    except Exception as e:
        step('call room flow', False, str(e)[:400])
    finally:
        if sid:
            e = doctor.post(f'/calls/{sid}/end')
            step('doctor: POST /calls/:id/end (hang-up)', e.ok, e)

    journey('web call 2: waiting room -> video-call page (the booking token window opens 15 min before the slot)')
    opens = t - QUARTER + datetime.timedelta(seconds=5)
    wait = (opens - datetime.datetime.now(datetime.timezone.utc)).total_seconds()
    if wait > 0:
        print(f'  ... waiting {int(wait)} s on the real clock for the call window ({opens.isoformat()})', flush=True)
        while wait > 0:
            time.sleep(min(wait, 30))
            wait = (opens - datetime.datetime.now(datetime.timezone.utc)).total_seconds()
    try:
        tok = doctor.get(f'/unified-bookings/{aid}/call-token')
        step('doctor: the backend issues the booking call token (window open)', tok.ok and tok.get('provider') == 'livekit' and tok.get('token'), tok)
        page.goto(f'{WEB}/ar/consultations/virtual-waiting-room?appointmentId={aid}', wait_until='load', timeout=60000)
        # The page does not depend on the clock: the join card is drawn whenever the appointment is joinable (status only), and the
        # token window is checked by the server when "join" is pressed. What varied from run to run was the page itself: while it
        # streams in, React holds a hidden copy of the section next to the visible one (and a late chunk can bring it back after
        # the count was read), so `count() == 1` over ALL copies was true or false by timing (the failure on unrelated PRs #1961,
        # #1991). Every read below is of the visible card only, after it has settled.
        card = 'section[aria-labelledby="call-token-title"]:visible'
        launcher = page.locator(card)
        launcher.first.wait_for(state='visible', timeout=30000)
        step('waiting room: the visit is joinable (the "join" card shows)', launcher.count() == 1, f'{launcher.count()} visible card(s) at {page.url}')
        launcher.first.locator('button').first.click()
        join = page.locator(f'{card} a[href*="/consultations/video-call?appointmentId="]')
        join.first.wait_for(state='visible', timeout=30000)
        step('waiting room: "join" checks the call is ready and offers the call', True)
        join.first.click()
        page.wait_for_url('**/consultations/video-call?appointmentId=*', timeout=30000)
        if tok.ok and tok.get('token'):
            prove_connected_call(page, doc_page, tok.get('token'), 'video-call page')
    except Exception as e:
        step('waiting room -> video-call flow', False, str(e)[:400])
    guarded('doctor leaves', lambda: doc_page.evaluate('() => window.__room && window.__room.disconnect()'))
    doc_ctx.close()
    browser.close()
    pw.stop()
    doc_srv.shutdown()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
