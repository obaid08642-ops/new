import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Condition, ConditionDocument } from './schemas/condition.schema';
import { EntityRelation, EntityRelationDocument } from './schemas/entity-relation.schema';
import { SEED_CONDITIONS } from './seeds/conditions.data';
import { LocationService } from '../location/location.service';

export interface RelatedGraphResponse {
  entity_type: string;
  entity_id: string;
  entity: any;
  relationships: Record<string, any>;
}

@Injectable()
export class EntityGraphService implements OnModuleInit {
  private readonly logger = new Logger(EntityGraphService.name);

  constructor(
    @InjectModel(Condition.name) private readonly conditionModel: Model<ConditionDocument>,
    @InjectModel(EntityRelation.name) private readonly relationModel: Model<EntityRelationDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly locationService: LocationService,
  ) {}

  async onModuleInit() {
    await this.seedConditions();
  }

  async seedConditions(): Promise<void> {
    try {
      const count = await this.conditionModel.countDocuments();
      if (count === 0) {
        this.logger.log(`Seeding initial ${SEED_CONDITIONS.length} medical conditions...`);
        for (const cond of SEED_CONDITIONS) {
          await this.conditionModel.updateOne(
            { code: cond.code },
            { $set: cond },
            { upsert: true },
          );
        }
        this.logger.log('Medical conditions seeded successfully.');
      }
    } catch (err: any) {
      this.logger.warn(`Failed to seed conditions: ${err?.message}`);
    }
  }

  /**
   * Traverse the central Entity Graph for any entity (Medicine, Doctor, Condition, Facility).
   */
  async getRelated(entityType: string, entityId: string): Promise<RelatedGraphResponse> {
    switch (entityType.toLowerCase()) {
      case 'medicine':
        return this.getRelatedMedicine(entityId);
      case 'doctor':
        return this.getRelatedDoctor(entityId);
      case 'condition':
        return this.getRelatedCondition(entityId);
      case 'facility':
      case 'hospital':
      case 'clinic':
      case 'pharmacy':
        return this.getRelatedFacility(entityId);
      default:
        throw new NotFoundException(`Unsupported entity type: ${entityType}`);
    }
  }

  private async getRelatedMedicine(identifier: string): Promise<RelatedGraphResponse> {
    const medCol = this.connection.collection('medicines_master');
    const medicine = await medCol.findOne({
      $or: [{ slug: identifier }, { sku: Number(identifier) || -1 }, { id: identifier }],
    });

    if (!medicine) {
      throw new NotFoundException(`Medicine '${identifier}' not found`);
    }

    const activeIng = medicine.active_ingredient || medicine.generic_name;
    let alternatives: any[] = [];
    if (activeIng) {
      alternatives = await medCol
        .find({
          active_ingredient: activeIng,
          _id: { $ne: medicine._id },
        })
        .project({ name_ar: 1, name_en: 1, slug: 1, price: 1, form: 1, strength: 1, sku: 1, image: 1 })
        .limit(6)
        .toArray();
    }

    // Find conditions related to this active ingredient
    let relatedConditions: any[] = [];
    if (activeIng) {
      const ingRegex = new RegExp(activeIng.split(' ')[0], 'i');
      relatedConditions = await this.conditionModel
        .find({ relevant_ingredients: { $in: [ingRegex] }, is_active: true })
        .select({ code: 1, name_ar: 1, name_en: 1, symptoms: 1 })
        .lean();
    }

    return {
      entity_type: 'medicine',
      entity_id: identifier,
      entity: {
        id: medicine.id || String(medicine.sku),
        slug: medicine.slug,
        name_ar: medicine.name_ar,
        name_en: medicine.name_en,
        active_ingredient: medicine.active_ingredient,
        price: medicine.price,
        form: medicine.form,
        strength: medicine.strength,
        requires_prescription: Boolean(medicine.requires_prescription),
      },
      relationships: {
        active_ingredient: activeIng,
        alternatives,
        related_conditions: relatedConditions,
      },
    };
  }

  private async getRelatedDoctor(identifier: string): Promise<RelatedGraphResponse> {
    const docCol = this.connection.collection('provider_profiles');
    const doctor = await docCol.findOne({
      $or: [{ id: identifier }, { slug: identifier }],
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor '${identifier}' not found`);
    }

    // Fetch practicing facility
    let facility: any = null;
    if (doctor.facility_id) {
      const facCol = this.connection.collection('facilities');
      facility = await facCol.findOne(
        { $or: [{ id: doctor.facility_id }, { slug: doctor.facility_id }] },
        { projection: { name_ar: 1, name_en: 1, slug: 1, city: 1, district: 1, address: 1, phone: 1, accepted_insurance: 1 } },
      );
    }

    // Find treated conditions for this specialty
    const specialty = doctor.specialty || doctor.medical_specialty;
    let treatedConditions: any[] = [];
    if (specialty) {
      treatedConditions = await this.conditionModel
        .find({ specialties: specialty, is_active: true })
        .select({ code: 1, name_ar: 1, name_en: 1 })
        .lean();
    }

    return {
      entity_type: 'doctor',
      entity_id: identifier,
      entity: {
        id: doctor.id,
        slug: doctor.slug,
        name_ar: doctor.name_ar || doctor.full_name,
        name_en: doctor.name_en,
        specialty: doctor.specialty,
        rating: doctor.rating || 4.8,
        experience_years: doctor.experience_years,
        city: doctor.city,
      },
      relationships: {
        facility,
        accepted_insurance: doctor.accepted_insurance || facility?.accepted_insurance || [],
        treated_conditions: treatedConditions,
      },
    };
  }

  private async getRelatedCondition(code: string): Promise<RelatedGraphResponse> {
    const condition = await this.conditionModel.findOne({ code, is_active: true }).lean();
    if (!condition) {
      throw new NotFoundException(`Condition '${code}' not found`);
    }

    // Find doctors in relevant specialties
    const docCol = this.connection.collection('provider_profiles');
    const doctors = await docCol
      .find({
        specialty: { $in: condition.specialties },
        is_deleted: { $ne: true },
      })
      .project({ id: 1, slug: 1, name_ar: 1, name_en: 1, specialty: 1, rating: 1, city: 1 })
      .limit(6)
      .toArray();

    // Find medicines containing relevant ingredients
    const medCol = this.connection.collection('medicines_master');
    let medicines: any[] = [];
    if (condition.relevant_ingredients?.length) {
      const ingRegexes = condition.relevant_ingredients.map(ing => new RegExp(ing, 'i'));
      medicines = await medCol
        .find({ active_ingredient: { $in: ingRegexes } })
        .project({ id: 1, sku: 1, slug: 1, name_ar: 1, name_en: 1, price: 1, form: 1, strength: 1, active_ingredient: 1 })
        .limit(6)
        .toArray();
    }

    return {
      entity_type: 'condition',
      entity_id: code,
      entity: condition,
      relationships: {
        specialties: condition.specialties,
        doctors,
        relevant_medicines: medicines,
        recommended_services: condition.relevant_services,
      },
    };
  }

  private async getRelatedFacility(identifier: string): Promise<RelatedGraphResponse> {
    const facCol = this.connection.collection('facilities');
    const facility = await facCol.findOne({
      $or: [{ id: identifier }, { slug: identifier }],
    });

    if (!facility) {
      throw new NotFoundException(`Facility '${identifier}' not found`);
    }

    // Find doctors practicing at this facility
    const docCol = this.connection.collection('provider_profiles');
    const doctors = await docCol
      .find({ facility_id: facility.id, is_deleted: { $ne: true } })
      .project({ id: 1, slug: 1, name_ar: 1, name_en: 1, specialty: 1, rating: 1 })
      .limit(10)
      .toArray();

    return {
      entity_type: 'facility',
      entity_id: identifier,
      entity: {
        id: facility.id,
        slug: facility.slug,
        name_ar: facility.name_ar,
        name_en: facility.name_en,
        type: facility.type,
        city: facility.city,
        district: facility.district,
        phone: facility.phone,
        accepted_insurance: facility.accepted_insurance || [],
      },
      relationships: {
        doctors,
        departments: facility.departments || [],
      },
    };
  }

  /**
   * Find entities matching a multidimensional query (Specialty x City x District x Insurance)
   * Powers programmatic SEO pages and Direct Search Result Destination.
   */
  async explore(filters: {
    specialty?: string;
    city?: string;
    district?: string;
    insurance?: string;
  }) {
    const docCol = this.connection.collection('provider_profiles');
    const query: any = { is_deleted: { $ne: true } };

    if (filters.specialty) {
      query.specialty = new RegExp(`^${filters.specialty}$`, 'i');
    }

    if (filters.city) {
      query.city = new RegExp(filters.city, 'i');
    }

    if (filters.insurance) {
      query.$or = [
        { accepted_insurance: new RegExp(filters.insurance, 'i') },
        { accepted_insurances: new RegExp(filters.insurance, 'i') },
      ];
    }

    const doctors = await docCol
      .find(query)
      .project({ id: 1, slug: 1, name_ar: 1, name_en: 1, specialty: 1, rating: 1, city: 1, facility_id: 1, experience_years: 1 })
      .limit(20)
      .toArray();

    // Fetch related facilities
    const facCol = this.connection.collection('facilities');
    const facQuery: any = {};
    if (filters.city) facQuery.city = new RegExp(filters.city, 'i');
    if (filters.district) facQuery.district = new RegExp(filters.district, 'i');
    if (filters.insurance) facQuery.accepted_insurance = new RegExp(filters.insurance, 'i');
    if (filters.specialty) facQuery.departments = new RegExp(filters.specialty, 'i');

    const facilities = await facCol
      .find(facQuery)
      .project({ id: 1, slug: 1, name_ar: 1, name_en: 1, type: 1, city: 1, district: 1, phone: 1, rating: 1 })
      .limit(10)
      .toArray();

    return {
      filters,
      total_doctors: doctors.length,
      doctors,
      total_facilities: facilities.length,
      facilities,
    };
  }
}
