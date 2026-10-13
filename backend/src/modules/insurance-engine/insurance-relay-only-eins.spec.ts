import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InsuranceFlowService } from './insurance-engine.module';
import { I18nService } from '../i18n/i18n.service';

/**
 * Batch 7 insurance needs-review, chunk oc/E-ins-1.
 *
 * Closes #829, #845 (coverage-check must not read like a live insurer check) and
 * #836, #837 (benefits-summary / coverage-check returned one hard-coded Arabic sentence as
 * `note_ar`, shown verbatim in every language).
 *
 * Queue rule §2 step 5: never send a sentence in one language - send a code, so the client can
 * translate it. And decision 35 / D-37 item 6: nothing in the response may imply a live
 * insurer check; the provider decides on its own system and the facility requests approval.
 */

const POLICY = { company_id: 'c1', company_name: 'شركة', plan_class: 'VIP', member_id: 'M-1', policy_number: 'P-9', expiry_date: '2027-01-01' };

function makeService(opts: { hasPolicy: boolean }) {
  const patient = {
    // myPolicy() calls findOne(...).lean(), so the mock must return a query, not a promise.
    findOne: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ user_id: 'u1', insurance: opts.hasPolicy ? POLICY : null }),
    }),
  };
  const companies = { find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) };
  const svc: any = new (InsuranceFlowService as any)(
    { findOne: jest.fn().mockResolvedValue(null) }, companies, patient,
  );
  return svc;
}

describe('E-ins-1 relay-only insurance answers carry a code, never an Arabic-only sentence', () => {
  const user = { id: 'u1', role: 'patient' };

  it('#837 coverage-check: a policy on file answers with a translatable code', async () => {
    const svc = makeService({ hasPolicy: true });
    const out = await (svc as any).coverageCheckAnswer(user, { service_type: 'lab' });
    expect(out.note_code).toBe('coverage_decided_by_provider');
    expect(out.service_type).toBe('lab');
  });

  it('#837 coverage-check: no policy answers with its own code, not the same one', async () => {
    const svc = makeService({ hasPolicy: false });
    const out = await (svc as any).coverageCheckAnswer(user, {});
    expect(out.note_code).toBe('no_policy_on_file');
  });

  it('#845 coverage-check: exposes the neutral policy-on-file flag alongside `eligible`', async () => {
    const svc = makeService({ hasPolicy: true });
    const out = await (svc as any).coverageCheckAnswer(user, {});
    // `eligible` stays for the clients that call it; `has_policy` is the neutral name.
    expect(out.has_policy).toBe(true);
    expect(out.eligible).toBe(true);
    const none = await (makeService({ hasPolicy: false }) as any).coverageCheckAnswer(user, {});
    expect(none.has_policy).toBe(false);
    expect(none.eligible).toBe(false);
  });

  it('#845 coverage-check: never claims a live insurer check', async () => {
    const svc = makeService({ hasPolicy: true });
    const out = await (svc as any).coverageCheckAnswer(user, {});
    expect(out).not.toHaveProperty('nphies_live');
    expect(out).not.toHaveProperty('nphies_eligible');
    expect(out.live_check).toBe(false);
  });

  it('#836 benefits-summary: rows carry a key, not an Arabic sentence', async () => {
    const svc = makeService({ hasPolicy: true });
    const out = await (svc as any).benefitsAnswer(user);
    expect(out.has_policy).toBe(true);
    expect(Array.isArray(out.benefits)).toBe(true);
    for (const row of out.benefits) {
      expect(typeof row.key).toBe('string');
      expect(row.key).not.toMatch(/[\u0600-\u06FF]/);       // no Arabic text in a code
      expect(typeof row.note_code).toBe('string');
    }
  });

  it('#836 benefits-summary: no policy means no benefit rows at all', async () => {
    const out = await (makeService({ hasPolicy: false }) as any).benefitsAnswer(user);
    expect(out.has_policy).toBe(false);
    expect(out.benefits).toEqual([]);
  });

  it('the policy is returned whole so the card can draw member number and expiry (#838 data check)', async () => {
    const out = await (makeService({ hasPolicy: true }) as any).coverageCheckAnswer(user, {});
    expect(out.policy.member_id).toBe('M-1');
    expect(out.policy.policy_number).toBe('P-9');
    expect(out.policy.expiry_date).toBe('2027-01-01');
    expect(out.policy.plan_class).toBe('VIP');
  });
});
