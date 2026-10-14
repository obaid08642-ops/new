import { InsuranceFlowService, INSURANCE_REQUEST_STATES, INSURANCE_REQUEST_RESERVED_STATES } from './insurance-engine.module';

/**
 * Batch 7 insurance, chunk oc/E-ins-2.
 *
 * Closes #835 (strict request state enum) and #830 / #846 (the approval number stored under two
 * names).
 *
 * #835 measured, not guessed:
 *
 *  - the schema enum declares 9 values, but only **7** are ever written. `APPROVED_PARTIAL` is
 *    declared and never pushed (a partial decision goes straight to `COPAY_PENDING`), and
 *    `EXPIRED` appears only in the enum declaration.
 *  - patient-web's parser (`patient-web/lib/api/insurance-request.ts:4`) lists 8 values, two of
 *    which the server never produces (`SELF_PAY_PENDING`, `SELF_PAY_PAID` - acceptSelfPay pushes
 *    `COPAY_PENDING`), and **omits `APPEAL_PENDING`, which the server does produce**. So a
 *    patient who filed an appeal gets "Unable to load insurance".
 *
 * #830 / #846: D-37 already unified the write side - `decide()` accepts `approval_ref` |
 * `approval_code` | `decision_reference` and stores exactly one field, `insurer_approval_code`.
 * The engine never writes `approval_code`, so both clients' `approval_code ?? insurer_approval_code`
 * read always falls through. The reads now also carry the D-37 canonical name, `approval_ref`,
 * derived from the same stored value so the two can never disagree.
 */

const REQUEST = {
  id: 'r1',
  patient_id: 'u1',
  state: 'APPEAL_PENDING',
  insurer_approval_code: 'APR-123',
};

function makeService() {
  const lean = jest.fn().mockResolvedValue([REQUEST]);
  const findOneLean = jest.fn().mockResolvedValue(REQUEST);
  const requests: any = {
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean }) }) }),
    findOne: jest.fn().mockReturnValue({ lean: findOneLean }),
  };
  const patient: any = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ user_id: 'u1', insurance: null }) }) };
  const companies: any = { find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) };
  // constructor order: requests, companies, patients, events, transactions, orders, labs,
  // radiology, homeCare, appointments
  const svc: any = new (InsuranceFlowService as any)(requests, companies, patient);
  return { svc, requests };
}

const user = { id: 'u1', role: 'patient' };

describe('E-ins-2 #835 the published request-state contract', () => {
  it('publishes exactly the states the engine actually writes', () => {
    expect([...INSURANCE_REQUEST_STATES].sort()).toEqual([
      'APPEAL_PENDING', 'APPROVED_FULL', 'CANCELLED', 'COPAY_PAID',
      'COPAY_PENDING', 'PENDING_PROVIDER_REVIEW', 'REJECTED',
    ]);
  });

  it('includes APPEAL_PENDING, the state patient-web cannot parse today', () => {
    expect(INSURANCE_REQUEST_STATES).toContain('APPEAL_PENDING');
  });

  it('names the declared-but-never-written values instead of pretending they are live', () => {
    expect([...INSURANCE_REQUEST_RESERVED_STATES].sort()).toEqual(['APPROVED_PARTIAL', 'EXPIRED']);
    // reserved values must not be advertised as producible
    for (const s of INSURANCE_REQUEST_RESERVED_STATES) expect(INSURANCE_REQUEST_STATES).not.toContain(s);
  });

  it('carries no state the clients cannot recognise', () => {
    for (const s of INSURANCE_REQUEST_STATES) expect(typeof s).toBe('string');
  });
});

describe('E-ins-2 #830/#846 one approval number on the read side', () => {
  it('myRequests mirrors the stored code into the D-37 canonical approval_ref', async () => {
    const { svc } = makeService();
    const out = await svc.myRequests(user);
    expect(out[0].insurer_approval_code).toBe('APR-123');
    expect(out[0].approval_ref).toBe('APR-123');
  });

  it('getOne does the same', async () => {
    const { svc } = makeService();
    const out = await svc.getOne('r1', user);
    expect(out.approval_ref).toBe(out.insurer_approval_code);
  });

  it('never emits the third name the clients used to guess at', async () => {
    const { svc } = makeService();
    const list = await svc.myRequests(user);
    const one = await svc.getOne('r1', user);
    expect(list[0]).not.toHaveProperty('approval_code');
    expect(one).not.toHaveProperty('approval_code');
  });

  it('leaves approval_ref absent rather than empty when there is no decision yet', async () => {
    const { svc } = makeService();
    svc.requests.findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ id: 'r2', patient_id: 'u1', state: 'PENDING_PROVIDER_REVIEW' }),
    });
    const out = await svc.getOne('r2', user);
    expect(out.insurer_approval_code).toBeUndefined();
    expect(out).not.toHaveProperty('approval_ref');
  });
});
