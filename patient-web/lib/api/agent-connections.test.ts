import { describe, expect, it } from "vitest";
import { parseAgentConnections } from "./agent-connections";

describe("connected AI assistants (ac-1-agent-oauth#1)", () => {
  it("reads the server's rows, keeps only known scopes and drops rows without a client id", () => {
    expect(parseAgentConnections([
      { client_id: "agt_1", client_name: " Assistant ", scopes: ["agent:read", "agent:order", "admin:all"], connected_at: "2026-10-15T08:00:00.000Z" },
      { client_name: "no id" },
      { client_id: "bad id with spaces" },
    ])).toEqual([{ clientId: "agt_1", name: "Assistant", scopes: ["agent:read", "agent:order"], connectedAt: "2026-10-15T08:00:00.000Z" }]);
    expect(parseAgentConnections({ data: [] })).toEqual([]);
  });
});
