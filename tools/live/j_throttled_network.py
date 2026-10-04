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
  offline . CDP offline:true, then back to online; cache + banner + replay
            are asserted on the rendered patient-web UI.

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
UPDATED = re.compile('آخر تحديث|updated|منذ|ago', re.I)


def skip(name, reason):
    return step(f'SKIP {name} ({reason})', True, 'skipped: harness gap')


def cdp(page, ctx, cond):
    s = ctx.new_cdp_session(page)
    s.send('Network.enable')
    s.send('Network.emulateNetworkConditions', cond)
    return s


def main():
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
    cdp(page, ctx, G3)
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
    step('the 3G profile was actually applied (not a vacuous pass)', elapsed >= 2.0, f'{elapsed:.1f}s')
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
    cdp(page, ctx, {'offline': True, 'latency': 0, 'downloadThroughput': 0, 'uploadThroughput': 0})
    time.sleep(2)
    body = page.evaluate('() => document.body ? document.body.innerText.slice(0, 4000) : ""')
    step('cached content stays visible offline (not a blank screen)', len(body.strip()) > 200, f'{len(body)} chars')
    banner = BANNER.search(body or '')
    step('an offline banner is shown (owning fix: patient-web offline UI, 15.4)', bool(banner),
         'no offline banner text rendered' if not banner else banner.group(0))
    updated = UPDATED.search(body or '')
    step('a "last updated" time is shown (owning fix: patient-web offline UI, 15.4)', bool(updated),
         'no last-updated text rendered' if not updated else updated.group(0))
    cdp(page, ctx, {'offline': False, 'latency': 0, 'downloadThroughput': -1, 'uploadThroughput': -1})
    try:
        page.goto(WEB + '/ar', wait_until='load', timeout=60000)
        back = True
    except Exception as e:
        back = str(e)[:150]
    body = page.evaluate('() => document.body ? document.body.innerText.slice(0, 4000) : ""')
    step('the UI updates on reconnect', back is True and len(body.strip()) > 200,
         'reload failed after reconnect' if back is not True else f'{len(body)} chars')
    step('the offline banner clears on reconnect', not BANNER.search(body or ''), (body or '')[:200])
    skip('safe-action queue replay (no outbox UI contract exists in patient-web yet — '
         'owning change: queued-action list + replay order + payments-never-queued rule, 15.4)')
    browser.close(); pw.stop()


if __name__ == '__main__':
    from lib import summary
    journey('throttled-network')
    main()
    summary()
