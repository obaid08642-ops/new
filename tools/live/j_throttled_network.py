"""Gate P15 throttled-network: at 3G, 1% loss and offline the app stays usable
and recovers. Cached data stays visible with an offline banner; safe actions
queue and replay in order (never payments); on reconnect the UI updates.

Throttling mechanism (checked against tools/live/ and deploy/ first):
the repo's supported mechanism is Playwright CDP
`Network.emulateNetworkConditions` (already used by tools/live/perf_web.py for
its 4G profile). `tc netem` needs NET_ADMIN inside docker (the live-gate
runner has it, but the journeys run outside the containers, so it cannot
shape the client's loopback path), and no proxy exists in the harness — so
this journey uses CDP, the one mechanism the repo can actually support:
  3G ...... CDP latency 300 ms, 400 kbps down / 400 kbps up (documented
            approx; values are asserted from the CDP round-trip, not assumed)
  1% loss . CDP has NO packet-loss parameter: simulated at the Playwright
            route layer by aborting ~1% of API requests at random (an honest,
            labelled approximation). True L2 loss needs `tc netem` on the path
            or a device-farm run — noted in P15_GATES_NOTES as a follow-up.
  offline . CDP offline:true, then back to online; the cache, the offline banner
            and an explicit "last updated <time>" label are asserted on the
            rendered patient-web UI (a bare relative timestamp does not count).
  replay  . The device half of "queued actions replay in order" is NOT observable
            (the client outbox is disabled, see the SKIP at the end), but the
            server-side safety property IS: the same keyed write replayed with the
            client's own key shape must land exactly once and be flagged
            idempotent_replay. Asserted first, because it needs no browser.

What the journey sends is what the screens send: it drives the real
patient-web pages in Chromium (NABD_PATIENT_WEB, default
http://127.0.0.1:3000) and reads only rendered UI — no fixture-only API
setup. SKIPs (explicit, never silent) when patient-web or python-playwright
is unavailable.
"""
import os
import random
import re
import time

from lib import journey, step

WEB = os.environ.get('NABD_PATIENT_WEB', 'http://127.0.0.1:3000')
# 3G-ish profile used by this journey (CDP takes bytes/s).
G3 = {'offline': False, 'latency': 300,
      'downloadThroughput': int(400e3 / 8), 'uploadThroughput': int(400e3 / 8)}
BANNER = re.compile('غير متصل|غير متصلة|لا يوجد اتصال|انقطع الاتصال|offline|no connection|you are offline', re.I)
# An explicit "last updated <time>" LABEL, in the wording the clients use
# (patient-app renders `آخر تحديث` / `Last updated:`). The previous pattern also
# accepted a bare `updated`/`ago`/`منذ`, so ANY relative timestamp anywhere on a
# content page satisfied "last updated" without any offline UI at all.
UPDATED = re.compile('آخر\\s*ت|Last\\s*updated', re.I)


def skip(name, reason):
    return step(f'SKIP {name} ({reason})', True, 'skipped: harness gap')


def cdp(page, ctx, cond):
    """Apply CDP network conditions.

    Returns (ok, detail). An unapplied profile would make every throttling step a
    vacuous pass (nothing was actually throttled), so the caller MUST assert this
    before trusting an elapsed-time or offline observation.
    """
    try:
        s = ctx.new_cdp_session(page)
        s.send('Network.enable')
        s.send('Network.emulateNetworkConditions', cond)
        return True, ''
    except Exception as e:
        return False, str(e)[:200]


def keyed_replay_check():
    """The server-side half of "safe actions queue and replay in order".

    patient-app/src/context/SocketContext.tsx (syncOfflineQueue) replays a queued
    chat message as POST /chats/threads/<id>/messages with
    `Idempotency-Key: chat-offline-<id>` and the SAME client_message_id, so a
    replay after a lost response must never post twice. That contract IS provable
    over HTTP (no browser, no outbox UI), so it is asserted here instead of
    skipped: same key twice -> one message id, the second answer flagged
    idempotent_replay, and exactly one copy in the thread.
    """
    import uuid

    from lib import Client
    from j_accounts import app_signup
    from j_concurrency import free_slots, book

    pat = Client(app_signup(label='throttle-replay')['token'], 'throttle-replay')
    free, _ = free_slots(pat, 1)
    if not free:
        skip('safe-action queue replay', 'no free clinic slot to hang a booking thread on')
        return
    appt = book(pat, free[0], key=f'throttle-replay-appt-{uuid.uuid4()}')
    if not appt.ok or not appt.get('id'):
        skip('safe-action queue replay', f'booking for the thread failed: {str(appt)[:160]}')
        return
    t = pat.post('/chat/threads/booking', {'booking_kind': 'consultation', 'booking_id': appt.get('id')})
    tid = (t.body.get('data') or t.body).get('id') if isinstance(t.body, dict) else None
    if not tid:
        skip('safe-action queue replay', f'no booking thread: {str(t)[:160]}')
        return
    cmid = str(uuid.uuid4())
    key = f'chat-offline-{cmid}'  # exactly the key the app's replay path sends
    payload = {'body': 'تم — إعادة إرسال من قائمة الانتظار', 'type': 'text', 'client_message_id': cmid}
    first = pat.post(f'/chat/threads/{tid}/messages', payload, headers={'Idempotency-Key': key})
    replay = pat.post(f'/chat/threads/{tid}/messages', payload, headers={'Idempotency-Key': key})
    step('the queued write is accepted once and its replay answers with the same message id',
         first.ok and replay.ok and bool(first.get('id')) and replay.get('id') == first.get('id'),
         f'first={first.status}:{first.get("id")} replay={replay.status}:{replay.get("id")}')
    step('the replay is FLAGGED as a replay instead of being re-executed (idempotent_replay: true)',
         replay.get('idempotent_replay') is True, str(replay.body)[:200])
    msgs = pat.get(f'/chat/threads/{tid}/messages')
    items = msgs.body if isinstance(msgs.body, list) else msgs.items()
    n = str(items).count(cmid)
    step('the thread holds exactly one copy of the replayed message', n == 1, f'{n} copies in thread')


def main():
    # The server-side replay safety check needs no browser, so it runs FIRST: in CI
    # (live-gate.yml starts the backend but not patient-web) the browser half below
    # SKIPs, and without this ordering the replay property would never be checked.
    journey('throttled-network: a replayed queued write lands exactly once (server side)')
    keyed_replay_check()
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        journey('throttled-network: load patient-web')
        skip('throttled-network', 'python playwright not installed')
        return
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        journey('throttled-network: load patient-web')
        skip('throttled-network', f'no chromium: {e}')
        return

    journey('throttled-network: warm cache on a good network')
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        page.goto(WEB + '/ar', wait_until='load', timeout=45000)
    except Exception as e:
        skip('throttled-network', f'patient-web not running at {WEB}: {e}')
        browser.close(); pw.stop()
        return
    try:
        page.wait_for_load_state('networkidle', timeout=30000)
    except Exception:
        pass
    warm_text = page.evaluate('() => document.body ? document.body.innerText.slice(0, 4000) : ""')
    step('home renders on a good network (there is a cache to keep)', len(warm_text.strip()) > 200, f'{len(warm_text)} chars')

    journey('throttled-network: 3G — the app stays usable')
    g3_applied, g3_err = cdp(page, ctx, G3)
    step('the CDP 3G profile was accepted by the browser (an unapplied profile would fake every step below)',
         g3_applied, g3_err or '')
    t0 = time.time()
    try:
        page.goto(WEB + '/ar', wait_until='load', timeout=120000)
        loaded = True
    except Exception as e:
        loaded = str(e)[:150]
    elapsed = time.time() - t0
    body = page.evaluate('() => document.body ? document.body.innerText.slice(0, 4000) : ""')
    step('the page loads on 3G (slow, not blank)', loaded is True and len(body.strip()) > 200,
         f'{elapsed:.0f}s, {len(body)} chars' if loaded is True else f'load failed: {loaded}')
    step('the 3G profile was actually applied (not a vacuous pass)', g3_applied and elapsed >= 2.0,
         f'{elapsed:.1f}s, cdp_applied={g3_applied}')
    blank = page.evaluate('() => document.documentElement ? document.documentElement.innerHTML.length : 0')
    step('no blank-screen crash under 3G', blank > 5000, f'{blank} html chars')

    journey('throttled-network: 1% loss — random API aborts do not break the page')
    random.seed(1510)
    aborted = {'n': 0}
    total = {'n': 0}

    def flaky(route):
        total['n'] += 1
        if random.random() < 0.01:
            aborted['n'] += 1
            route.abort()
        else:
            route.continue_()

    page.route('**/api/**', flaky)
    try:
        page.goto(WEB + '/ar', wait_until='load', timeout=120000)
        survived = True
    except Exception as e:
        survived = str(e)[:150]
    body = page.evaluate('() => document.body ? document.body.innerText.slice(0, 4000) : ""')
    step('the page survives 1% request loss (usable, not blank)',
         survived is True and len(body.strip()) > 200, f'aborted={aborted["n"]}/{total["n"]}')
    step('loss was actually injected (route layer saw API traffic)', total['n'] > 0, f'{total["n"]} api requests')
    page.unroute('**/api/**')

    journey('throttled-network: offline — cache stays visible with a banner, then recovers')
    off_applied, off_err = cdp(page, ctx, {'offline': True, 'latency': 0, 'downloadThroughput': 0, 'uploadThroughput': 0})
    step('the CDP offline profile was accepted by the browser', off_applied, off_err or '')
    time.sleep(2)
    body = page.evaluate('() => document.body ? document.body.innerText.slice(0, 4000) : ""')
    step('cached content stays visible offline (not a blank screen)', len(body.strip()) > 200, f'{len(body)} chars')
    banner = BANNER.search(body or '')
    step('an offline banner is shown (owning fix: patient-web offline UI, 15.4)', bool(banner),
         'no offline banner text rendered' if not banner else banner.group(0))
    updated = UPDATED.search(body or '')
    step('a "last updated" time is shown (owning fix: patient-web offline UI, 15.4)', bool(updated),
         'no "آخر تحديث"/"Last updated" label rendered' if not updated else updated.group(0))
    on_applied, on_err = cdp(page, ctx, {'offline': False, 'latency': 0, 'downloadThroughput': -1, 'uploadThroughput': -1})
    step('the CDP reconnect (offline:false) profile was accepted by the browser', on_applied, on_err or '')
    try:
        page.goto(WEB + '/ar', wait_until='load', timeout=60000)
        back = True
    except Exception as e:
        back = str(e)[:150]
    body = page.evaluate('() => document.body ? document.body.innerText.slice(0, 4000) : ""')
    step('the UI updates on reconnect', back is True and len(body.strip()) > 200,
         'reload failed after reconnect' if back is not True else f'{len(body)} chars')
    step('the offline banner clears on reconnect', not BANNER.search(body or ''), (body or '')[:200])
    skip('safe-action queue replay UI (the client outbox is still disabled, so the replay ORDER on the '
         'device is unobservable)', 'patient-app/src/utils/offlineQueue.ts raises '
         'OfflineMessageQueueDisabledError (getOfflineMessages returns [], addOfflineMessage throws) and '
         'patient-web renders no outbox list; the server-side replay contract is asserted above. '
         'Owning change: queued-action list + replay order + payments-never-queued rule, 15.4')
    browser.close(); pw.stop()


if __name__ == '__main__':
    from lib import summary
    journey('throttled-network')
    main()
    summary()
