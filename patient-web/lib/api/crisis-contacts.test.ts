import { describe, expect, it } from "vitest";
import { parseCrisisContacts } from "./crisis-contacts";
describe("crisis contacts response guards", () => {
  it("masks phones and drops patient/private fields", () => {
    expect(parseCrisisContacts({ user_contacts: [{ id: "c1", patient_id: "private", contact_name: "Trusted person", relationship: "friend", phone: "+966 555 1234", is_professional: true }] })).toEqual([{ id: "c1", name: "Trusted person", relationship: "friend", maskedPhone: "•••• 1234", isProfessional: true }]);
  });
});
