import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prescription, PrescriptionDocument } from '../../schemas/prescription.schema';
import { Appointment, AppointmentDocument, APPT_STATES } from '../../schemas/appointment.schema';
import { PrescriptionState, PRESCRIPTION_TRANSITIONS, UserRole } from '../../common/enums';
import { EVENTS } from '../../common/events';
import { MedicinesService } from '../medicines/medicines.service';
import { PrescriptionRepository } from "./repositories/prescription.repository";
import { getEffectiveRoles } from '../../common/auth.guard';

@Injectable()
export class PrescriptionsService {
  constructor(
    @Inject('PrescriptionRepository') private model: PrescriptionRepository,
    private medicines: MedicinesService,
    private events: EventEmitter2,
    @InjectModel(Appointment.name) private appointments: Model<AppointmentDocument>,
  ) {}

  private isPrivilegedAdmin(user: any) {
    const roles = getEffectiveRoles(user);
    return roles.includes(UserRole.ADMIN) || roles.includes(UserRole.SUPER_ADMIN);
  }

  private isOwningDoctor(rx: any, user: any) {
    return getEffectiveRoles(user).includes(UserRole.DOCTOR) && String(rx?.doctor_id || '') === String(user?.id || '');
  }

  private isAssignedPharmacy(rx: any, user: any) {
    return getEffectiveRoles(user).includes(UserRole.PHARMACY) && String(rx?.pharmacy_id || '') === String(user?.id || '');
  }

  /**
   * Creates a prescription only from a verified, in-progress doctor appointment.
   * Patient and doctor identifiers are derived and checked against the server-owned
   * appointment; manually entered or unverified medicines are intentionally refused.
   */
  async create(doctor: any, data: { patient_id: string; appointment_id?: string; items: any[]; diagnosis?: string; notes?: string }) {
    if (!getEffectiveRoles(doctor).includes(UserRole.DOCTOR)) {
      throw new BadRequestException('doctor role is required to create a prescription');
    }
    const doctorId = String(doctor?.id || '');
    const patientId = String(data?.patient_id || '');
    const appointmentId = String(data?.appointment_id || '');
    if (!doctorId || !patientId || !appointmentId) {
      throw new BadRequestException('verified appointment and patient are required');
    }
    if (!Array.isArray(data?.items) || data.items.length === 0) {
      throw new BadRequestException('at least one approved medicine is required');
    }

    const appointment: any = await this.appointments.findOne({
      id: appointmentId,
      patient_id: patientId,
      status: APPT_STATES.IN_PROGRESS,
    });
    const actorIds = [
      doctor?.id,
      doctor?.account_id,
      doctor?.provider_id,
      doctor?.provider_profile_id,
    ].filter((value): value is string => typeof value === 'string' && value.length > 0);
    const appointmentDoctorIds = [appointment?.doctor_user_id, appointment?.doctor_id]
      .filter((value): value is string => typeof value === 'string' && value.length > 0);
    if (!appointment || !actorIds.some(id => appointmentDoctorIds.includes(id))) {
      // Existence-hide foreign, stale, or unverified appointment identifiers.
      // Appointment ownership uses the same server-owned account/profile identity set
      // as its lifecycle mutations, rather than assuming a provider login's id always
      // equals ProviderProfile.user_id.
      throw new NotFoundException('verified in-progress appointment not found');
    }

    const items: any[] = [];
    for (const item of data.items) {
      const medicineId = String(item?.medicine_id || '').trim();
      const dose = String(item?.dose || '').trim();
      const durationDays = Number(item?.duration_days);
      if (!dose || !Number.isFinite(durationDays) || durationDays <= 0) {
        throw new BadRequestException('dose and positive duration_days are required');
      }

      if (!medicineId) {
        // A doctor may record an exceptional medicine only on this verified prescription.
        // It is deliberately not written to medicines_master and cannot be treated as approved.
        const manualNameAr = String(item?.manual_name_ar || '').trim();
        const manualNameEn = String(item?.manual_name_en || '').trim();
        if (!manualNameAr && !manualNameEn) {
          throw new BadRequestException('manual medicine name is required');
        }
        items.push({
          medicine_id: undefined,
          medicine_name_ar: manualNameAr || manualNameEn,
          medicine_name_en: manualNameEn || undefined,
          active_ingredient: String(item?.manual_active_ingredient || '').trim() || undefined,
          dose,
          frequency_hours: item.frequency_hours,
          times_per_day: item.times_per_day,
          duration_days: durationDays,
          instructions: item.instructions,
          is_manual_entry: true,
          verified: false,
          manual_review_status: 'PENDING_REVIEW',
        });
        continue;
      }

      const medicine: any = await this.medicines.getById(medicineId);
      if (medicine?.verified !== true) {
        throw new BadRequestException('medicine must be approved before prescription use');
      }
      items.push({
        medicine_id: medicine.id,
        medicine_name_ar: medicine.name_ar,
        medicine_name_en: medicine.name_en,
        active_ingredient: medicine.active_ingredient,
        dose,
        frequency_hours: item.frequency_hours,
        times_per_day: item.times_per_day,
        duration_days: durationDays,
        instructions: item.instructions,
        is_manual_entry: false,
        verified: true,
        manual_review_status: 'NOT_APPLICABLE',
      });
    }

    const rx: any = await this.model.create({
      doctor_id: doctorId,
      patient_id: patientId,
      appointment_id: appointmentId,
      items,
      diagnosis: String(data?.diagnosis || '').trim() || undefined,
      notes: String(data?.notes || '').trim() || undefined,
      has_manual_entries: items.some(item => item.is_manual_entry),
      state: PrescriptionState.CREATED_BY_DOCTOR,
    });
    await this.appointments.updateOne(
      { id: appointmentId, patient_id: patientId, doctor_id: appointment.doctor_id },
      { $addToSet: { prescriptions: rx.id } },
    );
    this.events.emit(EVENTS.PRESCRIPTION_CREATED, {
      prescription_id: rx.id,
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_id: appointmentId,
    });
    return rx.toObject();
  }

  // Patient uploads scan (image OCR pending in AI module)
  async uploadByPatient(patient: any, data: { upload_image: string; items?: any[]; notes?: string }) {
    const items: any[] = [];
    let hasManual = false;
    for (const it of data.items || []) {
      // Normalize the name field — OCR may return any of these keys.
      const medName = (it.name_ar || it.medicine_name_ar || it.name || it.name_en || '').toString().trim();
      const medNameEn = (it.name_en || it.medicine_name_en || '').toString().trim() || undefined;
      if (!medName) continue; // skip blank items rather than crashing
      let medId = it.medicine_id;
      if (!medId) {
        try {
          const m = await this.medicines.createManualEntry(
            { name_ar: medName, name_en: medNameEn, active_ingredient: it.active_ingredient, category: 'medications' },
            patient.id,
            patient.role,
          );
          medId = m.id;
          hasManual = true;
        } catch (e) {
          // graceful — still record the line with no id so admin/pharmacy can review
          medId = undefined;
          hasManual = true;
        }
      }
      items.push({
        medicine_id: medId,
        medicine_name_ar: medName,
        medicine_name_en: medNameEn,
        active_ingredient: it.active_ingredient,
        dose: it.dose,
        frequency_hours: it.frequency_hours,
        times_per_day: it.times_per_day,
        duration_days: it.duration_days,
        quantity: it.quantity,
        instructions: it.frequency || it.instructions,
        is_manual_entry: !it.medicine_id,
      });
    }
    const rx = await this.model.create({
      patient_id: patient.id,
      upload_image: data.upload_image,
      notes: data.notes,
      state: PrescriptionState.CREATED_BY_DOCTOR, // patient-uploaded but starts here for pharmacy review
      items,
      has_manual_entries: hasManual,
    });
    this.events.emit(EVENTS.PRESCRIPTION_CREATED, { prescription_id: rx.id, patient_id: rx.patient_id });
    return rx.toObject();
  }

  async transition(id: string, to: PrescriptionState, by: any) {
    const rx = await this.model.findOne({ id });
    if (!rx) throw new NotFoundException();
    const isAdmin = this.isPrivilegedAdmin(by);
    const isInitialDoctorTransition = rx.state === PrescriptionState.CREATED_BY_DOCTOR && this.isOwningDoctor(rx, by);
    const isAssignedPharmacyTransition = rx.state !== PrescriptionState.CREATED_BY_DOCTOR && this.isAssignedPharmacy(rx, by);
    if (!isAdmin && !isInitialDoctorTransition && !isAssignedPharmacyTransition) {
      throw new NotFoundException();
    }
    const allowed = PRESCRIPTION_TRANSITIONS[rx.state] || [];
    if (!isAdmin && !allowed.includes(to)) {
      throw new BadRequestException(`Invalid transition ${rx.state} → ${to}`);
    }
    if (to === PrescriptionState.DISPENSED && (rx.items || []).some((item: any) =>
      item.is_manual_entry && item.manual_review_status !== 'SUBSTITUTED_APPROVED',
    )) {
      throw new BadRequestException('manual prescription items require an approved substitute before dispensing');
    }
    rx.state = to;
    if (to === PrescriptionState.SENT_TO_PHARMACY) this.events.emit(EVENTS.PRESCRIPTION_SENT, { prescription_id: id });
    if (to === PrescriptionState.DISPENSED) this.events.emit(EVENTS.PRESCRIPTION_DISPENSED, { prescription_id: id });
    await rx.save();
    return rx.toObject();
  }

  async sendToPharmacy(id: string, pharmacy_id: string, by: any) {
    const rx: any = await this.model.findOne({ id });
    if (!rx || (!this.isPrivilegedAdmin(by) && !this.isOwningDoctor(rx, by))) throw new NotFoundException();
    if (rx.state !== PrescriptionState.CREATED_BY_DOCTOR) {
      throw new BadRequestException(`Invalid transition ${rx.state} → ${PrescriptionState.SENT_TO_PHARMACY}`);
    }
    rx.pharmacy_id = String(pharmacy_id || '');
    if (!rx.pharmacy_id) throw new BadRequestException('pharmacy_id is required');
    rx.state = PrescriptionState.SENT_TO_PHARMACY;
    await rx.save();
    this.events.emit(EVENTS.PRESCRIPTION_SENT, { prescription_id: id, pharmacy_id: rx.pharmacy_id });
    return rx.toObject();
  }

  async substitute(id: string, itemIndex: number, newMedicineId: string, by: any) {
    const rx = await this.model.findOne({ id });
    if (!rx || (!this.isPrivilegedAdmin(by) && !this.isAssignedPharmacy(rx, by))) throw new NotFoundException();
    const item: any = rx.items[itemIndex];
    if (!item) throw new BadRequestException('Invalid item index');
    const medicine: any = await this.medicines.getById(String(newMedicineId || ''));
    if (medicine?.verified !== true) {
      throw new BadRequestException('manual prescription items require an approved substitute');
    }
    item.substituted = true;
    item.substituted_to_medicine_id = medicine.id;
    if (item.is_manual_entry) {
      item.manual_review_status = 'SUBSTITUTED_APPROVED';
      item.manual_reviewed_by = by?.id;
      item.manual_reviewed_at = new Date();
    }
    rx.state = PrescriptionState.PARTIALLY_EDITED;
    await rx.save();
    this.events.emit(EVENTS.PRESCRIPTION_MODIFIED, { prescription_id: id });
    return rx.toObject();
  }

  /** Manual prescription items stay on their prescription and are reviewed by the assigned pharmacy or an admin. */
  async manualReviewQueue(user: any) {
    const query: any = {
      has_manual_entries: true,
      'items.manual_review_status': 'PENDING_REVIEW',
    };
    if (user?.role !== UserRole.ADMIN) query.pharmacy_id = user?.id;
    return this.model.find(query, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100);
  }

  /** Active prescriptions for the patient — everything not dispensed/archived. */
  async activeForPatient(user: any) {
    return this.model.find(
      { patient_id: user.id, state: { $nin: [PrescriptionState.DISPENSED, PrescriptionState.ARCHIVED] } },
      { _id: 0, __v: 0 },
    ).sort({ createdAt: -1 }).limit(100);
  }

  async listMine(patient_id: string) {
    return this.model.find({ patient_id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100);
  }
  async listForDoctor(doctor_id: string) {
    return this.model.find({ doctor_id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200);
  }
  async listForPharmacy(pharmacy_id: string) {
    return this.model.find({ pharmacy_id, state: { $in: [PrescriptionState.SENT_TO_PHARMACY, PrescriptionState.PARTIALLY_EDITED, PrescriptionState.APPROVED] } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200);
  }
  /**
   * Returns a prescription only to a participating patient, doctor, pharmacy,
   * or privileged administrator. A foreign lookup is deliberately indistinguishable
   * from a missing record so identifiers cannot be used for enumeration.
   */
  async getByIdForUser(id: string, user: any) {
    const rx = await this.model.findOne({ id }, { _id: 0, __v: 0 });
    if (!rx) throw new NotFoundException();
    const roles = getEffectiveRoles(user);
    const hasPrivilegedAdminRole = roles.includes(UserRole.ADMIN) || roles.includes(UserRole.SUPER_ADMIN);
    const isParticipant = [rx.patient_id, rx.doctor_id, rx.pharmacy_id].filter(Boolean).includes(user?.id);
    if (!hasPrivilegedAdminRole && !isParticipant) throw new NotFoundException();
    return rx;
  }
}
