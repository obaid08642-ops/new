// Q61: the admin jobs page is reachable from the nav and offers publish / close / delete.
// Run: node_modules/.bin/jiti src/lib/jobs-admin.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NAV_SECTIONS, permitted, requiredPermissionFor } from './admin-nav';
import { jobActionRequest, jobActionsFor } from './job-actions';

const navItems = () => NAV_SECTIONS.flatMap((section) => section.items);

test('the jobs page has a nav entry', () => {
  const item = navItems().find((i) => i.href === '/admin/jobs');
  assert.ok(item, 'no /admin/jobs nav entry');
  assert.equal(item.label, 'مراجعة الوظائف');
});

test('the jobs page is guarded by cms.edit for both the nav link and direct URL access', () => {
  assert.equal(requiredPermissionFor('/admin/jobs'), 'cms.edit');
  const item = navItems().find((i) => i.href === '/admin/jobs');
  assert.ok(item);
  assert.equal(permitted(item, new Set(['cms.edit'])), true);
  assert.equal(permitted(item, new Set(['order.read'])), false);
});

test('a draft can be published or deleted, a published job closed or deleted, a closed job deleted', () => {
  assert.deepEqual(jobActionsFor('draft'), ['publish', 'delete']);
  assert.deepEqual(jobActionsFor(undefined), ['publish', 'delete']);
  assert.deepEqual(jobActionsFor('published'), ['close', 'delete']);
  assert.deepEqual(jobActionsFor('closed'), ['delete']);
});

test('each action maps to the real backend route', () => {
  assert.deepEqual(jobActionRequest('job 1', 'publish'), { path: '/api/admin/recruitment/jobs/job%201', method: 'PUT', body: { status: 'published' } });
  assert.deepEqual(jobActionRequest('job-1', 'close'), { path: '/api/admin/recruitment/jobs/job-1', method: 'PUT', body: { status: 'closed' } });
  assert.deepEqual(jobActionRequest('job-1', 'delete'), { path: '/api/admin/recruitment/jobs/job-1', method: 'DELETE' });
});
