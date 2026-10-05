// 7790744 / X5-B2: each report row links to its own slice of the orders console,
// where every record opens its detail with the full state history.
// Run: node_modules/.bin/jiti src/lib/report-drilldown.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ordersFiltersFromQuery, reportRowHref } from './report-drilldown';

test('orders rows grouped by day link to that day only, each row differently', () => {
  const a = reportRowHref('orders', 'day', { bucket: '2026-09-01', count: 3 });
  const b = reportRowHref('orders', 'day', { bucket: '2026-09-02', count: 1 });
  assert.equal(a, '/admin/orders?kind=pharmacy&from=2026-09-01&to=2026-09-02');
  assert.equal(b, '/admin/orders?kind=pharmacy&from=2026-09-02&to=2026-09-03');
  assert.notEqual(a, b);
});

test('orders rows grouped by status link to that status', () => {
  assert.equal(reportRowHref('orders', 'status', { bucket: 'out_for_delivery' }), '/admin/orders?kind=pharmacy&status=out_for_delivery');
});

test('booking rows carry their kind and bucket', () => {
  assert.equal(reportRowHref('bookings', 'day', { kind: 'lab', bucket: '2026-09-30' }), '/admin/orders?kind=lab&from=2026-09-30&to=2026-10-01');
  assert.equal(reportRowHref('bookings', 'status', { kind: 'nursing', bucket: 'CONFIRMED' }), '/admin/orders?kind=nursing&status=CONFIRMED');
  assert.equal(reportRowHref('bookings', 'service', { kind: 'radiology', bucket: 'radiology' }), '/admin/orders?kind=radiology');
  // doctor_appointments are not an orders-console kind: no link rather than a wrong one.
  assert.equal(reportRowHref('bookings', 'day', { kind: 'consultation_doctor', bucket: '2026-09-30' }), null);
});

test('rows without a usable bucket and tabs without a record console get no row link', () => {
  assert.equal(reportRowHref('orders', 'day', { bucket: undefined }), null);
  assert.equal(reportRowHref('orders', 'day', { bucket: 'not-a-date' }), null);
  assert.equal(reportRowHref('revenue', 'day', { bucket: '2026-09-01' }), null);
  assert.equal(reportRowHref('patients', 'day', { bucket: '2026-09-01' }), null);
});

test('the orders console starts from the filters in the link', () => {
  assert.deepEqual(ordersFiltersFromQuery({ kind: 'lab', from: '2026-09-30', to: '2026-10-01', status: ['CONFIRMED'] }), {
    kind: 'lab', status: 'CONFIRMED', q: '', from: '2026-09-30', to: '2026-10-01', sort: 'newest',
  });
  assert.deepEqual(ordersFiltersFromQuery({ kind: 'not-a-kind', from: 'x' }), { kind: '', status: '', q: '', from: '', to: '', sort: 'newest' });
});
