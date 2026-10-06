import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import ar from "@/messages/ar.json";
import { CLIENT_NAMESPACES, ROUTE_GROUP_NAMESPACES, pickClientMessages, pickRouteMessages } from "./client-messages";

const root = resolve(process.cwd());

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sources(path, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

const files = ["app", "components", "components-next", "lib"].flatMap((dir) => sources(join(root, dir)));

describe("client messages (F82-1)", () => {
  it("lists every namespace a component reads with useTranslations", () => {
    const used = new Set<string>();
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const call of text.matchAll(/\buseTranslations\(([^)]*)\)/g)) {
        const arg = call[1].trim();
        const literal = /^["']([A-Za-z][A-Za-z0-9]*)["']$/.exec(arg);
        // a call without a literal namespace would read the whole catalogue
        expect(literal, `${file}: useTranslations(${arg}) needs a literal namespace`).not.toBeNull();
        used.add(literal![1]);
      }
    }
    const groupOnly = new Set(Object.values(ROUTE_GROUP_NAMESPACES).flatMap((group) => group.namespaces));
    for (const namespace of used) {
      if (groupOnly.has(namespace)) continue; // read only under its route group, checked below
      expect(CLIENT_NAMESPACES as readonly string[], namespace).toContain(namespace);
    }
  });

  it("a route group's namespaces are read only by the client components under that group's folders, and are not also in the base list", () => {
    for (const [group, { paths, namespaces }] of Object.entries(ROUTE_GROUP_NAMESPACES)) {
      for (const namespace of namespaces) {
        expect(CLIENT_NAMESPACES as readonly string[], `${group}: ${namespace} is already a base namespace`).not.toContain(namespace);
        for (const file of files) {
          const text = readFileSync(file, "utf8");
          if (!new RegExp(`\\buseTranslations\\(["']${namespace}["']\\)`).test(text)) continue;
          const rel = file.slice(root.length + 1).replace(/\\/g, "/");
          expect(paths.some((prefix) => rel.startsWith(prefix)), `${rel} reads ${namespace}, which belongs to the ${group} route group`).toBe(true);
        }
      }
    }
  });

  it("picks the base namespaces plus a group's, and only the base ones for an unknown group", () => {
    const messages = { ...(ar as Record<string, unknown>) };
    expect(Object.keys(pickRouteMessages(messages, "no-such-group")).sort()).toEqual([...CLIENT_NAMESPACES].sort());
  });

  it("does not use a client hook that reads arbitrary messages", () => {
    for (const file of files) expect(readFileSync(file, "utf8"), file).not.toMatch(/\buseMessages\(/);
  });

  it("lists only namespaces that exist", () => {
    for (const namespace of CLIENT_NAMESPACES) expect(Object.keys(ar), namespace).toContain(namespace);
  });

  it("keeps only the listed namespaces and does not mutate the catalogue", () => {
    const before = Object.keys(ar).length;
    const picked = pickClientMessages(ar as Record<string, unknown>);
    expect(Object.keys(picked).sort()).toEqual([...CLIENT_NAMESPACES].sort());
    expect(Object.keys(ar)).toHaveLength(before);
  });
});
