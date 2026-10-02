"""Browser performance baseline for the four web-reachable UIs (Chromium, local stack; NOT a phone).

  APP=website|admin|patient-app|provider-app RUNS=3 python3 tools/live/perf_web.py [route ...]

Per route, cold load in a fresh context, median of RUNS:
  ttfb_ms, fcp_ms, lcp_ms, dcl_ms, load_ms, requests, transfer_kb, js_kb, api_calls, api_max_ms, api_errors,
  long_tasks_ms (sum of main-thread tasks > 50 ms, via PerformanceObserver 'longtask').
Network: local (no throttling) unless THROTTLE=4g, which applies Chrome CDP throttling
(1.6 Mbps down, 750 kbps up, 150 ms RTT, 4x CPU slowdown) as a rough mid-range phone approximation.
Writes docs/review/evidence/perf_<app>_<date>[_<throttle>].json
"""
import datetime, json, os, statistics, sys, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
APP = os.environ.get('APP', 'website')
RUNS = int(os.environ.get('RUNS', '3'))
THROTTLE = os.environ.get('THROTTLE', '')
BASE = {'website': 'http://127.0.0.1:3000', 'admin': 'http://127.0.0.1:3001', 'patient-app': 'http://localhost:8081', 'provider-app': 'http://localhost:8082'}[APP]
STATE = os.environ.get('STATE')        # storage_state for signed-in pages
OBS = """() => { window.__perf = { lcp: 0, fcp: 0, long: 0 };
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__perf.lcp = Math.max(window.__perf.lcp, e.startTime); }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__perf.fcp = e.startTime; }).observe({ type: 'paint', buffered: true });
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__perf.long += e.duration; }).observe({ type: 'longtask', buffered: true }); } catch (e) {} }"""
READ = """() => { const n = performance.getEntriesByType('navigation')[0] || {}; const r = performance.getEntriesByType('resource');
  const js = r.filter(x => /\\.js(\\?|$)/.test(x.name)).reduce((a, x) => a + (x.transferSize || x.encodedBodySize || 0), 0);
  return { ttfb_ms: n.responseStart || 0, dcl_ms: n.domContentLoadedEventEnd || 0, load_ms: n.loadEventEnd || 0,
    requests: r.length + 1, transfer_kb: Math.round((r.reduce((a, x) => a + (x.transferSize || 0), 0) + (n.transferSize || 0)) / 1024),
    js_kb: Math.round(js / 1024), fcp_ms: window.__perf.fcp, lcp_ms: window.__perf.lcp, long_tasks_ms: Math.round(window.__perf.long) }; }"""


def measure(b, route):
    ctx = b.new_context(viewport={'width': 390, 'height': 844} if APP in ('patient-app', 'provider-app') else {'width': 1280, 'height': 900},
                        locale='ar-SA', storage_state=STATE or None)
    ctx.route('https://1.1.1.1/**', lambda r: r.fulfill(status=200, body=''))
    page = ctx.new_page()
    if THROTTLE == '4g':
        cdp = ctx.new_cdp_session(page)
        cdp.send('Network.enable')
        cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 150, 'downloadThroughput': 1.6e6 / 8, 'uploadThroughput': 750e3 / 8})
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
    page.add_init_script(f'({OBS})()')
    api = {}
    def on_req(r):
        if ':8002/' in r.url or '/api/' in r.url:
            api[id(r)] = [time.time(), None]
    def on_done(r):
        if id(r) in api:
            api[id(r)][1] = time.time()
            try:
                api[id(r)].append(r.response().status if r.response() else 0)
            except Exception:
                api[id(r)].append(0)
    page.on('request', on_req); page.on('requestfinished', on_done); page.on('requestfailed', lambda r: api.get(id(r)) and api[id(r)].__setitem__(1, time.time()) or None)
    page.goto(BASE + route, wait_until='load', timeout=90000)
    page.wait_for_load_state('networkidle', timeout=30000)
    page.wait_for_timeout(500)   # let LCP settle after network idle (observer only, not a test wait)
    m = page.evaluate(READ)
    lat = [int((v[1] - v[0]) * 1000) for v in api.values() if v[1]]
    m.update({'api_calls': len(api), 'api_max_ms': max(lat) if lat else 0, 'api_errors': sum(1 for v in api.values() if len(v) > 2 and v[2] >= 400)})
    ctx.close()
    return {k: (round(v) if isinstance(v, float) else v) for k, v in m.items()}


def main():
    from playwright.sync_api import sync_playwright
    routes = sys.argv[1:] or ['/']
    pw = sync_playwright().start(); b = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    out = {'app': APP, 'throttle': THROTTLE or 'none (local)', 'runs': RUNS, 'note': 'Chromium on the review container; not a phone', 'routes': {}}
    for r in routes:
        rows = []
        for _ in range(RUNS):
            try:
                rows.append(measure(b, r))
            except Exception as e:
                rows.append({'error': str(e)[:120]})
        ok = [x for x in rows if 'error' not in x]
        med = {k: int(statistics.median([x[k] for x in ok])) for k in ok[0]} if ok else {'error': rows[0].get('error')}
        out['routes'][r] = med
        print(f"{r[:40]:40s} {med}", flush=True)
    p = os.path.join(ROOT, 'docs/review/evidence', f"perf_{APP}_{datetime.date.today().isoformat()}{'_' + THROTTLE if THROTTLE else ''}.json")
    json.dump(out, open(p, 'w'), ensure_ascii=False, indent=1)
    b.close(); pw.stop()


if __name__ == '__main__':
    main()
