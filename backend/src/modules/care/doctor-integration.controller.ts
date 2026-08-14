import { Controller, Put, Post, Body, Get, Param, UseGuards, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DoctorProfileExtended } from './schemas/doctor-profile-extended.schema';
import { EncounterRecord } from './schemas/encounter-record.schema';

@Controller('provider/doctor-engine')
export class DoctorIntegrationController {
  constructor(
    @InjectModel(DoctorProfileExtended.name) private doctorProfileModel: Model<DoctorProfileExtended>,
    @InjectModel(EncounterRecord.name) private encounterModel: Model<EncounterRecord>
  ) {}

  @Put('synchronize-settings')
  async synchronizeSettings(@Body() payload: any) {
    const { doctorId, priceClinic, priceOnline, priceHome, maxRadius, networks, images } = payload;
    
    // Perform upsert database transactions removing mockup values dynamically
    const profile = await this.doctorProfileModel.findOneAndUpdate(
      { doctor_id: new Types.ObjectId(doctorId) },
      {
        $set: {
          price_clinic: priceClinic,
          price_online: priceOnline,
          price_home: priceHome,
          max_home_visit_radius_km: maxRadius,
          accepted_insurance_networks: networks,
          clinic_gallery_images: images
        }
      },
      { upsert: true, new: true }
    );
    return { success: true, payload: profile };
  }

  @Post('finalize-encounter')
  async finalizeEncounter(@Body() encounterDto: any) {
    // Fix 2: Immutability Guard on Manual Insurance Entries
    // Ensure the encounter is not already finalized to prevent tampering with committed insurance parameters
    const existingRecord = await this.encounterModel.findOne({ appointment_id: new Types.ObjectId(encounterDto.appointmentId) });
    if (existingRecord) {
      throw new ConflictException('Encounter is already finalized. Insurance and clinical records are permanently locked and immutable.');
    }

    // Write clinical encounter record downstream and commit transactional financial states
    const record = await this.encounterModel.create({
      appointment_id: new Types.ObjectId(encounterDto.appointmentId),
      patient_id: new Types.ObjectId(encounterDto.patientId),
      doctor_id: new Types.ObjectId(encounterDto.doctorId),
      diagnosis_text: encounterDto.diagnosisText,
      prescribed_medications: encounterDto.medications,
      insurance_claim_snapshot: encounterDto.insuranceSnapshot
    });
    return { success: true, reference_token: record._id };
  }
}
