import { PROVIDER_ROLES } from '../../common/enums';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

async function facilityIdOf(conn: Connection, u: string): Promise<string> {
  const account: any = await conn.collection('provider_accounts')
    .findOne({ $or: [{ id: u }, { user_id: u }, { _id: u }] } as any);
  return account?.facility_id || account?.id || u;
}

const now = () => new Date();

const uid = (u: any) => u?.id || u?._id || u?.user_id;

@Controller('provider/facility')
export class ProviderFacilityController {
  constructor(@InjectConnection() private conn: Connection) {}

  private async staffIds(fid: string): Promise<string[]> {
    const rows = await this.conn.collection('provider_accounts')
      .find({ facility_id: fid } as any).project({ id: 1, user_id: 1 }).toArray();
    return rows.flatMap((r: any) => [r.id, r.user_id].filter(Boolean).map(String));
  }

  /** Names of providers by any of their ids (profile id, account id, user id): the calendar and the patient tracker both show who, not ids. */
  private async providerNames(refs: string[]): Promise<Map<string, { ar: string | null; en: string | null }>> {
    const out = new Map<string, { ar: string | null; en: string | null }>();
    if (!refs.length) return out;
    const profiles: any[] = await this.conn.collection('provider_profiles')
      .find({ $or: [{ id: { $in: refs } }, { account_id: { $in: refs } }, { user_id: { $in: refs } }] } as any)
      .project({ id: 1, account_id: 1, user_id: 1, display_name_ar: 1, display_name_en: 1, name_ar: 1, name_en: 1 }).toArray();
    for (const p of profiles) {
      const name = { ar: p.display_name_ar || p.name_ar || null, en: p.display_name_en || p.name_en || null };
      for (const k of [p.id, p.account_id, p.user_id]) if (k) out.set(String(k), name);
    }
    return out;
  }

  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('audit-logs')
  async auditLogs(@CurrentUser() user: any, @Query('limit') limit = '100') {
    const fid = await facilityIdOf(this.conn, uid(user));
    const rows = await this.conn.collection('facility_audit_logs')
      .find({ facility_id: fid } as any).sort({ createdAt: -1 })
      .limit(Math.min(+limit || 100, 300)).toArray();
    return rows.map((r: any) => ({
      id: String(r._id), actor: r.actor_id, action: r.action, target: r.target,
      meta: r.meta || {}, created_at: r.createdAt,
    }));
  }

  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('calendar')
  async calendar(@CurrentUser() user: any, @Query('days') days = '30') {
    const fid = await facilityIdOf(this.conn, uid(user));
    const ids = await this.staffIds(fid);
    const horizon = new Date(Date.now() + Math.min(+days || 30, 90) * 86400000);
    // appointments carry slot_start and doctor_id = the doctor's profile id, doctor_user_id = the account/user id
    const rows = await this.conn.collection('appointments')
      .find({
        $or: [{ facility_id: fid }, { provider_id: { $in: ids } }, { doctor_id: { $in: ids } }, { doctor_user_id: { $in: ids } }],
        slot_start: { $gte: new Date(Date.now() - 86400000), $lte: horizon },
      } as any)
      .sort({ slot_start: 1 }).limit(300).toArray();
    // the calendar shows who and with whom, not ids: the patient's name (as the patient tracker already gives it to the facility) and the doctor's
    const patientIds = [...new Set(rows.map((a: any) => a.patient_id).filter(Boolean).map(String))];
    const providerRefs = [...new Set(rows.flatMap((a: any) => [a.provider_id, a.doctor_id, a.doctor_user_id]).filter(Boolean).map(String))];
    const [patients, providerName] = await Promise.all([
      patientIds.length ? this.conn.collection('users').find({ id: { $in: patientIds } } as any).project({ id: 1, full_name: 1 }).toArray() : [],
      this.providerNames(providerRefs),
    ]);
    const patientName = new Map((patients as any[]).map((u) => [String(u.id), u.full_name || null]));
    return rows.map((a: any) => {
      const providerId = a.provider_id || a.doctor_id;
      const pn = providerName.get(String(providerId)) ?? providerName.get(String(a.doctor_user_id)) ?? null;
      return {
        id: a.id || String(a._id), patient_id: a.patient_id, patient_name: a.patient_name || patientName.get(String(a.patient_id)) || null,
        provider_id: providerId, provider_name: pn?.ar || pn?.en || null, provider_name_en: pn?.en || pn?.ar || null,
        scheduled_at: a.slot_start || a.scheduled_at, status: a.status, kind: a.kind || 'consultation',
        service_type: a.service_type || null, payment_status: a.payment_status || null,
      };
    });
  }

  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('patients/active')
  async activePatients(@CurrentUser() user: any) {
    const fid = await facilityIdOf(this.conn, uid(user));
    const ids = await this.staffIds(fid);
    const apptFilter: any = {
      $or: [{ facility_id: fid }, { provider_id: { $in: ids } }, { doctor_id: { $in: ids } }, { doctor_user_id: { $in: ids } }],
      status: { $nin: ['CANCELLED', 'cancelled', 'COMPLETED', 'completed'] },
    };
    // upcoming and current appointments, soonest first: the first one of a patient is the one the tracker shows
    const appts: any[] = await this.conn.collection('appointments').find(apptFilter).sort({ slot_start: 1 }).limit(600).toArray();
    // inpatients currently in a bed of this facility
    const admissions: any[] = await this.conn.collection('facility_admissions').find({ facility_id: fid, status: 'active' } as any).toArray();
    const patientIds = [...new Set([...appts.map((a) => a.patient_id), ...admissions.map((a) => a.patient_id)].filter(Boolean).map(String))];
    if (!patientIds.length) return [];

    const bedIds = [...new Set(admissions.map((a) => a.bed_id).filter(Boolean).map(String))];
    const beds: any[] = bedIds.length ? await this.conn.collection('facility_beds').find({ id: { $in: bedIds } } as any).toArray() : [];
    const wardIds = [...new Set(beds.map((b) => b.ward_id).filter(Boolean).map(String))];
    const wards: any[] = wardIds.length ? await this.conn.collection('facility_wards').find({ id: { $in: wardIds } } as any).toArray() : [];
    const bedById = new Map(beds.map((b) => [String(b.id), b]));
    const wardById = new Map(wards.map((w) => [String(w.id), w]));
    const providerRefs = [...new Set(appts.flatMap((a) => [a.provider_id, a.doctor_id, a.doctor_user_id]).filter(Boolean).map(String))];
    const [users, names] = await Promise.all([
      this.conn.collection('users').find({ $or: [{ id: { $in: patientIds } }, { _id: { $in: patientIds } }] } as any)
        .project({ id: 1, full_name: 1, phone: 1, email: 1 }).limit(300).toArray(),
      this.providerNames(providerRefs),
    ]);
    const admissionOf = new Map(admissions.map((a) => [String(a.patient_id), a]));
    const nextAppt = new Map<string, any>();
    for (const a of appts) if (a.patient_id && !nextAppt.has(String(a.patient_id))) nextAppt.set(String(a.patient_id), a);

    return users.map((x: any) => {
      const id = x.id || String(x._id);
      const adm = admissionOf.get(String(id));
      const bed = adm ? bedById.get(String(adm.bed_id)) : undefined;
      const ward = bed ? wardById.get(String(bed.ward_id)) : undefined;
      const appt = nextAppt.get(String(id));
      const dn = appt ? (names.get(String(appt.provider_id || appt.doctor_id)) ?? names.get(String(appt.doctor_user_id)) ?? null) : null;
      return {
        id, name: x.full_name, phone: x.phone, email: x.email,
        // what the facility can really say about the patient: inpatient (a bed) or booked (an appointment), where, since when, with whom
        kind: adm ? 'inpatient' : 'booked',
        admission_id: adm ? (adm.id || String(adm._id)) : null,
        admitted_at: adm?.admitted_at ?? null,
        ward_name: ward?.name ?? null,
        bed_number: bed?.bed_number ?? null,
        bed_type: bed?.type ?? null,
        appointment_id: appt ? (appt.id || String(appt._id)) : null,
        appointment_at: appt ? (appt.slot_start || appt.scheduled_at || null) : null,
        appointment_status: appt?.status ?? null,
        doctor_name: dn?.ar || dn?.en || null,
        doctor_name_en: dn?.en || dn?.ar || null,
      };
    });
  }

  @Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN) // provider screens only: a patient gets 403 (provider-app audit)
  @Get('subaccounts')
  async subaccounts(@CurrentUser() user: any) {
    const fid = await facilityIdOf(this.conn, uid(user));
    const rows = await this.conn.collection('provider_accounts')
      .find({ facility_id: fid } as any)
      .project({ id: 1, email: 1, role: 1, ptype: 1, status: 1, full_name: 1, createdAt: 1 })
      .limit(300).toArray();
    return rows.map((r: any) => ({
      id: r.id || String(r._id), email: r.email, name: r.full_name,
      role: r.role || r.ptype, status: r.status, created_at: r.createdAt,
    }));
  }

  @Get('shifts')
  async shifts(@CurrentUser() user: any, @Query('days') days = '14') {
    const fid = await facilityIdOf(this.conn, uid(user));
    const horizon = new Date(Date.now() + Math.min(+days || 14, 60) * 86400000);
    const rows = await this.conn.collection('shifts')
      .find({ facility_id: fid, date: { $lte: horizon } } as any)
      .sort({ date: 1 }).limit(300).toArray();
    return rows.map((s: any) => ({
      id: s.id || String(s._id), staff_id: s.staff_id, staff_name: s.staff_name,
      role: s.role, date: s.date, start: s.start, end: s.end, status: s.status || 'scheduled',
    }));
  }
}
