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
  {
    name: 'check_prescription_required',
    description: 'Verify whether a medicine requires an official prescription under SFDA regulations.',
    inputSchema: {
      type: 'object',
      properties: {
        medicine_slug_or_id: { type: 'string', description: 'Medicine slug, SKU, or ID' },
      },
      required: ['medicine_slug_or_id'],
    },
  },
  {
    name: 'search_medicines',
    description: 'Search official pharmacy catalog for medicines by name, brand, or active ingredient.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Medicine name or active ingredient' },
        limit: { type: 'number', default: 10 },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_doctors',
    description: 'Find verified doctors by specialty, city, or accepted insurance network.',
    inputSchema: {
      type: 'object',
      properties: {
        specialty: { type: 'string', description: 'Medical specialty' },
        city: { type: 'string', description: 'City name (e.g. Riyadh, Jeddah)' },
        insurance: { type: 'string', description: 'Insurance network' },
      },
    },
  },
  {
    name: 'search_facilities',
    description: 'Find verified hospitals, medical clinics, and pharmacy branches.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Hospital or clinic name' },
        city: { type: 'string', description: 'City' },
      },
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

      case 'tools/call': {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};
        // Request ID + idempotency echo (writes must be retried safely by AI callers)
        const requestId = `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const idemKey = typeof toolArgs?.idempotency_key === 'string' ? toolArgs.idempotency_key : null;
        try {
          const toolResult = await this.executeTool(toolName, toolArgs);
          const payload = (toolResult && typeof toolResult === 'object' && !Array.isArray(toolResult))
            ? { request_id: requestId, ...(idemKey ? { idempotency_key: idemKey } : {}), ...toolResult }
            : toolResult;
          this.auditToolCall(toolName, requestId, true, null).catch(() => null);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2) }] },
          };
        } catch (e: any) {
          const mapped = this.toPlatformError(e);
          this.auditToolCall(toolName, requestId, false, mapped.error_code).catch(() => null);
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32000, message: mapped.message, data: { ...mapped, request_id: requestId } },
          };
        }
      }

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
   * Best-effort audit log for every MCP tool call (never blocks the response).
   * Logs tool name + outcome only — never raw arguments (may contain PII).
   */
  private async auditToolCall(tool: string, requestId: string, ok: boolean, errorCode: string | null) {
    try {
      await this.connection.collection('mcp_audit_log').insertOne({
        id: requestId, tool, ok, error_code: errorCode, at: new Date(),
      });
    } catch { /* audit must never break tool execution */ }
  }

  /**
   * Map backend exceptions to the central platform error catalog
   * (backend/src/common/errors.ts) so AI clients get structured codes.
   */
  private toPlatformError(e: any): { error_code: string; message: string } {
    const status = e?.status || e?.statusCode;
    const msg = String(e?.message || 'tool_failed');
    if (/prescription/i.test(msg)) return { error_code: 'PRESCRIPTION_REQUIRED', message: msg };
    if (/not found/i.test(msg)) return { error_code: 'NO_AVAILABILITY', message: msg };
    if (status === 401) return { error_code: 'AUTHENTICATION_REQUIRED', message: msg };
    if (status === 403) return { error_code: 'INSUFFICIENT_PERMISSION', message: msg };
    if (status === 429) return { error_code: 'RATE_LIMITED', message: msg };
    if (/duplicate|already exists/i.test(msg)) return { error_code: 'DUPLICATE_TRANSACTION', message: msg };
    return { error_code: 'SERVICE_UNAVAILABLE', message: msg };
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
      case 'check_prescription_required':
        return this.toolCheckPrescription(args);
      case 'search_medicines':
        return this.toolSearchMedicines(args);
      case 'search_doctors':
        return this.toolSearchDoctors(args);
      case 'search_facilities':
        return this.toolSearchFacilities(args);
      default:
        throw new BadRequestException(`Unknown tool '${name}'`);
    }
  }

  private async toolCheckPrescription(args: Record<string, any>) {
    const { medicine_slug_or_id } = args;
    const med: any = await this.connection.collection('medicines_master').findOne({
      $or: [
        { id: medicine_slug_or_id },
        { slug: medicine_slug_or_id },
        { sku: Number(medicine_slug_or_id) || -1 },
      ],
      // Same public-eligibility gate as the governed catalog: unapproved or
      // deleted medicines must never surface through AI discovery (R2/R27).
      is_deleted: { $ne: true },
      active: { $ne: false },
      public_eligibility: true,
      indexing_eligibility: true,
      medical_review_status: 'approved',
    });
    if (!med) throw new NotFoundException(`Medicine '${medicine_slug_or_id}' not found`);
    return {
      medicine_id: med.id,
      name: med.name_ar || med.name_en,
      requires_prescription: !!med.requires_prescription,
      regulation_notice: med.requires_prescription
        ? 'SFDA: Requires verified medical prescription before fulfillment'
        : 'SFDA: Over-The-Counter (OTC) medication, eligible for direct order',
    };
  }

  private async toolSearchMedicines(args: Record<string, any>) {
    const { query, limit = 10 } = args;
    const regex = new RegExp(String(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const meds = await this.connection.collection('medicines_master').find({
      $or: [{ name_ar: regex }, { name_en: regex }, { active_ingredient: regex }],
      is_deleted: { $ne: true },
      active: { $ne: false },
      public_eligibility: true,
      indexing_eligibility: true,
      medical_review_status: 'approved',
    }).limit(limit).toArray();

    return {
      total: meds.length,
      items: meds.map((m: any) => ({
        id: m.id,
        name: m.name_ar || m.name_en,
        price: m.price,
        currency: 'SAR',
        requires_prescription: !!m.requires_prescription,
        active_ingredient: m.active_ingredient,
        canonical_url: `https://nabd.plus/ar/p/${m.slug || m.id}`,
        deep_link: `nabdplus://p/${m.slug || m.id}`,
      })),
    };
  }

  private async toolSearchDoctors(args: Record<string, any>) {
    const { specialty, city, insurance } = args;
    const filter: any = {
      $or: [{ type: 'doctor' }, { provider_type: 'doctor' }],
      status: { $in: ['active', 'verified'] },
      is_active: { $ne: false },
      is_deleted: { $ne: true },
    };
    if (specialty) filter.specialty = specialty;
    if (city) filter.city = city;
    if (insurance) filter.accepted_insurance = insurance;

    const docs = await this.connection.collection('provider_profiles').find(filter).limit(10).toArray();
    return {
      total: docs.length,
      items: docs.map((d: any) => ({
        id: d.id,
        name: d.name_ar || d.name_en || d.name,
        specialty: d.specialty,
        city: d.city,
        rating: d.rating || d.rating_avg || 0,
        canonical_url: `https://nabd.plus/ar/doctor/${d.slug || d.id}`,
        deep_link: `nabdplus://doctor/${d.slug || d.id}`,
      })),
    };
  }

  private async toolSearchFacilities(args: Record<string, any>) {
    const { query, city } = args;
    const filter: any = {
      is_active: { $ne: false },
      is_deleted: { $ne: true },
      status: { $nin: ['suspended', 'rejected', 'archived'] },
    };
    if (city) filter.city = city;
    if (query) {
      const regex = new RegExp(String(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name_ar: regex }, { name_en: regex }, { name: regex }];
    }

    const [facs, providerFacs] = await Promise.all([
      this.connection.collection('facilities').find(filter).limit(10).toArray(),
      this.connection.collection('provider_profiles').find({
        ...filter,
        type: { $in: ['pharmacy', 'hospital', 'clinic', 'lab', 'radiology', 'laboratory'] },
      }).limit(10).toArray(),
    ]);

    const combined: any[] = [...facs];
    const seenIds = new Set(combined.map(f => f.id || String(f._id)));
    for (const pf of providerFacs) {
      const id = pf.id || String(pf._id);
      if (!seenIds.has(id)) {
        seenIds.add(id);
        combined.push({
          id,
          name_ar: pf.name_ar,
          name_en: pf.name_en,
          type: pf.type,
          city: pf.city,
          slug: pf.slug,
          isProvider: true,
        });
      }
    }

    return {
      total: combined.length,
      items: combined.map((f: any) => ({
        id: f.id,
        name: f.name_ar || f.name_en,
        type: f.type,
        city: f.city,
        canonical_url: f.type === 'pharmacy' ? `https://nabd.plus/ar/pharmacy/${f.slug || f.id}` : `https://nabd.plus/ar/facility/${f.slug || f.id}`,
        deep_link: `nabdplus://${f.type || 'facility'}/${f.slug || f.id}`,
      })),
    };
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
      const doctor = await docCol.findOne({
        $and: [
          { $or: [{ id: entity_id }, { slug: entity_id }] },
          { $or: [{ type: 'doctor' }, { provider_type: 'doctor' }] },
        ],
        status: { $in: ['active', 'verified'] },
        is_active: { $ne: false },
        is_deleted: { $ne: true },
      });
      if (!doctor) throw new NotFoundException(`Doctor '${entity_id}' not found`);
      // Honest availability: verified status + mode support only. Specific
      // times are NEVER invented here — callers must query live slots per date.
      const modeOk = Array.isArray(doctor.consultation_modes)
        ? doctor.consultation_modes.includes(service_mode)
        : true;
      return {
        entity_type: 'doctor',
        entity_id,
        service_mode,
        date: date || new Date().toISOString().split('T')[0],
        available: modeOk,
        available_slots: [],
        slots_note: modeOk
          ? 'Live times must be fetched per date from the booking flow; no specific time is guaranteed by this response.'
          : `Doctor does not offer ${service_mode} consultations.`,
        booking_url: `https://nabd.plus/ar/consultations/doctors/${doctor.id}`,
        deep_link: `nabdplus://consultations/doctor-profile?id=${doctor.id}`,
      };
    }

    if (entity_type === 'medicine') {
      const medCol = this.connection.collection('medicines_master');
      const med = await medCol.findOne({
        $or: [{ slug: entity_id }, { id: entity_id }, { sku: Number(entity_id) || -1 }],
        is_deleted: { $ne: true },
        active: { $ne: false },
        public_eligibility: true,
        indexing_eligibility: true,
        medical_review_status: 'approved',
      });
      if (!med) throw new NotFoundException(`Medicine '${entity_id}' not found`);

      // Honest stock: there is no global stock — availability, branch and
      // delivery are set per pharmacy at offer time. Never invent branches.
      return {
        entity_type: 'medicine',
        entity_id,
        in_stock: null,
        stock_note: 'Stock, branch and delivery time are confirmed per pharmacy when offers arrive — no global claim is made here.',
        requires_prescription: Boolean(med.requires_prescription),
      };
    }

    return {
      entity_type,
      entity_id,
      available: false,
      reason: 'unsupported_entity_type_for_availability',
    };
  }

  private async toolPrepareTransaction(args: Record<string, any>) {
    const { transaction_type, entity_id, quantity = 1, slot, insurance_policy_id } = args;

    if (transaction_type === 'medicine_order') {
      const medCol = this.connection.collection('medicines_master');
      const med = await medCol.findOne({
        $or: [{ slug: entity_id }, { id: entity_id }, { sku: Number(entity_id) || -1 }],
        is_deleted: { $ne: true },
        active: { $ne: false },
        public_eligibility: true,
        indexing_eligibility: true,
        medical_review_status: 'approved',
      });
      if (!med) throw new NotFoundException(`Medicine '${entity_id}' not found`);

      const price = Number(med.price) || 20.0;
      const requiresRx = Boolean(med.requires_prescription);

      // STRICT SAFETY ENFORCEMENT: If prescription is required, AI CANNOT bypass it!
      if (requiresRx) {
        return {
          status: 'BLOCKED_RX_REQUIRED',
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

      // OTC Medicine checkout readiness — catalog unit price ONLY. VAT, totals
      // and delivery are set by the pharmacy offer + insurance decision on the
      // server; this tool never fabricates them (no defaults, no 15% math).
      const unitPrice = Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : null;

      return {
        transaction_type: 'medicine_order',
        entity_id,
        medicine_name: med.name_ar || med.name_en,
        requires_prescription: false,
        can_checkout: true,
        quantity,
        pricing: {
          currency: 'SAR',
          catalog_unit_price: unitPrice,
          pricing_note: unitPrice === null
            ? 'No catalog price on file — the pharmacy offer sets the binding price.'
            : 'Catalog unit price for reference — VAT, delivery and the binding total are set by the pharmacy offer.',
        },
        checkout_url: `https://nabd.plus/ar/cart/checkout?sku=${med.sku || entity_id}&qty=${quantity}`,
        deep_link: `nabdplus://cart/checkout?sku=${med.sku || entity_id}&qty=${quantity}`,
      };
    }

    if (transaction_type === 'consultation_booking') {
      const docCol = this.connection.collection('provider_profiles');
      const doc = await docCol.findOne({
        $and: [
          { $or: [{ id: entity_id }, { slug: entity_id }] },
          { $or: [{ type: 'doctor' }, { provider_type: 'doctor' }] },
        ],
        status: { $in: ['active', 'verified'] },
        is_active: { $ne: false },
        is_deleted: { $ne: true },
      });
      if (!doc) throw new NotFoundException(`Doctor '${entity_id}' not found`);

      // Real per-mode prices from the doctor profile — never a hardcoded fee.
      // Service fee, VAT and the binding total are computed server-side at
      // booking; this tool only prepares, it never quotes a payable total.
      const num = (v: any) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v) * 100) / 100 : null);
      return {
        transaction_type: 'consultation_booking',
        entity_id: doc.id,
        doctor_name: doc.name_ar || doc.name_en,
        specialty: doc.specialty,
        slot: slot || null,
        slot_note: slot
          ? 'Requested slot — availability must be confirmed in the booking flow.'
          : 'No slot requested — live availability must be checked in the booking flow.',
        insurance_policy_id: insurance_policy_id || null,
        can_checkout: true,
        pricing: {
          currency: 'SAR',
          price_clinic: num(doc.price_clinic),
          price_online: num(doc.price_online),
          price_home: num(doc.price_home),
          pricing_note: 'Profile prices for reference — service fee, VAT and the binding total are set server-side at booking.',
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
