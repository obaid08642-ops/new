import { describe, expect, it } from "vitest";
import { extractDoctor } from "./doctors";
describe("doctor detail parser", () => { it("unwraps data and keeps safe display fields", () => expect(extractDoctor({ data: { id: "doc-1", name_en: "Verified Doctor", degree: "MD", years_experience: 12, patient_id: "private" } })).toMatchObject({ id: "doc-1", name: "Verified Doctor", degree: "MD", experienceYears: 12 })); });
