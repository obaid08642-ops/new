import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportCatalogueEvent, resetCatalogueEventsForTests, verticalOfSuggestionType } from "./catalogue-events";

describe("reportCatalogueEvent", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    resetCatalogueEventsForTests();
    fetchMock.mockReset().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { sessionStorage: { getItem: () => "sess-1", setItem: () => undefined } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("posts the vertical, service, event and session only", () => {
    reportCatalogueEvent("lab", "view", "64a1b2c3d4e5f60718293a4b");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/catalogue/events");
    expect(init.keepalive).toBe(true);
    expect(JSON.parse(init.body)).toEqual({ vertical: "lab", service_id: "64a1b2c3d4e5f60718293a4b", event: "view", session_id: "sess-1" });
  });

  it("sends each signal of a service once, but a view and a search separately", () => {
    reportCatalogueEvent("nursing", "view", "abcdefgh12");
    reportCatalogueEvent("nursing", "view", "abcdefgh12");
    reportCatalogueEvent("nursing", "search", "abcdefgh12");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("ignores ids the server would refuse", () => {
    reportCatalogueEvent("lab", "view", "short");
    reportCatalogueEvent("lab", "view", "");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("swallows a failing request and a throwing fetch", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect(() => reportCatalogueEvent("radiology", "view", "abcdefgh12")).not.toThrow();
    fetchMock.mockImplementationOnce(() => { throw new Error("blocked"); });
    expect(() => reportCatalogueEvent("radiology", "search", "abcdefgh12")).not.toThrow();
    await Promise.resolve();
  });

  it("maps only ranked suggestion types", () => {
    expect(verticalOfSuggestionType("lab_test")).toBe("lab");
    expect(verticalOfSuggestionType("radiology")).toBe("radiology");
    expect(verticalOfSuggestionType("nursing")).toBe("nursing");
    expect(verticalOfSuggestionType("lab_package")).toBeNull();
    expect(verticalOfSuggestionType("medicine")).toBeNull();
  });
});
