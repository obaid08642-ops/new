/**
 * P22.9 — prescriptions as PDFs with a QR code that verifies them.
 * Real pdfkit + qrcode (declared deps); mocked repositories.
 */
import { NotFoundException } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';

const SECRET = 'p22-test-qr-secret';

const rxDoc = (over: Record<string, unknown> = {}) => {
  const base = {
    id: 'rx-1',
    patient_id: 'pat-1',
    doctor_id: 'doc-1',
    pharmacy_id: undefined,
    state: 'CREATED_BY_DOCTOR',
    diagnosis: 'flu',
    createdAt: new Date('2026-09-01T10:00:00Z'),
    items: [{ medicine_name_ar: 'بنادول', dose: '1 tab', duration_days: 5 }],
    ...over,
  };
  return { ...base, toObject: () => ({ ...base }) };
};

describe('PrescriptionsService documents (P22.9)', () => {
  let svc: PrescriptionsService;
  let model: { findOne: jest.Mock };
  const patient = { id: 'pat-1', role: 'patient' };
  const prevSecret = process.env.PRESCRIPTION_QR_SECRET;

  beforeAll(() => { process.env.PRESCRIPTION_QR_SECRET = SECRET; });
  afterAll(() => {
    if (prevSecret === undefined) delete process.env.PRESCRIPTION_QR_SECRET;
    else process.env.PRESCRIPTION_QR_SECRET = prevSecret;
  });

  beforeEach(() => {
    model = { findOne: jest.fn() };
    svc = new PrescriptionsService(
      model as unknown as never,
      { getById: jest.fn() } as unknown as never,
      { emit: jest.fn() } as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
    );
    jest.clearAllMocks();
  });

  it('a minted token verifies with the core fields', async () => {
    const rx = rxDoc();
    model.findOne.mockResolvedValueOnce(rx);
    const token = svc.issueVerifyToken(rx);
    const verdict = await svc.verifyToken(token) as { authentic: boolean; prescription: { id: string } };
    expect(verdict.authentic).toBe(true);
    expect(verdict.prescription.id).toBe('rx-1');
  });

  it('a tampered token fails closed', async () => {
    const rx = rxDoc();
    const token = svc.issueVerifyToken(rx);
    const [body, sig] = token.split('.');
    // Rewrite the payload (different rx id) while keeping valid JSON + signature:
    // the HMAC must catch it.
    const parsed = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    const forged = Buffer.from(JSON.stringify({ ...parsed, rx: 'rx-forged' }), 'utf8')
      .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const verdict = await svc.verifyToken(`${forged}.${sig}`) as { authentic: boolean; reason: string };
    expect(verdict).toEqual({ authentic: false, reason: 'signature_mismatch' });
    const badSig = await svc.verifyToken(`${body}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`) as { authentic: boolean; reason: string };
    expect(badSig.reason).toBe('signature_mismatch');
  });

  it('an expired token is rejected as expired', async () => {
    const rx = rxDoc();
    const token = svc.issueVerifyToken(rx, -1000);
    const verdict = await svc.verifyToken(token) as { authentic: boolean; reason: string };
    expect(verdict).toEqual({ authentic: false, reason: 'expired' });
  });

  it('editing the lines after issuance invalidates printed QRs', async () => {
    const rx = rxDoc();
    const token = svc.issueVerifyToken(rx);
    model.findOne.mockResolvedValueOnce(rxDoc({ items: [{ medicine_name_ar: 'بنادول', dose: '2 tabs', duration_days: 5 }] }));
    const verdict = await svc.verifyToken(token) as { authentic: boolean; reason: string };
    expect(verdict).toEqual({ authentic: false, reason: 'content_changed_since_issue' });
  });

  it('malformed tokens and missing prescriptions fail closed', async () => {
    expect(await svc.verifyToken('nope')).toEqual({ authentic: false, reason: 'malformed_token' });
    expect(await svc.verifyToken('')).toEqual({ authentic: false, reason: 'malformed_token' });
    const rx = rxDoc();
    const token = svc.issueVerifyToken(rx);
    model.findOne.mockResolvedValueOnce(null);
    expect(await svc.verifyToken(token)).toEqual({ authentic: false, reason: 'prescription_not_found' });
  });

  it('the QR payload carries no PII — only rx id + timestamps + hash', () => {
    const rx = rxDoc();
    const token = svc.issueVerifyToken(rx);
    const [body] = token.split('.');
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    expect(Object.keys(payload).sort()).toEqual(['exp', 'h', 'iat', 'rx']);
    expect(JSON.stringify(payload)).not.toContain('بنادول');
    expect(JSON.stringify(payload)).not.toContain('pat-1');
  });

  it('prescriptionPdf renders a real PDF for participants only', async () => {
    model.findOne.mockResolvedValue(rxDoc());
    const buf = await svc.prescriptionPdf(patient, 'rx-1');
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
    await expect(svc.prescriptionPdf({ id: 'stranger', role: 'patient' }, 'rx-1')).rejects.toThrow(NotFoundException);
    model.findOne.mockResolvedValueOnce(null);
    await expect(svc.prescriptionPdf(patient, 'missing')).rejects.toThrow(NotFoundException);
  }, 60000);
});
