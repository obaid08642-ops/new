import { describe, expect, it } from "vitest";
import { parseHistory } from "./parse-history";

describe("parseHistory", () => {
  it("reads the real response, a top-level array, in order", () => {
    const real = [
      { id: "t1:0", from: "user", text: "Where is my order?", time: "2026-10-27T09:05:00.000Z", isBot: false },
      { id: "t1:1", from: "agent", text: "We are checking.", time: "2026-10-27T09:06:00.000Z", isBot: false },
      { id: "t1:2", from: "agent", text: "Automatic reply", time: "bad", isBot: true },
    ];
    const out = parseHistory(real);
    expect(out.map((m) => [m.id, m.from, m.text])).toEqual([["t1:0", "user", "Where is my order?"], ["t1:1", "agent", "We are checking."], ["t1:2", "agent", "Automatic reply"]]);
    expect(out[0].time).toMatch(/^\d{2}:\d{2}$/);
    expect(out[2].time).toBe("");
  });
  it("puts a bot line on the agent side even when from says user", () => expect(parseHistory([{ id: "a", from: "user", text: "x", isBot: true }])[0].from).toBe("agent"));
  it("still reads the keyed forms", () => {
    for (const key of ["data", "messages", "history"]) expect(parseHistory({ [key]: [{ id: "1", from: "agent", text: "hi", time: "10:30" }] })).toEqual([{ id: "1", from: "agent", text: "hi", time: "10:30" }]);
  });
  it("returns [] for anything else", () => { expect(parseHistory(null)).toEqual([]); expect(parseHistory({})).toEqual([]); expect(parseHistory([null, { text: "" }])).toEqual([]); });
});
