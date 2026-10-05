import { describe, expect, it } from "vitest";
import { authErrorKind } from "./auth-errors";
import { DEVICE_ID_STORAGE_KEY, getStableDeviceId } from "./device-id";

describe("authErrorKind", () => {
  it.each([
    [400, "badRequest"], [422, "badRequest"], [401, "unauthorized"], [403, "forbidden"], [404, "notFound"],
    [409, "conflict"], [410, "gone"], [429, "rateLimited"], [502, "server"], [500, "server"], [503, "unavailable"], [504, "unavailable"],
  ])("maps %s to %s", (status, kind) => expect(authErrorKind(status)).toBe(kind));
});

function memoryStorage(initial?: string) {
  const data = new Map<string, string>(initial ? [[DEVICE_ID_STORAGE_KEY, initial]] : []);
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, data };
}

describe("getStableDeviceId", () => {
  it("creates one id, stores it and returns the same id on every later call", () => {
    const storage = memoryStorage();
    const first = getStableDeviceId(storage);
    expect(first.length).toBeGreaterThanOrEqual(8);
    expect(storage.data.get(DEVICE_ID_STORAGE_KEY)).toBe(first);
    expect(getStableDeviceId(storage)).toBe(first);
    expect(getStableDeviceId(storage)).toBe(first);
  });

  it("keeps the id the /welcome button already stored", () => {
    expect(getStableDeviceId(memoryStorage("existing-device-id"))).toBe("existing-device-id");
  });

  it("still returns an id when storage is blocked", () => {
    const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(getStableDeviceId(blocked).length).toBeGreaterThanOrEqual(8);
    expect(getStableDeviceId(null).length).toBeGreaterThanOrEqual(8);
  });
});
