import { describe, expect, it } from "vitest";
import { parseEmergencyContacts } from "./emergency-contacts";
describe("emergency contact response guards", () => {
  it("masks phones and drops raw/private fields", () => {
    expect(parseEmergencyContacts([{ id: "c1", name: "Trusted person", relation: "Sibling", phone: "+966 555 1234", isPrimary: true, user_id: "private", address: "private" }])).toEqual([{ id: "c1", name: "Trusted person", relation: "Sibling", maskedPhone: "•••••••1234", isPrimary: true }]);
  });
});
