import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prescription, PrescriptionDocument } from '../../schemas/prescription.schema';
import { PrescriptionState, PRESCRIPTION_TRANSITIONS, UserRole } from '../../common/enums';
import { EVENTS } from '../../common/events';
import { MedicinesService } from '../medicines/medicines.service';
import { PrescriptionRepository } from "./repositories/prescription.repository";

@Injectable()
export class PrescriptionsService {
  constructor(
    @Inject('PrescriptionRepository') private model: PrescriptionRepository,
    private medicines: MedicinesService,
    private events: EventEmitter2,
  ) {}

  // Doctor creates a prescription with items. Manual entries allowed (bypass validation)
  async create(doctor: any, data: { patient_id: string; appointment_id?: string; items: any[]; diagnosis?: string; notes?: string }) {
    let hasManual = false;
    const items = [];
    for (const it of data.items || []) {
      let medId = it.medicine_id;
      let medName = it.medicine_name_ar;
      // If doctor provided manual entry (no medicine_id), create unverified master record
      if (!medId && it.medicine_name_ar) {
        const m = await this.medicines.createManualEntry(
          { name_ar: it.medicine_name_ar, name_en: it.medicine_name_en, active_ingredient: it.active_ingredient, category: 'medications' },
          doctor.id,
          doctor.role,
        );
        medId = m.id;
        medName = m.name_ar;
        hasManual = true;
      }
      items.push({
        medicine_id: medId,
        medicine_name_ar: medName,
        medicine_name_en: it.medicine_name_en,
        active_ingredient: it.active_ingredient,
        dose: it.dose,
        frequency_hours: it.frequency_hours,
        times_per_day: it.times_per_day,
        duration_days: it.duration_days,
        instructions: it.instructions,
        is_manual_entry: !it.medicine_id,
      });
    }
    const rx = await this.model.create({
      doctor_id: doctor.id,
      patient_id: data.patient_id,
      appointment_id: data.appointment_id,
      items,
      diagnosis: data.diagnosis,
      notes: data.notes,
      has_manual_entries: hasManual,
      state: PrescriptionState.CREATED_BY_DOCTOR,
    });
    this.events.emit(EVENTS.PRESCRIPTION_CREATED, { prescription_id: rx.id, patient_id: rx.patient_id });
    if (hasManual) this.events.emit(EVENTS.PRESCRIPTION_MANUAL_ENTRY, { prescription_id: rx.id });
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
    const allowed = PRESCRIPTION_TRANSITIONS[rx.state] || [];
    if (by.role !== UserRole.ADMIN && !allowed.includes(to)) {
      throw new BadRequestException(`Invalid transition ${rx.state} → ${to}`);
    }
    rx.state = to;
    if (to === PrescriptionState.SENT_TO_PHARMACY) this.events.emit(EVENTS.PRESCRIPTION_SENT, { prescription_id: id });
    if (to === PrescriptionState.DISPENSED) this.events.emit(EVENTS.PRESCRIPTION_DISPENSED, { prescription_id: id });
    await rx.save();
    return rx.toObject();
  }

  async sendToPharmacy(id: string, pharmacy_id: string, by: any) {
    const rx = await this.model.findOneAndUpdate(
      { id },
      { $set: { pharmacy_id, state: PrescriptionState.SENT_TO_PHARMACY } },
      { new: true },
    );
    if (!rx) throw new NotFoundException();
    this.events.emit(EVENTS.PRESCRIPTION_SENT, { prescription_id: id, pharmacy_id });
    return rx.toObject();
  }

  async substitute(id: string, itemIndex: number, newMedicineId: string, by: any) {
    const rx = await this.model.findOne({ id });
    if (!rx) throw new NotFoundException();
    if (!rx.items[itemIndex]) throw new BadRequestException('Invalid item index');
    rx.items[itemIndex].substituted = true;
    rx.items[itemIndex].substituted_to_medicine_id = newMedicineId;
    rx.state = PrescriptionState.PARTIALLY_EDITED;
    await rx.save();
    this.events.emit(EVENTS.PRESCRIPTION_MODIFIED, { prescription_id: id });
    return rx.toObject();
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
  async getById(id: string) {
    const rx = await this.model.findOne({ id }, { _id: 0, __v: 0 });
    if (!rx) throw new NotFoundException();
    return rx;
  }
}
