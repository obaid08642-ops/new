import { createHash, createHmac } from 'crypto';

/** AC-1 (docs/review/AGENT_COMMERCE_SPEC_2026-10-12.md): scopes an AI assistant can ask a patient for. */
export const AGENT_SCOPES = ['agent:read', 'agent:order', 'agent:book'] as const;
export type AgentScope = (typeof AGENT_SCOPES)[number];

/** Authenticated MCP tools (AC-3) and the scope each needs. Public tools are not listed. */
export const AGENT_TOOL_SCOPES: Record<string, AgentScope> = {
  my_orders: 'agent:read',
  my_bookings: 'agent:read',
  list_offers: 'agent:read',
  create_pharmacy_request: 'agent:order',
  choose_offer_link: 'agent:order',
  hold_consultation: 'agent:book',
  hold_lab: 'agent:book',
  hold_nursing: 'agent:book',
  cancel_hold: 'agent:book',
};

export const ACCESS_TOKEN_TTL_S = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 3600_000;
export const AUTH_CODE_TTL_MS = 5 * 60_000;

export const COLLECTIONS = {
  clients: 'agent_oauth_clients',
  codes: 'agent_oauth_codes',
  connections: 'agent_oauth_connections',
  sessions: 'agent_oauth_sessions',
} as const;

const trimSlash = (s: string) => s.replace(/\/+$/, '');

/** The patient web: issuer and consent page. */
export function issuer(): string {
  return trimSlash(process.env.NABD_PUBLIC_URL || 'https://nabd.plus');
}

/** The host that serves this backend's MCP endpoint. */
export function mcpHost(): string {
  return trimSlash(process.env.MCP_PUBLIC_URL || 'https://mcp.nabd.plus');
}

/** The protected resource (RFC 8707 / RFC 9728): access tokens carry it as `aud`. */
export function mcpResource(): string {
  return `${mcpHost()}/api/v1/mcp`;
}

/** RFC 9728 metadata URL for the MCP resource (path-inserted well-known). */
export function resourceMetadataUrl(): string {
  return `${mcpHost()}/.well-known/oauth-protected-resource/api/v1/mcp`;
}

/**
 * Signing key for agent access tokens. Never JWT_SECRET itself, so an agent token is
 * never accepted as a patient session by JwtAuthGuard (and the reverse).
 */
export function agentSigningSecret(): string {
  if (process.env.AGENT_OAUTH_SECRET) return process.env.AGENT_OAUTH_SECRET;
  const base = process.env.JWT_SECRET;
  if (!base) throw new Error('JWT_SECRET is not configured');
  return createHmac('sha256', base).update('nabd-agent-oauth-access-v1').digest('hex');
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const b64url = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function authorizationServerMetadata() {
  const api = `${mcpHost()}/api/v1/oauth`;
  return {
    issuer: issuer(),
    authorization_endpoint: `${issuer()}/oauth/authorize`,
    token_endpoint: `${api}/token`,
    registration_endpoint: `${api}/register`,
    revocation_endpoint: `${api}/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    revocation_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [...AGENT_SCOPES],
    service_documentation: `${issuer()}/auth.md`,
  };
}

export function protectedResourceMetadata() {
  return {
    resource: mcpResource(),
    authorization_servers: [issuer()],
    scopes_supported: [...AGENT_SCOPES],
    bearer_methods_supported: ['header'],
    resource_name: 'Nabd Plus MCP server',
    resource_documentation: `${issuer()}/auth.md`,
  };
}
