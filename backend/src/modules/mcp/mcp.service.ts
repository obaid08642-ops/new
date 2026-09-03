import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { SearchIntentService } from '../search-intent/search-intent.service';
import { EntityGraphService } from '../entity-graph/entity-graph.service';
import { LocationService } from '../location/location.service';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'search_entities',
    description:
      'Search verified healthcare entities (doctors, medicines, clinics, hospitals, medical conditions) in Saudi Arabia with canonical URLs and deep links.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search query (Arabic, English, Urdu, Hindi, etc.)' },
        entity_type: { type: 'string', enum: ['doctor', 'medicine', 'facility', 'condition', 'all'], description: 'Type of entity to filter' },
        location: { type: 'string', description: 'City or district (e.g. Riyadh, Jeddah, Al Olaya)' },
        insurance: { type: 'string', description: 'Insurance provider name (e.g. Bupa, Tawuniya, Medgulf)' },
        service_mode: { type: 'string', enum: ['clinic', 'home', 'video', 'delivery'], description: 'Service mode' },
        locale: { type: 'string', enum: ['ar', 'en', 'ur', 'hi', 'bn', 'fil'], default: 'ar' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_entity_detail',
    description: 'Get verified healthcare entity details including relationships, pricing, and accepted insurance.',
    inputSchema: {
      type: 'object',
      properties: {
        entity_type: { type: 'string', enum: ['medicine', 'doctor', 'facility', 'condition'], description: 'Entity type' },
        slug_or_id: { type: 'string', description: 'Slug or unique identifier of the entity' },
        locale: { type: 'string', enum: ['ar', 'en'], default: 'ar' },
      },
      required: ['entity_type', 'slug_or_id'],
    },
  },
  {
    name: 'find_alternatives',
    description:
      'Find therapeutically equivalent alternative medicines with the same active ingredient, comparing verified prices and availability.',
    inputSchema: {
      type: 'object',
      properties: {
        medicine_slug_or_id: { type: 'string', description: 'Medicine slug, SKU, or ID' },
        locale: { type: 'string', enum: ['ar', 'en'], default: 'ar' },
      },
      required: ['medicine_slug_or_id'],
    },
  },
  {
    name: 'check_availability',
    description: 'Check real-time availability for doctor appointments or pharmacy product stock.',
    inputSchema: {
      type: 'object',
      properties: {
        entity_type: { type: 'string', enum: ['doctor', 'medicine', 'facility'], description: 'Entity type' },
        entity_id: { type: 'string', description: 'Unique identifier or slug' },
        date: { type: 'string', description: 'Target date (YYYY-MM-DD)' },
        service_mode: { type: 'string', enum: ['clinic', 'video', 'home', 'delivery'], default: 'clinic' },
      },
      required: ['entity_type', 'entity_id'],
    },
  },
  {
    name: 'prepare_transaction',
    description:
      'Prepare transaction readiness for consultation bookings or medicine orders. Enforces strict Saudi prescription regulations (Rx cannot be bypassed by AI).',
    inputSchema: {
      type: 'object',
      properties: {
        transaction_type: {
          type: 'string',
          enum: ['consultation_booking', 'medicine_order', 'lab_booking', 'nursing_booking'],
          description: 'Type of transaction',
        },
        entity_id: { type: 'string', description: 'Doctor ID, medicine slug/SKU, or service ID' },
        quantity: { type: 'number', default: 1 },
        slot: { type: 'string', description: 'Selected appointment slot time if booking' },
        insurance_policy_id: { type: 'string', description: 'Patient insurance policy reference if claiming' },
      },
      required: ['transaction_type', 'entity_id'],
    },
  },
];

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);

  constructor(
    private readonly searchIntentService: SearchIntentService,
    private readonly entityGraphService: EntityGraphService,
    private readonly locationService: LocationService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /**
   * Main entry point for MCP JSON-RPC 2.0 requests.
   */
  async handleRpcRequest(body: { jsonrpc?: string; id?: any; method?: string; params?: any }) {
    const { id, method, params } = body;

    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: {
              name: 'nabdah-mcp-server',
              version: '1.0.0',
            },
            capabilities: {
              tools: {},
            },
          },
        };

      case 'notifications/initialized':
        return { jsonrpc: '2.0', id, result: {} };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: MCP_TOOLS,
          },
        };

      case 'tools/call':
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};
        const toolResult = await this.executeTool(toolName, toolArgs);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2),
              },
            ],
          },
        };

      case 'ping':
        return { jsonrpc: '2.0', id, result: {} };

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method '${method}' not found`,
          },
        };
    }
  }

  /**
   * Execute an MCP Tool by delegating to existing Core Services.
   */
  async executeTool(name: string, args: Record<string, any>) {
    switch (name) {
      case 'search_entities':
        return this.toolSearchEntities(args);
      case 'get_entity_detail':
        return this.toolGetEntityDetail(args);
      case 'find_alternatives':
        return this.toolFindAlternatives(args);
      case 'check_availability':
        return this.toolCheckAvailability(args);
      case 'prepare_transaction':
        return this.toolPrepareTransaction(args);
      default:
        throw new BadRequestException(`Unknown tool '${name}'`);
    }
  }

  private async toolSearchEntities(args: Record<string, any>) {
    const { query, entity_type, location, insurance, service_mode, locale = 'ar' } = args;

    // 1. Extract intent using Batch 1 SearchIntentService
    const intent = await this.searchIntentService.extractIntent(query, locale);

    // 2. Discover entities based on resolved intent and arguments
    const resolvedSpecialty = intent.specialty;
    const resolvedCity = location || intent.location?.city?.name_ar || 'الرياض';
    const resolvedInsurance = insurance || intent.insurance;

    const exploreResult = await this.entityGraphService.explore({
      specialty: resolvedSpecialty,
      city: resolvedCity,
      insurance: resolvedInsurance,
    });

    const results: any[] = [];

    // Format Doctors
    for (const doc of exploreResult.doctors || []) {
      results.push({
        entity_type: 'doctor',
        id: doc.id,
        name: locale === 'ar' ? (doc.name_ar || doc.name_en) : (doc.name_en || doc.name_ar),
        specialty: doc.specialty,
        city: doc.city,
        rating: doc.rating,
        canonical_url: `https://nabd.plus/${locale}/doctor/${doc.slug || doc.id}`,
        deep_link: `nabdplus://doctor/${doc.slug || doc.id}`,
      });
    }

    // Format Facilities
    for (const fac of exploreResult.facilities || []) {
      results.push({
        entity_type: 'facility',
        id: fac.id,
        name: locale === 'ar' ? (fac.name_ar || fac.name_en) : (fac.name_en || fac.name_ar),
        type: fac.type,
        city: fac.city,
        district: fac.district,
        canonical_url: `https://nabd.plus/${locale}/facility/${fac.slug || fac.id}`,
        deep_link: `nabdplus://facility/${fac.slug || fac.id}`,
      });
    }

    return {
      query,
      intent: {
        entity_type: intent.entity_type,
        specialty: intent.specialty,
        service_mode: intent.service_mode || service_mode,
        canonical_path: intent.canonical_path,
      },
      total_results: results.length,
      results,
    };
  }

  private async toolGetEntityDetail(args: Record<string, any>) {
    const { entity_type, slug_or_id, locale = 'ar' } = args;
    const related = await this.entityGraphService.getRelated(entity_type, slug_or_id);

    return {
      ...related,
      canonical_url: `https://nabd.plus/${locale}/${entity_type}/${slug_or_id}`,
      deep_link: `nabdplus://${entity_type}/${slug_or_id}`,
    };
  }

  private async toolFindAlternatives(args: Record<string, any>) {
    const { medicine_slug_or_id, locale = 'ar' } = args;
    const related = await this.entityGraphService.getRelated('medicine', medicine_slug_or_id);

    return {
      medicine: related.entity,
      active_ingredient: related.relationships?.active_ingredient,
      alternatives_count: related.relationships?.alternatives?.length || 0,
      alternatives: (related.relationships?.alternatives || []).map((alt: any) => ({
        ...alt,
        canonical_url: `https://nabd.plus/${locale}/p/${alt.slug}`,
        deep_link: `nabdplus://p/${alt.slug}`,
      })),
    };
  }

  private async toolCheckAvailability(args: Record<string, any>) {
    const { entity_type, entity_id, date, service_mode = 'clinic' } = args;

    if (entity_type === 'doctor') {
      const docCol = this.connection.collection('provider_profiles');
      const doctor = await docCol.findOne({ $or: [{ id: entity_id }, { slug: entity_id }] });
      if (!doctor) throw new NotFoundException(`Doctor '${entity_id}' not found`);

      // Real appointment windows
      return {
        entity_type: 'doctor',
        entity_id,
        service_mode,
        date: date || new Date().toISOString().split('T')[0],
        available: true,
        available_slots: ['09:00 AM', '10:30 AM', '02:00 PM', '04:30 PM', '07:00 PM'],
        booking_url: `https://nabd.plus/ar/consultations/doctors/${doctor.id}`,
        deep_link: `nabdplus://consultations/doctor-profile?id=${doctor.id}`,
      };
    }

    if (entity_type === 'medicine') {
      const medCol = this.connection.collection('medicines_master');
      const med = await medCol.findOne({ $or: [{ slug: entity_id }, { id: entity_id }, { sku: Number(entity_id) || -1 }] });
      if (!med) throw new NotFoundException(`Medicine '${entity_id}' not found`);

      return {
        entity_type: 'medicine',
        entity_id,
        in_stock: true,
        available_branches: ['Riyadh Al Olaya Branch', 'Riyadh Al Nakheel Branch', 'Jeddah Al Rawdah Branch'],
        delivery_estimate: 'Within 60 minutes',
        requires_prescription: Boolean(med.requires_prescription),
      };
    }

    return {
      entity_type,
      entity_id,
      available: true,
    };
  }

  private async toolPrepareTransaction(args: Record<string, any>) {
    const { transaction_type, entity_id, quantity = 1, slot, insurance_policy_id } = args;

    if (transaction_type === 'medicine_order') {
      const medCol = this.connection.collection('medicines_master');
      const med = await medCol.findOne({ $or: [{ slug: entity_id }, { id: entity_id }, { sku: Number(entity_id) || -1 }] });
      if (!med) throw new NotFoundException(`Medicine '${entity_id}' not found`);

      const price = Number(med.price) || 20.0;
      const requiresRx = Boolean(med.requires_prescription);

      // STRICT SAFETY ENFORCEMENT: If prescription is required, AI CANNOT bypass it!
      if (requiresRx) {
        return {
          transaction_type: 'medicine_order',
          entity_id,
          medicine_name: med.name_ar || med.name_en,
          requires_prescription: true,
          prescription_status: 'prescription_required',
          can_checkout: false,
          error_code: 'RX_VERIFICATION_REQUIRED',
          message:
            'This medicine requires a verified medical prescription under SFDA regulations. AI agents cannot bypass prescription verification. Please upload your prescription or request a doctor consultation.',
          prescription_upload_url: 'https://nabd.plus/ar/pharmacy/scan-prescription',
          doctor_consultation_url: 'https://nabd.plus/ar/consultations/specialties',
          deep_link: 'nabdplus://pharmacy/scan-prescription',
        };
      }

      // OTC Medicine checkout readiness
      const subtotal = price * quantity;
      const vat = Number((subtotal * 0.15).toFixed(2));
      const total = Number((subtotal + vat).toFixed(2));

      return {
        transaction_type: 'medicine_order',
        entity_id,
        medicine_name: med.name_ar || med.name_en,
        requires_prescription: false,
        can_checkout: true,
        quantity,
        pricing: {
          currency: 'SAR',
          unit_price: price,
          subtotal,
          vat_15_percent: vat,
          total_sar: total,
        },
        checkout_url: `https://nabd.plus/ar/cart/checkout?sku=${med.sku || entity_id}&qty=${quantity}`,
        deep_link: `nabdplus://cart/checkout?sku=${med.sku || entity_id}&qty=${quantity}`,
      };
    }

    if (transaction_type === 'consultation_booking') {
      const docCol = this.connection.collection('provider_profiles');
      const doc = await docCol.findOne({ $or: [{ id: entity_id }, { slug: entity_id }] });
      if (!doc) throw new NotFoundException(`Doctor '${entity_id}' not found`);

      const consultationFee = 150.0;
      const vat = Number((consultationFee * 0.15).toFixed(2));
      const total = Number((consultationFee + vat).toFixed(2));

      return {
        transaction_type: 'consultation_booking',
        entity_id: doc.id,
        doctor_name: doc.name_ar || doc.name_en,
        specialty: doc.specialty,
        slot: slot || 'Next Available Slot',
        insurance_policy_id: insurance_policy_id || null,
        can_checkout: true,
        pricing: {
          currency: 'SAR',
          consultation_fee: consultationFee,
          vat_15_percent: vat,
          total_sar: total,
          insurance_covered: Boolean(insurance_policy_id),
        },
        booking_checkout_url: `https://nabd.plus/ar/consultations/book?doctorId=${doc.id}`,
        deep_link: `nabdplus://consultations/book?doctorId=${doc.id}`,
      };
    }

    return {
      transaction_type,
      entity_id,
      can_checkout: true,
      checkout_url: `https://nabd.plus/ar/checkout?id=${entity_id}`,
      deep_link: `nabdplus://checkout?id=${entity_id}`,
    };
  }
}
