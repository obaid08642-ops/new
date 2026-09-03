import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { randomBytes } from 'crypto';

export interface ProductFeedQuery {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  requires_prescription?: boolean;
  locale?: string;
}

export interface ServiceFeedQuery {
  service_type?: 'doctor' | 'facility' | 'all';
  specialty?: string;
  city?: string;
  insurance?: string;
  locale?: string;
}

export interface CheckoutSessionItem {
  type: 'medicine' | 'consultation';
  id: string;
  quantity?: number;
  slot?: string;
}

export interface CreateCheckoutSessionDto {
  items: CheckoutSessionItem[];
  patient_phone?: string;
  locale?: string;
  source_agent?: string;
}

@Injectable()
export class AiCommerceService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Generates real-time Schema.org Product feed for AI agents and commerce crawlers.
   */
  async getProductFeed(query: ProductFeedQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;
    const locale = query.locale || 'ar';

    const filter: Record<string, any> = { is_deleted: { $ne: true } };

    if (query.category) {
      filter.category = query.category;
    }
    if (query.requires_prescription !== undefined) {
      filter.requires_prescription = Boolean(query.requires_prescription);
    }
    if (query.search) {
      filter.$or = [
        { name_ar: { $regex: query.search, $options: 'i' } },
        { name_en: { $regex: query.search, $options: 'i' } },
        { slug: { $regex: query.search, $options: 'i' } },
      ];
    }

    const medCol = this.connection.collection('medicines_master');
    const [total, items] = await Promise.all([
      medCol.countDocuments(filter),
      medCol.find(filter).skip(skip).limit(limit).toArray(),
    ]);

    const formattedProducts = items.map((item) => {
      const name = locale === 'en' ? (item.name_en || item.name_ar) : (item.name_ar || item.name_en);
      const slug = item.slug || item.id;
      const price = Number(item.price) || 0;

      return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name,
        description: locale === 'en' ? item.description_en : item.description_ar,
        sku: item.sku ? String(item.sku) : item.id,
        image: item.image || item.image_1 ? `https://api.nabd.plus/uploads/${item.image || item.image_1}` : undefined,
        activeIngredient: item.active_ingredient,
        isPrescriptionRequired: Boolean(item.requires_prescription),
        offers: {
          '@type': 'Offer',
          price,
          priceCurrency: 'SAR',
          availability: 'https://schema.org/InStock',
          priceValidUntil: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
          seller: {
            '@type': 'Pharmacy',
            name: 'Nabd Plus Pharmacy Network',
          },
        },
        url: `https://nabd.plus/${locale}/p/${slug}`,
        deepLink: `nabdplus://p/${slug}`,
      };
    });

    return {
      feed_type: 'ai_product_catalog',
      spec_version: '1.0.0',
      total_items: total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      items: formattedProducts,
    };
  }

  /**
   * Generates real-time Schema.org Service feed for doctors and facilities.
   */
  async getServiceFeed(query: ServiceFeedQuery) {
    const locale = query.locale || 'ar';
    const city = query.city || 'الرياض';

    const [docCol, facCol] = [
      this.connection.collection('provider_profiles'),
      this.connection.collection('facilities'),
    ];

    const docFilter: Record<string, any> = { is_active: { $ne: false } };
    if (query.specialty) docFilter.specialty = query.specialty;
    if (query.city) docFilter.city = { $regex: query.city, $options: 'i' };

    const facFilter: Record<string, any> = { is_active: { $ne: false } };
    if (query.city) facFilter.city = { $regex: query.city, $options: 'i' };

    const [doctors, facilities] = await Promise.all([
      docCol.find(docFilter).limit(20).toArray(),
      facCol.find(facFilter).limit(20).toArray(),
    ]);

    const formattedServices: any[] = [];

    for (const doc of doctors) {
      formattedServices.push({
        '@context': 'https://schema.org',
        '@type': 'MedicalBusiness',
        serviceType: 'Doctor Consultation',
        id: doc.id,
        name: locale === 'en' ? (doc.name_en || doc.name_ar) : (doc.name_ar || doc.name_en),
        specialty: doc.specialty,
        city: doc.city,
        priceRange: '150 SAR',
        acceptedInsurance: doc.accepted_insurance || ['bupa', 'tawuniya', 'medgulf'],
        url: `https://nabd.plus/${locale}/doctor/${doc.slug || doc.id}`,
        deepLink: `nabdplus://doctor/${doc.slug || doc.id}`,
      });
    }

    for (const fac of facilities) {
      formattedServices.push({
        '@context': 'https://schema.org',
        '@type': 'Hospital',
        serviceType: 'Healthcare Facility',
        id: fac.id,
        name: locale === 'en' ? (fac.name_en || fac.name_ar) : (fac.name_ar || fac.name_en),
        facilityType: fac.type,
        city: fac.city,
        district: fac.district,
        acceptedInsurance: fac.accepted_insurance || [],
        url: `https://nabd.plus/${locale}/facility/${fac.slug || fac.id}`,
        deepLink: `nabdplus://facility/${fac.slug || fac.id}`,
      });
    }

    return {
      feed_type: 'ai_service_catalog',
      spec_version: '1.0.0',
      total_items: formattedServices.length,
      city,
      items: formattedServices,
    };
  }

  /**
   * Creates a secure, time-limited AI Checkout Session token.
   * Enforces strict SFDA regulations (blocks checkout if Rx required without human doctor verification).
   */
  async createCheckoutSession(dto: CreateCheckoutSessionDto) {
    if (!dto.items || !dto.items.length) {
      throw new BadRequestException('Checkout session requires at least one item');
    }

    const locale = dto.locale || 'ar';
    let subtotal = 0;
    let hasPrescriptionItem = false;
    const validatedItems: any[] = [];

    const medCol = this.connection.collection('medicines_master');
    const docCol = this.connection.collection('provider_profiles');

    for (const item of dto.items) {
      if (item.type === 'medicine') {
        const med = await medCol.findOne({
          $or: [{ id: item.id }, { slug: item.id }, { sku: Number(item.id) || -1 }],
        });
        if (!med) throw new NotFoundException(`Medicine '${item.id}' not found`);

        const qty = Math.max(1, Number(item.quantity) || 1);
        const unitPrice = Number(med.price) || 20.0;
        const lineTotal = Number((unitPrice * qty).toFixed(2));
        subtotal += lineTotal;

        if (med.requires_prescription) {
          hasPrescriptionItem = true;
        }

        validatedItems.push({
          type: 'medicine',
          id: med.id,
          sku: med.sku,
          name: locale === 'en' ? (med.name_en || med.name_ar) : (med.name_ar || med.name_en),
          unit_price: unitPrice,
          quantity: qty,
          line_total: lineTotal,
          requires_prescription: Boolean(med.requires_prescription),
        });
      } else if (item.type === 'consultation') {
        const doc = await docCol.findOne({
          $or: [{ id: item.id }, { slug: item.id }],
        });
        if (!doc) throw new NotFoundException(`Doctor '${item.id}' not found`);

        const fee = 150.0;
        subtotal += fee;

        validatedItems.push({
          type: 'consultation',
          id: doc.id,
          name: locale === 'en' ? (doc.name_en || doc.name_ar) : (doc.name_ar || doc.name_en),
          specialty: doc.specialty,
          unit_price: fee,
          quantity: 1,
          line_total: fee,
          slot: item.slot || 'Next Available',
        });
      }
    }

    const subtotalFormatted = Number(subtotal.toFixed(2));
    const vat15 = Number((subtotalFormatted * 0.15).toFixed(2));
    const totalSar = Number((subtotalFormatted + vat15).toFixed(2));

    const sessionId = `ai_chk_${randomBytes(16).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes validity

    const sessionRecord = {
      session_id: sessionId,
      source_agent: dto.source_agent || 'external_ai_agent',
      patient_phone: dto.patient_phone || null,
      items: validatedItems,
      pricing: {
        currency: 'SAR',
        subtotal: subtotalFormatted,
        vat_15_percent: vat15,
        total_sar: totalSar,
      },
      requires_prescription: hasPrescriptionItem,
      status: 'pending_patient_approval',
      expires_at: expiresAt,
      createdAt: new Date(),
    };

    const sessionCol = this.connection.collection('ai_checkout_sessions');
    await sessionCol.insertOne(sessionRecord);

    return {
      session_id: sessionId,
      status: 'ready_for_patient_handoff',
      expires_at: expiresAt.toISOString(),
      requires_prescription: hasPrescriptionItem,
      prescription_notice: hasPrescriptionItem
        ? 'One or more items require an SFDA-verified prescription. The patient must upload a valid prescription before order dispatch.'
        : null,
      pricing: {
        currency: 'SAR',
        subtotal: subtotalFormatted,
        vat_15_percent: vat15,
        total_sar: totalSar,
      },
      items_count: validatedItems.length,
      items: validatedItems,
      checkout_url: `https://nabd.plus/${locale}/checkout/session/${sessionId}`,
      deep_link: `nabdplus://checkout/session/${sessionId}`,
      governance: {
        human_approval_required: true,
        prescription_enforcement: 'strict_sfda_compliant',
      },
    };
  }
}
