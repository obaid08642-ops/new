// Read-only production timing: GET navigations only, 3 runs per route, median.
// usage: node tools/perf/web-sweep.js [base] [routes.txt] > out.json
const { chromium } = require('playwright');
const fs = require('fs');
const base = process.argv[2] || 'https://nabd.plus';
const routes = fs.readFileSync(process.argv[3] || 'tools/perf/routes.txt', 'utf8').split('\n').filter(Boolean);
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
(async () => {
  const browser = await chromium.launch();
  const out = [];
  for (const r of routes) {
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
      const page = await ctx.newPage();
      let js = 0;
      const api = [];
      page.on('response', async (res) => {
        const u = res.url();
        const h = res.headers();
        if (res.request().resourceType() === 'script') js += Number(h['content-length'] || 0);
        if (/\/api\//.test(u) && res.request().method() === 'GET') api.push(u);
      });
      await page.addInitScript(() => {
        window.__lcp = 0;
        new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      });
      try {
        await page.goto(base + '/ar' + (r === '/' ? '' : r), { waitUntil: 'load', timeout: 30000 });
        await page.waitForTimeout(1500);
        const t = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { ttfb: n.responseStart, lcp: window.__lcp }; });
        runs.push({ ...t, js, api: api.length });
      } catch (e) { runs.push({ err: String(e).slice(0, 80) }); }
      await ctx.close();
    }
    const ok = runs.filter((x) => !x.err);
    out.push({ route: r, ttfb: ok.length ? Math.round(med(ok.map((x) => x.ttfb))) : null, lcp: ok.length ? Math.round(med(ok.map((x) => x.lcp))) : null, jsKB: ok.length ? Math.round(med(ok.map((x) => x.js)) / 1024) : null, apiCalls: ok.length ? ok[0].api : null, err: ok.length ? undefined : runs[0].err });
    process.stderr.write(r + ' ' + JSON.stringify(out[out.length - 1]) + '\n');
  }
  await browser.close();
  console.log(JSON.stringify(out));
})();
