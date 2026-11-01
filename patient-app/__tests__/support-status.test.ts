import { supportStatus } from '../src/utils/supportStatus';

describe('support request status', () => {
  it.each([['OPEN', 'support.status.open'], ['IN_PROGRESS', 'support.status.inProgress'], ['in progress', 'support.status.inProgress'], ['RESOLVED', 'support.status.resolved'], ['closed', 'support.status.closed']])('%s -> %s', (raw, key) => {
    expect(supportStatus(raw)?.key).toBe(key);
  });
  it('an unknown or missing status draws no tag (never the raw server word)', () => {
    expect(supportStatus('ESCALATED_TO_X')).toBeNull();
    expect(supportStatus(undefined)).toBeNull();
    expect(supportStatus('')).toBeNull();
  });
  it('every key exists in all six locale files', () => {
    for (const l of ['ar', 'en', 'ur', 'hi', 'bn', 'tl']) {
      const d = require(`../src/i18n/locales/${l}.json`);
      for (const k of ['open', 'inProgress', 'resolved', 'closed']) expect(typeof d[`support.status.${k}`]).toBe('string');
    }
  });
});
