import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { MedicalProfile } from '../../schemas/medical-profile.schema';
import { MedicalProfileRepository } from "./repositories/medicalprofile.repository";

/**
 * Medical Profile service — patient-owned with provider-read access (future-ready).
 */
@Injectable()
export class MedicalProfileService {
  constructor(@Inject('MedicalProfileRepository') private readonly model: MedicalProfileRepository) {}

  /** Get-or-create patient's medical profile */
  async getOrCreate(user: any) {
    let p = await this.model.findOne({ patient_id: user.id });
    if (!p) {
      p = await this.model.create({ patient_id: user.id, gender: 'unspecified' });
    }
    return p;
  }

  async update(user: any, body: any) {
    const allowed = ['blood_type', 'height_cm', 'weight_kg', 'birth_date', 'gender', 'is_pregnant', 'pregnancy_weeks', 'is_breastfeeding', 'is_smoker', 'drinks_alcohol', 'chronic_diseases', 'allergies', 'surgeries', 'long_term_medications', 'family_history', 'dependents', 'emergency_contact', 'notes'];
    const $set: any = { last_updated_at: new Date(), last_updated_by_id: user.id };
    for (const k of allowed) if (body[k] !== undefined) $set[k] = body[k];
    const p = await this.model.findOneAndUpdate({ patient_id: user.id }, { $set }, { new: true, upsert: true });
    return p.toObject();
  }

  // Provider-side view (future: with role check)
  async getForPatient(user: any, patientId: string) {
    // FUTURE: enforce that `user` has active consultation/order with patientId
    const p = await this.model.findOne({ patient_id: patientId }, { _id: 0, __v: 0 });
    if (!p) throw new NotFoundException();
    return p;
  }

  // Item-level helpers for chronic_diseases / allergies / surgeries / long_term_medications
  async addItem(user: any, list: 'chronic_diseases' | 'allergies' | 'surgeries' | 'long_term_medications' | 'family_history', item: any) {
    const p = await this.getOrCreate(user);
    (p as any)[list] = [...((p as any)[list] || []), { ...item, id: require('uuid').v4(), added_at: new Date() }];
    p.last_updated_at = new Date();
    p.last_updated_by_id = user.id;
    await p.save();
    return p.toObject();
  }

  async removeItem(user: any, list: string, itemId: string) {
    const p = await this.getOrCreate(user);
    (p as any)[list] = ((p as any)[list] || []).filter((x: any) => x.id !== itemId);
    p.last_updated_at = new Date();
    p.last_updated_by_id = user.id;
    await p.save();
    return p.toObject();
  }
}
