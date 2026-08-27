"use client";

import { useEffect } from "react";

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: unknown, context?: { signal?: AbortSignal }) => Promise<unknown>;
};

type ModelContext = {
  registerTool?: (tool: ToolDefinition) => (() => void) | void;
  provideContext?: (context: { tools: ToolDefinition[] }) => (() => void) | void;
};

declare global {
  interface Navigator {
    modelContext?: ModelContext;
  }
}

const publicTools: ToolDefinition[] = [
  {
    name: "nabd_public_navigation",
    description: "Navigate to a public Nabd Plus page. This tool does not access patient data and does not perform mutations.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", enum: ["/en", "/ar", "/en/articles", "/ar/articles", "/en/nursing/catalog", "/ar/nursing/catalog"] } },
      required: ["path"],
      additionalProperties: false
    },
    async execute(input) {
      const path = typeof input === "object" && input !== null && "path" in input && typeof input.path === "string" ? input.path : "/en";
      window.location.assign(path);
      return { navigated: true, path };
    }
  },
  {
    name: "nabd_public_discovery",
    description: "Read the public agent discovery manifest. This tool returns metadata only and never returns patient data.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async execute(_input, context) {
      const response = await fetch("/.well-known/ai-catalog.json", { signal: context?.signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Public discovery metadata is unavailable");
      return response.json();
    }
  }
];

export default function AgentWebMcp() {
  useEffect(() => {
    const modelContext = navigator.modelContext;
    if (!modelContext) return;
    const cleanups: Array<(() => void) | void> = [];
    if (modelContext.registerTool) {
      for (const tool of publicTools) cleanups.push(modelContext.registerTool(tool));
    } else if (modelContext.provideContext) {
      cleanups.push(modelContext.provideContext({ tools: publicTools }));
    }
    return () => cleanups.forEach((cleanup) => cleanup?.());
  }, []);
  return null;
}
