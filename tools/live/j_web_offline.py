"""Journey (patient-web, real browser): offline, a page shows the site's own offline page (journeys 77, issue 1086).
  - The site registers its service worker for every visitor (no permission prompt); the worker keeps only the offline
    page (one per locale) and its stylesheets.
  - Offline, opening a page that needs the network (the checkout of the cart) shows "you are offline, your cart is kept"
    in the page language instead of the browser's own error page; back online the same page loads normally.
  Stack: patient-web :3100 (production build).
"""
import os

from lib import journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844}, service_workers='allow')
    page = ctx.new_page()
    try:
        journey('journeys 77: the offline page')
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
        ready = page.evaluate("""async () => {
          if (!('serviceWorker' in navigator)) return 'no-sw';
          const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 30000))]);
          if (!reg) return 'not-ready';
          const keys = await caches.keys();
          const cache = keys.includes('nabd-offline-v1') ? await caches.open('nabd-offline-v1') : null;
          return cache && await cache.match('/ar/offline') ? 'cached' : 'no-offline-page';
        }""")
        step('the service worker is ready and keeps the offline page', ready == 'cached', ready)
        page.reload(wait_until='load')  # the page is now controlled by the worker
        step('the page is controlled by the worker', page.evaluate('() => !!navigator.serviceWorker.controller'))
        # The network is cut with a context route, not ctx.set_offline(True): set_offline reaches the worker's own network
        # only once Playwright has attached to the worker (a worker less than a second old is not yet attached), and since
        # the public pages are served from the ISR cache the whole flow now fits in that window. Then the worker's fetch
        # still reached the server, the worker answered with the real checkout page (a redirect to the sign-in, or its
        # loading state) and the journey read "العربية" or "جارٍ التحميل" instead of the offline page. A route aborts the
        # worker's requests as well as the page's, whatever the worker's age.
        cut = lambda route: route.abort('internetdisconnected')
        ctx.route('**/*', cut)
        reach = [sw.evaluate("() => fetch('/ar/cart/checkout?probe=1', { cache: 'no-store' }).then(() => 'reached', () => 'cut')") for sw in ctx.service_workers]
        step('offline, the worker itself cannot reach the site', bool(reach) and all(r == 'cut' for r in reach), reach)
        try:
            page.goto(f'{WEB}/ar/cart/checkout', wait_until='load', timeout=30000)
            text = page.locator('main').first.inner_text()
        except Exception as e:
            text = f'navigation failed: {str(e)[:200]}'
        step('offline, the checkout shows the site\'s offline page', 'أنت غير متصل' in text and 'سلتك محفوظة' in text, text[:300])
        ctx.unroute('**/*', cut)
        res = page.goto(f'{WEB}/ar/offline', wait_until='load', timeout=30000)
        step('the offline page itself is not indexed', 'noindex' in (page.locator('meta[name="robots"]').first.get_attribute('content') or ''), res.status if res else None)
        page.goto(f'{WEB}/ar', wait_until='load', timeout=30000)
        step('back online, pages load from the network again', 'أنت غير متصل' not in page.locator('body').inner_text(), page.url)
    except Exception as e:
        step('web flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
