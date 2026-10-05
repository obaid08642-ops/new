import { NotFoundException } from '@nestjs/common';
import { Connection } from 'mongoose';
import { ProviderOpsService } from './provider-ops.module';
import { ProviderProductionService } from '../provider-production/provider-production.module';

/**
 * Blacklist / CRM writes need a patient account with a care relationship to
 * the acting provider, and every other case (unknown id, non-patient account,
 * patient never served) answers the same 404 — no existence oracle.
 * Cancel/unblock are idempotent on an existing target (matchedCount).
 */
type Row = Record<string, unknown>;
type Filter = Record<string, unknown>;

function matches(row: Row, filter: Filter): boolean {
  return Object.entries(filter).every(([key, cond]) => {
    const value = key.split('.').reduce<unknown>((acc, part) => (acc && typeof acc === 'object' ? (acc as Row)[part] : undefined), row);
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
      const c = cond as { $eq?: unknown; $in?: unknown[] };
      if ('$eq' in c) return value === c.$eq;
      if (c.$in) return c.$in.includes(value);
    }
    return value === cond;
  });
}

function fakeDb(data: Record<string, Row[]>) {
  const writes: Array<{ collection: string; filter: Filter }> = [];
  const collection = (name: string) => {
    const rows = data[name] || [];
    return {
      findOne: jest.fn(async (filter: Filter) => rows.find((r) => matches(r, filter)) || null),
      find: jest.fn((filter: Filter) => {
        const hit = rows.filter((r) => matches(r, filter));
        const cursor = { sort: () => cursor, limit: () => cursor, toArray: async () => hit };
        return cursor;
      }),
      updateOne: jest.fn(async (filter: Filter) => {
        writes.push({ collection: name, filter });
        const n = rows.filter((r) => matches(r, filter)).length;
        return { matchedCount: n, modifiedCount: 0, upsertedCount: 0 };
      }),
      deleteOne: jest.fn(async () => ({ deletedCount: 0 })),
    };
  };
  const conn = { collection: jest.fn((name: string) => collection(name)) } as unknown as Connection;
  return { conn, writes };
}

const DOCTOR = 'doc-user-1';
const baseData = (): Record<string, Row[]> => ({
  users: [
    { id: 'pat-served', role: 'patient' },
    { id: 'pat-stranger', role: 'patient' },
    { id: 'admin-1', role: 'admin' },
    { id: 'doc-other', role: 'doctor' },
  ],
  appointments: [
    { id: 'appt-1', patient_id: 'pat-served', doctor_user_id: DOCTOR },
    // the admin and the other doctor even have an appointment row: still not patients
    { id: 'appt-2', patient_id: 'admin-1', doctor_user_id: DOCTOR },
    { id: 'appt-3', patient_id: 'doc-other', doctor_user_id: DOCTOR },
  ],
  doctor_blacklist: [{ doctor_id: DOCTOR, patient_id: 'pat-served', active: false }],
  doctor_leaves: [{ id: 'leave-1', doctor_id: DOCTOR, status: 'cancelled' }],
});

describe('ProviderOpsService blacklist/CRM care relationship', () => {
  it.each(['pat-unknown', 'pat-stranger', 'admin-1', 'doc-other'])('404s and writes nothing for %s', async (target) => {
    const { conn, writes } = fakeDb(baseData());
    const svc = new ProviderOpsService(conn);
    await expect(svc.blacklistPatient(DOCTOR, target, 'r')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.putPatientCrm(DOCTOR, target, { tags: ['x'] })).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.getPatientCrm(DOCTOR, target)).rejects.toThrow('patient_not_found');
    expect(writes).toEqual([]);
  });

  it('allows blacklist and CRM for a patient with an appointment with this doctor', async () => {
    const { conn, writes } = fakeDb(baseData());
    const svc = new ProviderOpsService(conn);
    await expect(svc.blacklistPatient(DOCTOR, 'pat-served', 'r')).resolves.toEqual({ ok: true, blacklisted: true });
    await expect(svc.putPatientCrm(DOCTOR, 'pat-served', { tags: ['vip'] })).resolves.toEqual(expect.objectContaining({ tags: ['vip'] }));
    expect(writes.map((w) => w.collection)).toEqual(['doctor_blacklist', 'doctor_patient_crm']);
  });

  it('does not treat another doctor\'s patient as this doctor\'s patient', async () => {
    const { conn } = fakeDb(baseData());
    await expect(new ProviderOpsService(conn).blacklistPatient('doc-user-2', 'pat-served')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('unblock and cancel-leave are idempotent on an existing entry and 404 on an unknown one', async () => {
    const { conn } = fakeDb(baseData());
    const svc = new ProviderOpsService(conn);
    await expect(svc.unblacklistPatient(DOCTOR, 'pat-served')).resolves.toEqual({ ok: true });
    await expect(svc.unblacklistPatient(DOCTOR, 'pat-stranger')).rejects.toThrow('blacklist_entry_not_found');
    await expect(svc.cancelLeave(DOCTOR, 'leave-1')).resolves.toEqual({ ok: true });
    await expect(svc.cancelLeave(DOCTOR, 'leave-unknown')).rejects.toThrow('leave_not_found');
  });
});

describe('ProviderProductionService.putCrm care relationship', () => {
  const pharmacy = { id: 'pharm-1', role: 'pharmacy' };
  const lab = { id: 'lab-1', role: 'lab' };
  const data = (): Record<string, Row[]> => ({
    ...baseData(),
    pharmacy_orders: [{ id: 'ord-1', patient_account_id: 'pat-served' }],
    pharmacy_allocations: [{ order_id: 'ord-1', pharmacy_account_id: 'pharm-1' }],
    labbookings: [{ id: 'lb-1', provider_account_id: 'lab-1', patient_id: 'pat-stranger' }],
  });

  it.each(['pat-unknown', 'pat-stranger', 'admin-1'])('404s and writes nothing for %s (pharmacy)', async (target) => {
    const { conn, writes } = fakeDb(data());
    await expect(new ProviderProductionService(conn).putCrm(pharmacy, target, { vip: true })).rejects.toThrow('patient_not_found');
    expect(writes).toEqual([]);
  });

  it('allows the pharmacy that served the patient and the lab that booked the patient', async () => {
    const { conn, writes } = fakeDb(data());
    const svc = new ProviderProductionService(conn);
    await expect(svc.putCrm(pharmacy, 'pat-served', { vip: true })).resolves.toEqual(expect.objectContaining({ vip: true }));
    await expect(svc.putCrm(lab, 'pat-stranger', { favorite: true })).resolves.toEqual(expect.objectContaining({ favorite: true }));
    expect(writes).toHaveLength(2);
  });

  it('allows a doctor with an appointment with the patient', async () => {
    const { conn } = fakeDb(data());
    await expect(new ProviderProductionService(conn).putCrm({ id: DOCTOR, role: 'doctor' }, 'pat-served', {})).resolves.toBeDefined();
  });
});
