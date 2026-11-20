/**
 * The AI assistants the patient connected (GET /patient/agent-connections): client id, its name, the scopes the patient allowed and
 * when. Same reading as the website's `parseAgentConnections`; rows without a valid client id are dropped.
 */
export type AgentConnection = { clientId: string; name?: string; scopes: string[]; connectedAt?: string };

/** The scopes an assistant can hold, each with the translation key that says what it may do. */
export const AGENT_SCOPE_KEYS: Record<string, string> = {
  'agent:read': 'set.apps.scopeRead',
  'agent:order': 'set.apps.scopeOrder',
  'agent:book': 'set.apps.scopeBook',
};

export function parseAgentConnections(payload: unknown): AgentConnection[] {
  const root = payload && typeof payload === 'object' && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
  const list = Array.isArray(payload) ? payload : Array.isArray(root?.data) ? (root?.data as unknown[]) : [];
  return list.flatMap((value) => {
    if (!value || typeof value !== 'object') return [];
    const row = value as Record<string, unknown>;
    const clientId = typeof row.client_id === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(row.client_id) ? row.client_id : null;
    if (!clientId) return [];
    const scopes = Array.isArray(row.scopes) ? row.scopes.filter((s): s is string => typeof s === 'string' && s in AGENT_SCOPE_KEYS) : [];
    return [{
      clientId,
      ...(typeof row.client_name === 'string' && row.client_name.trim() ? { name: row.client_name.trim().slice(0, 120) } : {}),
      scopes,
      ...(typeof row.connected_at === 'string' ? { connectedAt: row.connected_at } : {}),
    }];
  });
}
