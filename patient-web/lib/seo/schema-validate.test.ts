import { describe, expect, it } from "vitest";
import { validateJsonLd } from "./schema-validate";
import { breadcrumbList, medicalWebPage, nursingService, physician, radiologyService } from "./structured-data";

/** 13.R16 Verify: "schema validator passes on samples" — one sample per page type. */
describe("schema.org validator", () => {
  it("rejects unknown types, undefined properties, bad enumerations and missing required props", () => {
    const errors = validateJsonLd([
      { "@context": "https://schema.org", "@type": "MedicalDrug", name: "x" },
      { "@context": "https://schema.org", "@type": "Drug", name: "x", strength: "15 mg", prescriptionStatus: "Rx" },
      { "@context": "https://schema.org", "@type": "Physician" },
      { "@context": "https://schema.org", "@type": "MedicalProcedure", name: "MRI", procedureType: "Diagnostic" },
      { "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: "q" }] },
    ]);
    expect(errors).toEqual(expect.arrayContaining([
      '[0]: unknown @type "MedicalDrug"',
      '[1]: property "strength" is not defined for Drug',
      '[1].prescriptionStatus: "Rx" is not a schema.org enumeration member',
      '[2]: Physician requires "name"',
      '[3].procedureType: "Diagnostic" is not a schema.org enumeration member',
      '[4]: @context must be https://schema.org',
      '[4].mainEntity[0]: Question requires "acceptedAnswer"',
    ]));
  });
});

describe("JSON-LD by page type passes the validator", () => {
  it("provider page: Physician + MedicalBusiness with address and rating", () => {
    const node = physician({
      name: "Dr Sara", path: "/doctor/dr-sara", locale: "en", specialty: "Cardiology",
      city: "Riyadh", clinicAddress: "King Fahd Rd", ratingValue: 4.6, reviewCount: 12,
    });
    expect(node["@type"]).toEqual(["Physician", "MedicalBusiness"]);
    expect(node.address).toEqual({ "@type": "PostalAddress", streetAddress: "King Fahd Rd", addressLocality: "Riyadh", addressCountry: "SA" });
    expect(validateJsonLd(node)).toEqual([]);
  });

  it("service pages: MedicalProcedure (radiology, home nursing)", () => {
    const nodes = [
      radiologyService({ name: "MRI brain", path: "/radiology/mri-brain/riyadh", locale: "en", description: "Magnetic resonance imaging" }),
      nursingService({ name: "Home nursing", path: "/home-nursing/riyadh", locale: "ar" }),
    ];
    for (const node of nodes) expect(node["@type"]).toBe("MedicalProcedure");
    expect(validateJsonLd(nodes)).toEqual([]);
  });

  it("content pages: MedicalWebPage + BreadcrumbList", () => {
    expect(validateJsonLd([
      medicalWebPage({ title: "Heart health", locale: "en", path: "/articles/heart", datePublished: "2026-01-02" }),
      breadcrumbList([{ name: "Home", locale: "en", path: "" }, { name: "Heart health", locale: "en", path: "/articles/heart" }]),
    ])).toEqual([]);
  });
});
