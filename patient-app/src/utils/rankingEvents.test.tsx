import { renderHook } from '@testing-library/react-native';
import { reportRankingEvent, useReportServiceView, verticalOfSuggestion } from './rankingEvents';
import { apiFetch } from './api';

jest.mock('./api', () => ({ apiFetch: jest.fn() }));
const mocked = apiFetch as jest.Mock;

beforeEach(() => mocked.mockReset());

describe('reportRankingEvent', () => {
  it('posts the vertical, the service id and the event, and nothing that identifies the user', async () => {
    mocked.mockResolvedValue({});
    reportRankingEvent('lab', 'svc_12345678', 'view');
    expect(mocked).toHaveBeenCalledTimes(1);
    const [path, opts] = mocked.mock.calls[0];
    expect(path).toBe('/catalogue/ranking/events');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ vertical: 'lab', service_id: 'svc_12345678', event: 'view' });
  });
  it('swallows a rejected request and a synchronous throw', async () => {
    mocked.mockRejectedValueOnce(new Error('offline'));
    expect(() => reportRankingEvent('radiology', 'svc_12345678', 'search')).not.toThrow();
    mocked.mockImplementationOnce(() => { throw new Error('boom'); });
    expect(() => reportRankingEvent('nursing', 'svc_12345678', 'view')).not.toThrow();
    await Promise.resolve();
  });
  it('does not send an id the backend would refuse', () => {
    reportRankingEvent('lab', '', 'view');
    reportRankingEvent('lab', 'short', 'view');
    reportRankingEvent('lab', undefined, 'view');
    expect(mocked).not.toHaveBeenCalled();
  });
});

describe('verticalOfSuggestion', () => {
  it('ranks tests, scans and nursing services only', () => {
    expect(verticalOfSuggestion('lab_test')).toBe('lab');
    expect(verticalOfSuggestion('radiology')).toBe('radiology');
    expect(verticalOfSuggestion('nursing')).toBe('nursing');
    expect(verticalOfSuggestion('lab_package')).toBeNull();
    expect(verticalOfSuggestion('medicine')).toBeNull();
  });
});

describe('useReportServiceView', () => {
  it('reports one view per opened service, not per render', async () => {
    mocked.mockResolvedValue({});
    const { rerender } = await renderHook(({ id }: { id: string }) => useReportServiceView('lab', id), { initialProps: { id: 'svc_12345678' } });
    await rerender({ id: 'svc_12345678' });
    expect(mocked).toHaveBeenCalledTimes(1);
    await rerender({ id: 'svc_87654321' });
    expect(mocked).toHaveBeenCalledTimes(2);
  });
});
