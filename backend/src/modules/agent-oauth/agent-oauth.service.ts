import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Connection } from 'mongoose';
import { createHash, randomBytes, randomUUID } from 'crypto';
import {
  ACCESS_TOKEN_TTL_S, AGENT_SCOPES, AUTH_CODE_TTL_MS, AgentScope, COLLECTIONS, REFRESH_TOKEN_TTL_MS,
  agentSigningSecret, b64url, issuer, mcpResource, sha256,
} from './agent-oauth.constants';

/** RFC 6749 §5.2 / RFC 7591 §3.2.2 error body. */
export class OAuthError extends HttpException {
  constructor(error: string, description?: string, status = HttpStatus.BAD_REQUEST) {
    super({ error, ...(description ? { error_description: description } : {}) }, status);
  }
}

export interface AuthorizeParams {
  response_type?: string;
  client_id?: string;
  redirect_uri?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  scope?: string;
  state?: string;
  resource?: string;
}

export interface AgentPrincipal {
  patient_id: string;
  client_id: string;
  session_id: string;
  scopes: AgentScope[];
}

const CHALLENGE_RE = /^[A-Za-z0-9_-]{43,128}$/;
const VERIFIER_RE = /^[A-Za-z0-9._~-]{43,128}$/;
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);

/**
 * AC-1: OAuth 2.1 authorization server for AI assistants (MCP authorization).
 * Authorization code + PKCE (S256 only), dynamic client registration (RFC 7591) plus an
 * admin-managed client list, rotating refresh tokens, RFC 7009 revocation, and one stored
 * consent per client and patient. Agent access tokens are JWTs for the MCP resource only,
 * signed with a key that JwtAuthGuard does not accept, so they never act as a patient session.
 */
@Injectable()
export class AgentOAuthService implements OnModuleInit {
  private readonly logger = new Logger(AgentOAuthService.name);

  constructor(@InjectConnection() private readonly conn: Connection) {}

  private col(name: keyof typeof COLLECTIONS) {
    return this.conn.collection(COLLECTIONS[name]);
  }

  private jwt() {
    return new JwtService({ secret: agentSigningSecret() });
  }

  async onModuleInit() {
    try {
      await this.col('clients').createIndex({ client_id: 1 }, { unique: true });
      await this.col('codes').createIndex({ code_hash: 1 }, { unique: true });
      await this.col('codes').createIndex({ expires_at: 1 }, { expireAfterSeconds: 3600 });
      await this.col('connections').createIndex({ client_id: 1, patient_id: 1 }, { unique: true });
      await this.col('sessions').createIndex({ refresh_hash: 1 });
      await this.col('sessions').createIndex({ client_id: 1, patient_id: 1 });
    } catch (e: any) {
      this.logger.warn(`agent oauth indexes: ${e?.message}`);
    }
  }

  // ── Clients ───────────────────────────────────────────────────────────────

  private validRedirect(uri: unknown): boolean {
    if (typeof uri !== 'string' || uri.length > 2048) return false;
    let u: URL;
    try { u = new URL(uri); } catch { return false; }
    if (u.hash) return false;
    if (u.protocol === 'https:') return true;
    // RFC 8252 §7.3: native and CLI clients use the loopback interface over http.
    return u.protocol === 'http:' && LOOPBACK.has(u.hostname);
  }

  /** RFC 7591 dynamic registration: public clients only. */
  async register(body: {
    client_name?: string; redirect_uris?: string[]; grant_types?: string[]; response_types?: string[];
    token_endpoint_auth_method?: string; client_uri?: string; logo_uri?: string; scope?: string;
  }, source: 'dynamic' | 'admin' = 'dynamic') {
    const redirects = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
    if (!redirects.length || redirects.length > 10 || !redirects.every((r) => this.validRedirect(r))) {
      throw new OAuthError('invalid_redirect_uri', 'redirect_uris must be https (or http on loopback)');
    }
    const method = body.token_endpoint_auth_method ?? 'none';
    if (method !== 'none') throw new OAuthError('invalid_client_metadata', 'only public clients (token_endpoint_auth_method=none)');
    const grants = body.grant_types ?? ['authorization_code', 'refresh_token'];
    if (!grants.every((g) => g === 'authorization_code' || g === 'refresh_token')) {
      throw new OAuthError('invalid_client_metadata', 'unsupported grant_types');
    }
    const responses = body.response_types ?? ['code'];
    if (!responses.every((r) => r === 'code')) throw new OAuthError('invalid_client_metadata', 'unsupported response_types');
    const name = String(body.client_name || '').trim().slice(0, 120);
    if (!name) throw new OAuthError('invalid_client_metadata', 'client_name is required');
    const now = new Date();
    const client = {
      client_id: `nabd-agent-${b64url(randomBytes(18))}`,
      client_name: name,
      redirect_uris: redirects,
      grant_types: grants,
      response_types: responses,
      token_endpoint_auth_method: 'none',
      ...(body.client_uri && this.validRedirect(body.client_uri) ? { client_uri: body.client_uri } : {}),
      ...(body.logo_uri && this.validRedirect(body.logo_uri) ? { logo_uri: body.logo_uri } : {}),
      source,
      blocked: false,
      created_at: now,
    };
    await this.col('clients').insertOne({ ...client });
    return this.publicClient(client, true);
  }

  private publicClient(c: any, withIssuedAt = false) {
    return {
      client_id: c.client_id,
      client_name: c.client_name,
      redirect_uris: c.redirect_uris,
      grant_types: c.grant_types,
      response_types: c.response_types,
      token_endpoint_auth_method: 'none',
      ...(c.client_uri ? { client_uri: c.client_uri } : {}),
      ...(c.logo_uri ? { logo_uri: c.logo_uri } : {}),
      ...(withIssuedAt ? { client_id_issued_at: Math.floor(new Date(c.created_at).getTime() / 1000) } : {}),
    };
  }

  private async activeClient(clientId: unknown) {
    if (typeof clientId !== 'string' || !clientId || clientId.length > 200) return null;
    const c: any = await this.col('clients').findOne({ client_id: { $eq: clientId } });
    return c && !c.blocked ? c : null;
  }

  // ── Admin client list ────────────────────────────────────────────────────

  async adminList() {
    const rows = await this.col('clients').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(500).toArray();
    return rows.map((c: any) => ({ ...this.publicClient(c), source: c.source, blocked: !!c.blocked, created_at: c.created_at }));
  }

  async adminCreate(body: { client_name: string; redirect_uris: string[]; client_uri?: string; logo_uri?: string }) {
    return this.register({ ...body, token_endpoint_auth_method: 'none' }, 'admin');
  }

  /** Block (or unblock) a client. Blocking ends every token it holds. */
  async adminSetBlocked(clientId: string, blocked: boolean) {
    const r = await this.col('clients').updateOne({ client_id: { $eq: clientId } }, { $set: { blocked, updated_at: new Date() } });
    if (!r.matchedCount) throw new NotFoundException('client_not_found');
    if (blocked) {
      await this.col('sessions').updateMany({ client_id: clientId, revoked: { $ne: true } }, { $set: { revoked: true, revoked_at: new Date(), revoked_reason: 'client_blocked' } });
      await this.col('codes').updateMany({ client_id: clientId, used: false }, { $set: { used: true } });
    }
    return { client_id: clientId, blocked };
  }

  // ── Authorization (consent) ──────────────────────────────────────────────

  private parseScopes(scope: unknown): AgentScope[] {
    const raw = typeof scope === 'string' && scope.trim() ? scope.trim().split(/\s+/) : ['agent:read'];
    const unknown = raw.filter((s) => !(AGENT_SCOPES as readonly string[]).includes(s));
    if (unknown.length) throw new OAuthError('invalid_scope', `unknown scope: ${unknown.join(' ').slice(0, 100)}`);
    return AGENT_SCOPES.filter((s) => raw.includes(s));
  }

  /** Validates an authorization request. Never redirects on an invalid client or redirect_uri. */
  async validateAuthorize(p: AuthorizeParams) {
    const client = await this.activeClient(p.client_id);
    if (!client) throw new OAuthError('invalid_client', 'unknown or blocked client');
    if (typeof p.redirect_uri !== 'string' || !client.redirect_uris.includes(p.redirect_uri)) {
      throw new OAuthError('invalid_request', 'redirect_uri is not registered for this client');
    }
    if (p.response_type !== 'code') throw new OAuthError('unsupported_response_type', 'response_type must be code');
    if (p.code_challenge_method !== 'S256') throw new OAuthError('invalid_request', 'code_challenge_method must be S256');
    if (typeof p.code_challenge !== 'string' || !CHALLENGE_RE.test(p.code_challenge)) {
      throw new OAuthError('invalid_request', 'a S256 code_challenge is required');
    }
    if (p.resource !== undefined && p.resource !== mcpResource()) throw new OAuthError('invalid_target', 'unknown resource');
    if (p.state !== undefined && (typeof p.state !== 'string' || p.state.length > 500)) throw new OAuthError('invalid_request', 'state too long');
    const scopes = this.parseScopes(p.scope);
    return { client, scopes };
  }

  /** Data for the consent page (patient-web). */
  async consentData(patientId: string, p: AuthorizeParams) {
    const { client, scopes } = await this.validateAuthorize(p);
    const existing: any = await this.col('connections').findOne({ client_id: client.client_id, patient_id: patientId, revoked: { $ne: true } });
    return {
      client: { client_id: client.client_id, client_name: client.client_name, ...(client.client_uri ? { client_uri: client.client_uri } : {}), ...(client.logo_uri ? { logo_uri: client.logo_uri } : {}) },
      scopes,
      redirect_uri: p.redirect_uri,
      already_connected_scopes: existing?.scopes ?? [],
      // the consent page states it: agents prepare, the patient confirms and pays on Nabd Plus
      patient_confirms_on_nabd_plus: true,
    };
  }

  /** The patient approves or denies. Returns where the browser goes next. */
  async decide(patientId: string, p: AuthorizeParams, decision: 'approve' | 'deny') {
    const { client, scopes } = await this.validateAuthorize(p);
    const to = new URL(p.redirect_uri as string);
    if (p.state) to.searchParams.set('state', p.state);
    to.searchParams.set('iss', issuer());
    if (decision !== 'approve') {
      to.searchParams.set('error', 'access_denied');
      return { redirect_to: to.toString() };
    }
    const now = new Date();
    await this.col('connections').updateOne(
      { client_id: client.client_id, patient_id: patientId },
      {
        $set: { scopes, updated_at: now, revoked: false },
        $unset: { revoked_at: '' },
        $setOnInsert: { id: randomUUID(), client_id: client.client_id, patient_id: patientId, connected_at: now },
      },
      { upsert: true },
    );
    const code = b64url(randomBytes(32));
    await this.col('codes').insertOne({
      code_hash: sha256(code), client_id: client.client_id, patient_id: patientId, redirect_uri: p.redirect_uri,
      code_challenge: p.code_challenge, scopes, resource: mcpResource(), used: false,
      expires_at: new Date(now.getTime() + AUTH_CODE_TTL_MS), created_at: now,
    });
    to.searchParams.set('code', code);
    return { redirect_to: to.toString() };
  }

  // ── Token endpoint ───────────────────────────────────────────────────────

  async token(body: Record<string, string | undefined>) {
    if (body.grant_type === 'authorization_code') return this.exchangeCode(body);
    if (body.grant_type === 'refresh_token') return this.refresh(body);
    throw new OAuthError('unsupported_grant_type');
  }

  private async exchangeCode(b: Record<string, string | undefined>) {
    if (!b.code || !b.client_id || !b.redirect_uri) throw new OAuthError('invalid_request', 'code, client_id and redirect_uri are required');
    if (!b.code_verifier) throw new OAuthError('invalid_request', 'code_verifier is required');
    const client = await this.activeClient(b.client_id);
    if (!client) throw new OAuthError('invalid_client', undefined, HttpStatus.UNAUTHORIZED);
    if (b.resource !== undefined && b.resource !== mcpResource()) throw new OAuthError('invalid_target');
    const codeHash = sha256(String(b.code));
    const row: any = await this.col('codes').findOne({ code_hash: codeHash });
    const valid = row && !row.used && new Date(row.expires_at).getTime() > Date.now()
      && row.client_id === client.client_id && row.redirect_uri === b.redirect_uri
      && VERIFIER_RE.test(b.code_verifier) && b64url(createHash('sha256').update(b.code_verifier).digest()) === row.code_challenge;
    if (!valid) throw new OAuthError('invalid_grant');
    // single use: only one exchange can flip `used`
    const claimed = await this.col('codes').updateOne({ code_hash: codeHash, used: false }, { $set: { used: true, used_at: new Date() } });
    if (!claimed.modifiedCount) throw new OAuthError('invalid_grant');
    const connection: any = await this.col('connections').findOne({ client_id: client.client_id, patient_id: row.patient_id, revoked: { $ne: true } });
    if (!connection) throw new OAuthError('invalid_grant');

    const refresh = b64url(randomBytes(32));
    const session = {
      id: randomUUID(), client_id: client.client_id, patient_id: row.patient_id, scopes: row.scopes as AgentScope[],
      refresh_hash: sha256(refresh), used_refresh_hashes: [] as string[],
      refresh_expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS), revoked: false, created_at: new Date(),
    };
    await this.col('sessions').insertOne({ ...session });
    return this.tokenResponse(session, refresh);
  }

  private async refresh(b: Record<string, string | undefined>) {
    if (!b.refresh_token || !b.client_id) throw new OAuthError('invalid_request', 'refresh_token and client_id are required');
    const client = await this.activeClient(b.client_id);
    if (!client) throw new OAuthError('invalid_client', undefined, HttpStatus.UNAUTHORIZED);
    const oldHash = sha256(b.refresh_token);
    const next = b64url(randomBytes(32));
    // rotation: the update only matches the current refresh token of a live session
    const doc: any = await this.col('sessions').findOneAndUpdate(
      { refresh_hash: oldHash, client_id: client.client_id, revoked: { $ne: true }, refresh_expires_at: { $gt: new Date() } },
      { $set: { refresh_hash: sha256(next), rotated_at: new Date() }, $push: { used_refresh_hashes: { $each: [oldHash], $slice: -50 } } as any },
      { returnDocument: 'after' },
    );
    if (!doc) {
      // OAuth 2.1 §6.1: a reused (already rotated) refresh token ends that grant.
      await this.col('sessions').updateMany(
        { used_refresh_hashes: oldHash, revoked: { $ne: true } },
        { $set: { revoked: true, revoked_at: new Date(), revoked_reason: 'refresh_reuse' } },
      );
      throw new OAuthError('invalid_grant');
    }
    if (!(await this.connectionLive(doc.client_id, doc.patient_id))) throw new OAuthError('invalid_grant');
    return this.tokenResponse(doc, next);
  }

  private tokenResponse(session: { id: string; client_id: string; patient_id: string; scopes: AgentScope[] }, refresh: string) {
    const scope = session.scopes.join(' ');
    const access = this.jwt().sign(
      { sub: session.patient_id, client_id: session.client_id, sid: session.id, scope, typ: 'agent' },
      { audience: mcpResource(), issuer: issuer(), expiresIn: ACCESS_TOKEN_TTL_S, jwtid: randomUUID() },
    );
    return { access_token: access, token_type: 'Bearer', expires_in: ACCESS_TOKEN_TTL_S, refresh_token: refresh, scope };
  }

  private async connectionLive(clientId: string, patientId: string) {
    const c = await this.col('connections').findOne({ client_id: clientId, patient_id: patientId, revoked: { $ne: true } });
    return !!c;
  }

  // ── Access token verification (MCP) ──────────────────────────────────────

  /** A live agent principal for this bearer token, or null. Checks revocation on every call. */
  async verifyAccessToken(token: string | null | undefined): Promise<AgentPrincipal | null> {
    if (!token) return null;
    let claims: any;
    try {
      claims = await this.jwt().verifyAsync(token, { audience: mcpResource(), issuer: issuer() });
    } catch {
      return null;
    }
    if (claims?.typ !== 'agent' || !claims.sid || !claims.sub || !claims.client_id) return null;
    const session: any = await this.col('sessions').findOne({ id: claims.sid, revoked: { $ne: true } });
    if (!session || session.client_id !== claims.client_id || session.patient_id !== claims.sub) return null;
    if (!(await this.activeClient(claims.client_id))) return null;
    if (!(await this.connectionLive(claims.client_id, claims.sub))) return null;
    return { patient_id: claims.sub, client_id: claims.client_id, session_id: claims.sid, scopes: session.scopes };
  }

  // ── Revocation (RFC 7009) ────────────────────────────────────────────────

  async revoke(token: string | undefined, clientId?: string) {
    if (!token) return {};
    const byRefresh: any = await this.col('sessions').findOne({ refresh_hash: sha256(token) });
    let sid: string | null = byRefresh?.id ?? null;
    let owner: string | null = byRefresh?.client_id ?? null;
    if (!sid) {
      try {
        const c: any = await this.jwt().verifyAsync(token, { audience: mcpResource(), issuer: issuer() });
        sid = c?.sid ?? null;
        owner = c?.client_id ?? null;
      } catch { /* unknown token: RFC 7009 §2.2 still answers 200 */ }
    }
    // a public client may only revoke its own tokens when it names itself
    if (sid && (!clientId || clientId === owner)) {
      await this.col('sessions').updateOne({ id: sid }, { $set: { revoked: true, revoked_at: new Date(), revoked_reason: 'revoked' } });
    }
    return {};
  }

  // ── Patient control ──────────────────────────────────────────────────────

  async listConnections(patientId: string) {
    const rows: any[] = await this.col('connections').find({ patient_id: patientId, revoked: { $ne: true } }).sort({ connected_at: -1 }).toArray();
    const clients = rows.length
      ? await this.col('clients').find({ client_id: { $in: rows.map((r) => r.client_id) } }).toArray()
      : [];
    const byId = new Map(clients.map((c: any) => [c.client_id, c]));
    return rows.map((r) => {
      const c: any = byId.get(r.client_id) || {};
      return {
        client_id: r.client_id,
        client_name: c.client_name ?? null,
        client_uri: c.client_uri ?? null,
        logo_uri: c.logo_uri ?? null,
        scopes: r.scopes ?? [],
        connected_at: r.connected_at,
        updated_at: r.updated_at,
      };
    });
  }

  /** Disconnect: the connection and every token of that client for this patient end at once. */
  async revokeConnection(patientId: string, clientId: string) {
    if (typeof clientId !== 'string' || !clientId || clientId.length > 200) throw new BadRequestException('invalid_client_id');
    const now = new Date();
    const r = await this.col('connections').updateOne(
      { client_id: { $eq: clientId }, patient_id: patientId, revoked: { $ne: true } },
      { $set: { revoked: true, revoked_at: now } },
    );
    await this.col('sessions').updateMany(
      { client_id: { $eq: clientId }, patient_id: patientId, revoked: { $ne: true } },
      { $set: { revoked: true, revoked_at: now, revoked_reason: 'patient_disconnected' } },
    );
    await this.col('codes').updateMany({ client_id: { $eq: clientId }, patient_id: patientId, used: false }, { $set: { used: true } });
    if (!r.matchedCount) throw new NotFoundException('connection_not_found');
    return { ok: true, client_id: clientId };
  }

  // ── Admin activity (AC-6) ────────────────────────────────────────────────

  /**
   * AC-6: admin view of agent activity (backend only; the UI goes to the design
   * session). Reads the audit entries every agent tool writes (actor_type 'agent'),
   * with filters by client, patient and tool. Page size is capped.
   */
  async listAgentActivity(q: { client_id?: string; patient_id?: string; tool?: string; limit?: string; page?: string }) {
    const filter: Record<string, unknown> = { actor_type: 'agent' };
    // Pinned with $eq so query operators can never be injected through the filters.
    if (typeof q.client_id === 'string' && q.client_id) filter.client_id = { $eq: q.client_id.slice(0, 200) };
    if (typeof q.patient_id === 'string' && q.patient_id) filter.patient_id = { $eq: q.patient_id.slice(0, 200) };
    if (typeof q.tool === 'string' && q.tool) filter.tool = { $eq: q.tool.slice(0, 120) };
    const limit = Math.min(200, Math.max(1, Number(q.limit) || 50));
    const page = Math.max(1, Number(q.page) || 1);
    const col = this.conn.collection('mcp_audit_log');
    const [total, rows] = await Promise.all([
      col.countDocuments(filter),
      col.find(filter).sort({ at: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    ]);
    return {
      items: (rows as Array<Record<string, unknown>>).map((r) => ({
        id: r.id ?? null,
        tool: r.tool ?? null,
        ok: r.ok ?? null,
        error_code: r.error_code ?? null,
        at: r.at ?? null,
        actor_type: r.actor_type ?? null,
        client_id: r.client_id ?? null,
        patient_id: r.patient_id ?? null,
        ref: typeof r.ref === 'string' ? r.ref.slice(0, 2000) : null,
      })),
      total, limit, page,
    };
  }
}
