import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultVisitType } from "../lib/api/doctors";

describe("doctor page: the visit type it opens on", () => {
  it("is clinic when the doctor offers it, else the first mode offered", () => {
    expect(defaultVisitType({ clinic: true, online: true, home: true })).toBe("clinic");
    expect(defaultVisitType({ clinic: false, online: true, home: true })).toBe("video");
    expect(defaultVisitType({ clinic: false, online: false, home: true })).toBe("home");
  });

  it("is never video for a doctor who only does home visits", () => {
    expect(defaultVisitType({ clinic: false, online: false, home: true })).not.toBe("video");
  });

  it("the page computes its default after it has the doctor, and keeps a link's own choice", () => {
    const source = readFileSync(resolve(process.cwd(), "app/[locale]/consultations/doctors/[doctorId]/page.tsx"), "utf8");
    expect(source).toContain("const serviceType = requestedType ?? defaultVisitType(doctor);");
    expect(source).not.toContain(': "video";\n');
  });
});
