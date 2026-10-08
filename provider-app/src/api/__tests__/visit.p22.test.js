/**
 * P22.6 — provider visit-quality API contract tests.
 *
 * Strategy: the shared axios client is replaced with a stub (no network, no
 * mocks of behaviour), so these tests assert the EXACT method + path + body
 * this app sends for running-late / no-show / finish-summary. Reverting any
 * route or body field turns the suite RED.
 */
const fs = require('fs');
const path = require('path');

const calls = [];

jest.mock('../client', () => ({
  __esModule: true,
  default: {
    post: jest.fn((url, body) => {
      calls.push({ method: 'POST', url, body });
      return Promise.resolve({ data: { id: 'a1', delay_minutes: body ? body.delay_minutes : 0, auto: false } });
    }),
    patch: jest.fn((url, body) => {
      calls.push({ method: 'PATCH', url, body });
      return Promise.resolve({ data: { id: 'a1', status: 'NO_SHOW', noshow_fee: 50 } });
    }),
    get: jest.fn((url) => {
      calls.push({ method: 'GET', url });
      return Promise.resolve({ data: { diagnosis: 'flu' } });
    }),
  },
}));

const api = require('../visit');

beforeEach(() => {
  calls.length = 0;
  jest.clearAllMocks();
});

describe('P22.6 reportRunningLate', () => {
  it('POSTs delay_minutes to :id/report-late', async () => {
    const out = await api.reportRunningLate('appt-1', 20);
    expect(calls).toEqual([{ method: 'POST', url: '/care/appointments/appt-1/report-late', body: { delay_minutes: 20 } }]);
    expect(out.delay_minutes).toBe(20);
  });

  it('rejects out-of-range delays before any network call', async () => {
    await expect(api.reportRunningLate('appt-1', 3)).rejects.toThrow('delay_minutes_out_of_range');
    await expect(api.reportRunningLate('appt-1', 200)).rejects.toThrow('delay_minutes_out_of_range');
    await expect(api.reportRunningLate('appt-1', NaN)).rejects.toThrow('delay_minutes_out_of_range');
    expect(calls).toEqual([]);
  });

  it('requires an appointment id', async () => {
    await expect(api.reportRunningLate('', 15)).rejects.toThrow('appointment_id_required');
    expect(calls).toEqual([]);
  });
});

describe('P22.6 markAppointmentNoShow', () => {
  it('PATCHes :id/no-show and surfaces the policy fee', async () => {
    const out = await api.markAppointmentNoShow('appt-9');
    expect(calls).toEqual([{ method: 'PATCH', url: '/care/appointments/appt-9/no-show', body: {} }]);
    expect(out.noshow_fee).toBe(50);
  });

  it('requires an appointment id', async () => {
    await expect(api.markAppointmentNoShow('  ')).rejects.toThrow('appointment_id_required');
    expect(calls).toEqual([]);
  });
});

describe('P22.6 finishVisitSummary', () => {
  it('POSTs the SOAP body to :id/finish', async () => {
    await api.finishVisitSummary('appt-2', { diagnosis: 'Acute pharyngitis', notes: 'Rest', recommendations: 'Fluids' });
    expect(calls).toEqual([
      {
        method: 'POST',
        url: '/care/appointments/appt-2/finish',
        body: { diagnosis: 'Acute pharyngitis', notes: 'Rest', recommendations: 'Fluids' },
      },
    ]);
  });

  it('refuses an empty summary before any network call', async () => {
    await expect(api.finishVisitSummary('appt-2', { diagnosis: '  ', notes: '' })).rejects.toThrow(
      'summary_content_required',
    );
    expect(calls).toEqual([]);
  });

  it('reads the summary back from :id/summary', async () => {
    const out = await api.getVisitSummary('appt-2');
    expect(calls).toEqual([{ method: 'GET', url: '/care/appointments/appt-2/summary' }]);
    expect(out).toEqual({ diagnosis: 'flu' });
  });

  it('builds the report.pdf download path for a completed visit', () => {
    expect(api.visitReportPdfPath('appt-2')).toBe('/care/appointments/appt-2/report.pdf');
  });
});

describe('P22.6 consultation wiring (structural)', () => {
  const consult = fs.readFileSync(
    path.resolve(__dirname, '../../screens/doctor/doctor/LiveConsultationScreen.tsx'),
    'utf8',
  );

  it('consultation finish goes through the shared finish helper (same route)', () => {
    expect(consult).toContain('finishVisitSummary');
    expect(consult).not.toContain('/finish`');
  });
});

describe('P22.6 appointment-detail wiring (structural)', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../screens/doctor/doctor/AppointmentDetailScreen.tsx'),
    'utf8',
  );

  it('detail screen exposes running-late + no-show against the governed routes', () => {
    expect(src).toContain('report-late');
    expect(src).toContain('no-show');
    expect(src).toContain('reportRunningLate');
    expect(src).toContain('markAppointmentNoShow');
  });
});
