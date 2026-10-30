import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { SearchIntentService } from '../search-intent/search-intent.service';
import { EntityGraphService } from '../entity-graph/entity-graph.service';
import { LocationService } from '../location/location.service';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';
import { AGENT_TOOL_SCOPES, issuer, mcpHost } from '../agent-oauth/agent-oauth.constants';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

const IDEM = { type: 'string', description: 'Unique key per attempt; a retry with the same key returns the same result and creates nothing twice.' };
const SCOPE_NOTE = (tool: string) => ` Needs the patient's Nabd sign-in (OAuth scope ${AGENT_TOOL_SCOPES[tool]}).`;
const CHECKOUT_NOTE = ' Returns checkout_url: give it to the patient, who confirms and pays on Nabd Plus. The assistant never pays and cannot select an offer.';

/**
 * AC-3 tools advertised in tools/list so an assistant can discover and call them. Calling one
 * without a token answers HTTP 401 with the RFC 9728 pointer, which starts the sign-in flow.
 */
function agentToolDefinitions(): McpToolDefinition[] {
  const hold = (name: string, description: string, properties: Record<string, unknown>, required: string[]): McpToolDefinition => ({
    name,
    description: description + SCOPE_NOTE(name) + CHECKOUT_NOTE,
    inputSchema: { type: 'object', properties: { ...properties, idempotency_key: IDEM }, required: [...required, 'idempotency_key'] },
  });
  return [
    {
      name: 'consultation_slots',
      description: 'Real available consultation slots for a doctor on a date (public, no sign-in). Never invented.',
      inputSchema: {
        type: 'object',
        properties: {
          doctor_id: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' },
          mode: { type: 'string', enum: ['clinic', 'video', 'home'] },
        },
        required: ['doctor_id', 'date', 'mode'],
      },
    },
    { name: 'my_orders', description: "The signed-in patient's pharmacy orders." + SCOPE_NOTE('my_orders'), inputSchema: { type: 'object', properties: {} } },
    { name: 'my_bookings', description: "The signed-in patient's consultation bookings." + SCOPE_NOTE('my_bookings'), inputSchema: { type: 'object', properties: {} } },
    {
      name: 'create_pharmacy_request',
      description: 'Cart-style OTC pharmacy order: send a list of over-the-counter medicines with quantities. Pharmacies answer with offers; the patient picks one and pays on Nabd Plus. Any prescription or controlled item refuses the whole request (RX_VERIFICATION_REQUIRED with upload and consultation links).'
        + SCOPE_NOTE('create_pharmacy_request') + CHECKOUT_NOTE,
      inputSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array', minItems: 1, maxItems: 50,
            items: { type: 'object', properties: { medicine_id: { type: 'string' }, qty: { type: 'integer', minimum: 1 } }, required: ['medicine_id'] },
          },
          address_id: { type: 'string', description: "One of the patient's saved addresses (default address when omitted)." },
          idempotency_key: IDEM,
        },
        required: ['items', 'idempotency_key'],
      },
    },
    {
      name: 'list_offers',
      description: 'Pharmacy offers received for an order.' + SCOPE_NOTE('list_offers'),
      inputSchema: { type: 'object', properties: { order_id: { type: 'string' }, include_closed: { type: 'boolean' } }, required: ['order_id'] },
    },
    {
      name: 'choose_offer_link',
      description: 'Link to the page where the patient selects an offer and pays. Selects nothing itself.' + SCOPE_NOTE('choose_offer_link'),
      inputSchema: { type: 'object', properties: { order_id: { type: 'string' }, offer_id: { type: 'string' } }, required: ['order_id', 'offer_id'] },
    },
    hold(
      'hold_consultation', 'Hold a real doctor slot for 10 minutes.',
      { doctor_id: { type: 'string' }, slot: { type: 'string', description: 'ISO start time from consultation_slots' }, mode: { type: 'string', enum: ['clinic', 'video', 'home'] } },
      ['doctor_id', 'slot', 'mode'],
    ),
    hold(
      'hold_lab', 'Hold a lab test booking.',
      { service_id: { type: 'string' }, items: { type: 'array', items: { type: 'object', properties: { service_id: { type: 'string' } } } }, scheduled_at: { type: 'string' }, provider_account_id: { type: 'string' }, location_type: { type: 'string', enum: ['facility', 'home'] } },
      ['scheduled_at'],
    ),
    hold(
      'hold_radiology', 'Hold a radiology scan booking at a centre that performs it.',
      { service_id: { type: 'string' }, provider_account_id: { type: 'string', description: 'The radiology centre account' }, scheduled_at: { type: 'string' }, location_type: { type: 'string', enum: ['facility', 'home'] } },
      ['service_id', 'provider_account_id', 'scheduled_at'],
    ),
    hold(
      'hold_nursing', 'Hold a home-nursing visit.',
      { service_id: { type: 'string' }, scheduled_at: { type: 'string' }, provider_id: { type: 'string' }, address: { type: 'object' }, notes: { type: 'string' } },
      ['service_id', 'scheduled_at'],
    ),
    {
      name: 'cancel_hold',
      description: 'Cancel an unpaid hold this assistant created. Paid or foreign bookings are refused.' + SCOPE_NOTE('cancel_hold'),
      inputSchema: { type: 'object', properties: { booking_id: { type: 'string' }, idempotency_key: IDEM }, required: ['booking_id', 'idempotency_key'] },
    },
  ];
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
        entity_type: { type: 'string', enum: ['doctor', 'medicine', 'facility', 'condition', 'lab', 'nursing', 'radiology', 'all'], description: 'Type of entity to filter' },
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
        entity_type: { type: 'string', enum: ['medicine', 'doctor', 'facility', 'condition', 'lab', 'nursing', 'radiology'], description: 'Entity type' },
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
        entity_type: { type: 'string', enum: ['doctor', 'medicine', 'facility', 'lab', 'nursing'], description: 'Entity type' },
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
        locale: { type: 'string', enum: ['ar', 'en', 'ur', 'hi', 'bn', 'fil'], default: 'ar', description: "The user's language for the returned links" },
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
  ...agentToolDefinitions(),
];

/**
 * AC-2 (docs/review/AGENT_COMMERCE_SPEC_2026-10-12.md): MCP Streamable HTTP
 * transport versions this endpoint speaks. `2025-06-18` is current; `2024-11-05`
 * stays so the existing JSON-RPC body shape (WebMCP, llms.txt docs) keeps working.
 */
export const MCP_PROTOCOL_VERSIONS = ['2025-06-18', '2024-11-05'] as const;
export const MCP_LATEST_PROTOCOL_VERSION = '2025-06-18';
export const MCP_LEGACY_PROTOCOL_VERSION = '2024-11-05';

/**
 * Version negotiation for `initialize`: echo the client's version when supported,
 * offer the latest when it asks for something unknown, and keep the legacy version
 * when it sends none (the old JSON-RPC shape has no version field).
 */
export function negotiateProtocolVersion(requested?: unknown): string {
  if (typeof requested === 'string') {
    return (MCP_PROTOCOL_VERSIONS as readonly string[]).includes(requested) ? requested : MCP_LATEST_PROTOCOL_VERSION;
  }
  return MCP_LEGACY_PROTOCOL_VERSION;
}

/**
 * AC-2: the server card both as JSON here and at `/.well-known/mcp/server-card.json`.
 * It names the Streamable HTTP transport plus the OAuth requirement and scopes, so an
 * assistant knows which tools are anonymous and which need a patient sign-in (AC-1).
 *
 * URL rule (owner: nothing invented, and the AI discovery contract test collects every
 * absolute URL): absolute URLs below are only ones that resolve today — the MCP endpoint
 * paths (proxied in deploy/nginx/conf.d/mcp.conf) and the site metadata (a real web route).
 * The RFC 9728 document itself is discovered through the 401 `WWW-Authenticate` header
 * (the normative flow, covered by acceptance case 4), so it stays a relative path here.
 */
export function buildMcpServerCard() {
  const publicUrl = (mcpHost() || 'https://mcp.nabd.plus').replace(/\/$/, '');
  const site = (issuer() || 'https://nabd.plus').replace(/\/$/, '');
  return {
    schema: 'https://modelcontextprotocol.io/server-card/v0',
    name: 'Nabd Plus Healthcare MCP Server',
    description: 'Unified Model Context Protocol (MCP) server for Saudi healthcare discovery, consultation booking, and pharmacy services.',
    version: '1.0.0',
    protocol: {
      transport: 'streamable-http',
      versions_supported: [...MCP_PROTOCOL_VERSIONS],
      json_responses: true,
      sse: false,
      endpoint: `${publicUrl}/api/v1/mcp`,
    },
    capabilities: {
      tools: true,
      // AC-5: no resources or prompts exist on this endpoint (tools only), so nothing else is advertised.
      resources: false,
      prompts: false,
    },
    endpoints: {
      mcp_rpc: `${publicUrl}/api/v1/mcp`,
      tools: `${publicUrl}/api/v1/mcp/tools`,
      server_card: `${publicUrl}/api/v1/mcp/server-card`,
    },
    authorization: {
      type: 'oauth2',
      authorization_server: site,
      authorization_server_metadata: `${site}/.well-known/oauth-authorization-server`,
      // Relative on purpose: absolute MCP-host metadata URLs are not in backend/openapi.json
      // (generated with the /api/v1 prefix), so the discovery contract test cannot resolve them.
      resource_metadata_path: '/.well-known/oauth-protected-resource/api/v1/mcp',
      public_tools_anonymous: true,
      scopes: {
        'agent:read': 'Read the patient’s own orders, bookings and pharmacy offers.',
        'agent:order': 'Send an OTC pharmacy request and read its offers. The patient selects an offer and pays on Nabd Plus.',
        'agent:book': 'Hold a consultation, lab, radiology or nursing slot. The patient confirms and pays on Nabd Plus.',
      },
      authenticated_tools: { ...AGENT_TOOL_SCOPES },
    },
    tools: MCP_TOOLS.map((t) => t.name),
    status: 'active',
    governance: {
      prescription_enforcement: 'strict_sfda_compliant',
      booking_confirmation: 'user_approval_required',
    },
  };
}

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
      case 'initialize': {
        // AC-2: Streamable HTTP version negotiation; the old shape (no version sent)
        // keeps getting the legacy version (WebMCP and the llms.txt docs point at it).
        const version = negotiateProtocolVersion((params as { protocolVersion?: unknown } | undefined)?.protocolVersion);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: version,
            serverInfo: {
              name: 'nabdah-mcp-server',
              version: '1.0.0',
            },
            capabilities: {
              tools: {
                listChanged: false,
              },
            },
          },
        };
      }

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
   * AC-2: Streamable HTTP entry point. Validates the `MCP-Protocol-Version` request
   * header (unknown versions are refused before any tool runs) and reports which
   * version the returned body speaks, so the controller can echo it back in the
   * `MCP-Protocol-Version` response header. JSON responses; no SSE stream.
   */
  async handleRpcRequestWithProtocol(
    body: { jsonrpc?: string; id?: any; method?: string; params?: any },
    headerVersion?: string,
  ): Promise<{ version: string; response: any }> {
    if (
      headerVersion !== undefined &&
      !(MCP_PROTOCOL_VERSIONS as readonly string[]).includes(headerVersion)
    ) {
      return {
        version: headerVersion,
        response: {
          jsonrpc: '2.0',
          id: body?.id ?? null,
          error: {
            code: -32600,
            message: 'unsupported_protocol_version',
            data: { error_code: 'UNSUPPORTED_PROTOCOL_VERSION', supported: [...MCP_PROTOCOL_VERSIONS] },
          },
        },
      };
    }
    if (body?.method === 'initialize') {
      const version = negotiateProtocolVersion(
        (body.params as { protocolVersion?: unknown } | undefined)?.protocolVersion ?? headerVersion,
      );
      const response = await this.handleRpcRequest({ ...body, params: { ...body.params, protocolVersion: version } });
      return { version, response };
    }
    return { version: headerVersion ?? MCP_LEGACY_PROTOCOL_VERSION, response: await this.handleRpcRequest(body) };
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
    const med: any = await this.connection.collection(CATALOG_COLLECTIONS.medicines).findOne({
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
    const meds = await this.connection.collection(CATALOG_COLLECTIONS.medicines).find({
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
      const medCol = this.connection.collection(CATALOG_COLLECTIONS.medicines);
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
    // Links open real pages in the user's language: the patient confirms and pays on Nabd Plus itself.
    const locale = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'].includes(String(args.locale)) ? String(args.locale) : 'ar';
    const site = (process.env.PUBLIC_SITE_ORIGIN || 'https://nabd.plus').replace(/\/$/, '');
    const web = (path: string) => `${site}/${locale}${path}`;

    if (transaction_type === 'medicine_order') {
      const medCol = this.connection.collection(CATALOG_COLLECTIONS.medicines);
      const med = await medCol.findOne({
        $or: [{ slug: entity_id }, { id: entity_id }, { sku: Number(entity_id) || -1 }],
        is_deleted: { $ne: true },
        active: { $ne: false },
        public_eligibility: true,
        indexing_eligibility: true,
        medical_review_status: 'approved',
      });
      if (!med) throw new NotFoundException(`Medicine '${entity_id}' not found`);

      const price = Number(med.price);
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
          prescription_upload_url: web('/pharmacy/scan-prescription'),
          doctor_consultation_url: web('/consultations/specialties'),
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
        // The medicine page, where the patient adds it to the cart (the cart lives on the device and the
        // order goes to pharmacies for offers, so there is no checkout an agent can pre-fill).
        checkout_url: web(`/p/${encodeURIComponent(med.slug || med.id)}`),
        deep_link: `nabdplus://medicine/${encodeURIComponent(med.slug || med.id)}`,
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
        booking_checkout_url: web(`/consultations/book/${encodeURIComponent(doc.id)}`),
        deep_link: `nabdplus://consultations/book/${encodeURIComponent(doc.id)}`,
      };
    }

    if (transaction_type === 'lab_booking') {
      return { transaction_type, entity_id, can_checkout: true, checkout_url: web(`/labs/${encodeURIComponent(entity_id)}`) };
    }
    if (transaction_type === 'nursing_booking') {
      return { transaction_type, entity_id, can_checkout: true, checkout_url: web('/nursing/catalog') };
    }
    throw new BadRequestException(`Unsupported transaction_type '${transaction_type}'`);
  }
}
