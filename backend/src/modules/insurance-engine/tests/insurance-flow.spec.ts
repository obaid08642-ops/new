/**
 * M7 — Critical business-rule tests:
 *  BR-2 insurance flow (provider decision + patient copay),
 *  BR-1 quote (server decides allowed payment methods),
 *  Refund policy windows (>24h = 100% / 4–24h = 50% / <4h = 0%).
 */
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InsuranceFlowService, RefundService, QuoteController } from '../insurance-engine.module';

const makeDoc = (obj: any) => {
  const doc: any = { ...obj };
  doc.save = jest.fn().mockResolvedValue(doc);
  doc.toObject = () => ({ ...doc });
  return doc;
};

const events = { emit: jest.fn() } as any;

// ============================================================================
// InsuranceFlowService.decide / payCopay / cancel (BR-2)
// ============================================================================
describe('InsuranceFlowService', () => {
  let service: InsuranceFlowService;
  let requests: any;

  beforeEach(() => {
    requests = { findOne: jest.fn() };
    service = new InsuranceFlowService(requests, {} as any, {} as any, events);
    jest.clearAllMocks();
  });

  const pendingReq = () =>
    makeDoc({
      id: 'req-1',
      state: 'PENDING_PROVIDER_REVIEW',
      provider_id: 'prov-1',
      patient_id: 'pat-1',
      price: 250,
      history: [],
    });

  describe('decide', () => {
    it('approve_full → APPROVED_FULL with zero copay', async () => {
      const req = pendingReq();
      requests.findOne.mockResolvedValue(req);
      const res = await service.decide({ id: 'prov-1', role: 'doctor' }, 'req-1', { decision: 'approve_full' });
      expect(res.state).toBe('APPROVED_FULL');
      expect(res.copay_amount).toBe(0);
      expect(req.save).toHaveBeenCalled();
      expect(events.emit).toHaveBeenCalledWith('insurance.decided', expect.objectContaining({ request_id: 'req-1', state: 'APPROVED_FULL' }));
    });

    it('approve_partial computes copay = price × percent', async () => {
      const req = pendingReq();
      requests.findOne.mockResolvedValue(req);
      const res = await service.decide({ id: 'prov-1', role: 'doctor' }, 'req-1', { decision: 'approve_partial', copay_percent: 20 });
      expect(res.state).toBe('COPAY_PENDING');
      expect(res.copay_percent).toBe(20);
      expect(res.copay_amount).toBe(50); // 250 × 20%
    });

    it.each([0, -5, 100, 150, NaN])('approve_partial rejects invalid copay_percent %p', async (pct) => {
      const req = pendingReq();
      requests.findOne.mockResolvedValue(req);
      await expect(
        service.decide({ id: 'prov-1', role: 'doctor' }, 'req-1', { decision: 'approve_partial', copay_percent: pct }),
      ).rejects.toThrow(BadRequestException);
    });

    it('reject requires a reason', async () => {
      const req = pendingReq();
      requests.findOne.mockResolvedValue(req);
      await expect(service.decide({ id: 'prov-1', role: 'doctor' }, 'req-1', { decision: 'reject' })).rejects.toThrow(BadRequestException);
    });

    it('reject with reason → REJECTED', async () => {
      const req = pendingReq();
      requests.findOne.mockResolvedValue(req);
      const res = await service.decide({ id: 'prov-1', role: 'doctor' }, 'req-1', { decision: 'reject', reason: 'الخدمة غير مغطاة' });
      expect(res.state).toBe('REJECTED');
      expect(res.rejection_reason).toBe('الخدمة غير مغطاة');
    });

    it('rejects unknown decision values', async () => {
      const req = pendingReq();
      requests.findOne.mockResolvedValue(req);
      await expect(service.decide({ id: 'prov-1', role: 'doctor' }, 'req-1', { decision: 'maybe' })).rejects.toThrow(BadRequestException);
    });

    it('forbids a different provider from deciding', async () => {
      const req = pendingReq();
      requests.findOne.mockResolvedValue(req);
      await expect(service.decide({ id: 'prov-2', role: 'doctor' }, 'req-1', { decision: 'approve_full' })).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to decide on behalf of provider', async () => {
      const req = pendingReq();
      requests.findOne.mockResolvedValue(req);
      const res = await service.decide({ id: 'admin-1', role: 'admin' }, 'req-1', { decision: 'approve_full' });
      expect(res.state).toBe('APPROVED_FULL');
    });

    it('throws if request already decided', async () => {
      const req = pendingReq();
      req.state = 'APPROVED_FULL';
      requests.findOne.mockResolvedValue(req);
      await expect(service.decide({ id: 'prov-1', role: 'doctor' }, 'req-1', { decision: 'approve_full' })).rejects.toThrow(BadRequestException);
    });

    it('throws NotFound for unknown request', async () => {
      requests.findOne.mockResolvedValue(null);
      await expect(service.decide({ id: 'prov-1', role: 'doctor' }, 'nope', { decision: 'approve_full' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('payCopay (BR-2.5→2.6)', () => {
    it('APPROVED_FULL → COPAY_PAID without payment', async () => {
      const req = pendingReq();
      req.state = 'APPROVED_FULL';
      requests.findOne.mockResolvedValue(req);
      const res = await service.payCopay({ id: 'pat-1' }, 'req-1', {});
      expect(res.state).toBe('COPAY_PAID');
      expect(events.emit).toHaveBeenCalledWith('insurance.copay.paid', expect.objectContaining({ request_id: 'req-1' }));
    });

    it('COPAY_PENDING requires payment_id', async () => {
      const req = pendingReq();
      req.state = 'COPAY_PENDING';
      requests.findOne.mockResolvedValue(req);
      await expect(service.payCopay({ id: 'pat-1' }, 'req-1', {})).rejects.toThrow(BadRequestException);
    });

    it('COPAY_PENDING + payment_id → COPAY_PAID with timestamp', async () => {
      const req = pendingReq();
      req.state = 'COPAY_PENDING';
      requests.findOne.mockResolvedValue(req);
      const res = await service.payCopay({ id: 'pat-1' }, 'req-1', { payment_id: 'pay_123' });
      expect(res.state).toBe('COPAY_PAID');
      expect(res.payment_id).toBe('pay_123');
      expect(res.copay_paid_at).toBeDefined();
    });

    it('forbids non-owner patient', async () => {
      const req = pendingReq();
      req.state = 'COPAY_PENDING';
      requests.findOne.mockResolvedValue(req);
      await expect(service.payCopay({ id: 'pat-2' }, 'req-1', { payment_id: 'p' })).rejects.toThrow(ForbiddenException);
    });

    it('rejects payment in wrong state', async () => {
      const req = pendingReq(); // PENDING_PROVIDER_REVIEW
      requests.findOne.mockResolvedValue(req);
      await expect(service.payCopay({ id: 'pat-1' }, 'req-1', { payment_id: 'p' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('cannot cancel after copay payment', async () => {
      const req = pendingReq();
      req.state = 'COPAY_PAID';
      requests.findOne.mockResolvedValue(req);
      await expect(service.cancel({ id: 'pat-1' }, 'req-1')).rejects.toThrow(BadRequestException);
    });

    it('patient can cancel before payment', async () => {
      const req = pendingReq();
      requests.findOne.mockResolvedValue(req);
      const res = await service.cancel({ id: 'pat-1' }, 'req-1');
      expect(res).toEqual({ ok: true });
      expect(req.state).toBe('CANCELLED');
      expect(req.save).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// QuoteController (BR-1) — server decides allowed payment methods
// ============================================================================
describe('QuoteController (BR-1)', () => {
  const ctl = new QuoteController();

  it('clinic channel allows clinic_pay (cash at visit)', () => {
    const q = ctl.quote({ channel: 'clinic', price: '200' });
    expect(q.allowed_methods).toContain('clinic_pay');
    expect(q.allowed_methods).toContain('online');
  });

  it.each(['online', 'video', 'audio', 'chat', 'home', 'home_visit', 'delivery', 'nursing', 'physiotherapy', 'ambulance'])(
    'channel "%s" is online-only (no clinic_pay)',
    (channel) => {
      const q = ctl.quote({ channel, price: '200' });
      expect(q.allowed_methods).not.toContain('clinic_pay');
      expect(q.allowed_methods).toContain('online');
    },
  );

  it('adds insurance method only when requested', () => {
    expect(ctl.quote({ channel: 'clinic', with_insurance: 'true' }).allowed_methods[0]).toBe('insurance');
    expect(ctl.quote({ channel: 'clinic' }).allowed_methods).not.toContain('insurance');
  });

  it('defaults unknown channel handling + SAR currency', () => {
    const q = ctl.quote({});
    expect(q.channel).toBe('clinic');
    expect(q.currency).toBe('SAR');
  });
});

// ============================================================================
// RefundService — policy windows
// ============================================================================
describe('RefundService', () => {
  let service: RefundService;
  let refunds: any;

  beforeEach(() => {
    refunds = { findOne: jest.fn(), create: jest.fn() };
    const fraud = { checkRefundAbuse: jest.fn().mockResolvedValue(false) };
    service = new RefundService(refunds, events, fraud as any);
    jest.clearAllMocks();
  });

  const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600000);

  it('no scheduled date → full refund (100%)', () => {
    expect(service.policyFor(undefined).percent).toBe(100);
  });

  it.each([
    [48, 100],
    [24, 100],
    [12, 50],
    [4, 50],
    [2, 0],
    [-1, 0], // موعد فائت
  ])('cancellation %i hours before → %p%% refund', (hours, expected) => {
    expect(service.policyFor(hoursFromNow(hours)).percent).toBe(expected);
  });

  it('request computes refund_amount from policy window', async () => {
    refunds.findOne.mockResolvedValue(null);
    refunds.create.mockImplementation(async (doc: any) => makeDoc({ id: 'rf-1', ...doc }));
    const res = await service.request(
      { id: 'pat-1' },
      { booking_id: 'bk-1', booking_kind: 'appointment', amount_paid: 300, scheduled_at: hoursFromNow(10).toISOString(), reason: 'اختبار' },
    );
    expect(res.refund_percent).toBe(50);
    expect(res.refund_amount).toBe(150);
    expect(events.emit).toHaveBeenCalledWith('refund.requested', { refund_id: 'rf-1' });
  });

  it('duplicate active request returns existing instead of creating', async () => {
    const existing = makeDoc({ id: 'rf-0', state: 'REQUESTED' });
    refunds.findOne.mockResolvedValue(existing);
    const res = await service.request({ id: 'pat-1' }, { booking_id: 'bk-1', amount_paid: 300, reason: 'اختبار' });
    expect(res.id).toBe('rf-0');
    expect(refunds.create).not.toHaveBeenCalled();
  });

  it('rejects missing booking_id / non-positive amount', async () => {
    await expect(service.request({ id: 'pat-1' }, {})).rejects.toThrow(BadRequestException);
    await expect(service.request({ id: 'pat-1' }, { booking_id: 'bk-1', amount_paid: 0 })).rejects.toThrow(BadRequestException);
  });
});
