import { MetricsService, registerGauge } from './metrics.service';

// 20.10: modules publish a gauge without touching MetricsService's constructor (open sockets for scale step 4)
describe('registered gauges', () => {
  it('appear in the scrape with their value', () => {
    const m = new MetricsService();
    registerGauge('nabd_ws_connections_test', 'Open sockets.', () => 42);
    const out = m.scrape();
    expect(out).toContain('# TYPE nabd_ws_connections_test gauge');
    expect(out).toMatch(/^nabd_ws_connections_test 42$/m);
  });

  it('a gauge that throws is exported as 0 and does not break the scrape', () => {
    const m = new MetricsService();
    registerGauge('nabd_broken_test', 'Broken.', () => { throw new Error('x'); });
    expect(m.scrape()).toMatch(/^nabd_broken_test 0$/m);
  });
});
