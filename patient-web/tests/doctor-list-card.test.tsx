import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoctorListCard } from "@/components-next/consult/doctor-list-card";

const base = { locale: "en", href: "/en/consultations/doctors/d1", name: "Dr Test", modes: [{ mode: "online" as const, label: "Video" }], bookLabel: "Book" };
const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

describe("the doctor list card is a server component (doctors page script budget)", () => {
  it("has no client directive and no hook, and the card module draws without one", () => {
    expect(read("components-next/consult/doctor-list-card.tsx")).not.toMatch(/^\s*["']use client["']|useState|useEffect/m);
    expect(read("components-next/ui-generated/components/Cards.tsx")).not.toMatch(/^\s*["']use client["']/m);
  });

  it("draws the card as the link to the doctor's page, with the price, the booking label and the verified seal", () => {
    const html = renderToStaticMarkup(<DoctorListCard {...base} price={150} verifiedLabel="Verified" />);
    expect(html).toContain('href="/en/consultations/doctors/d1"');
    expect(html).toContain("Dr Test");
    expect(html).toContain("Book");
    expect(html).toContain("Verified");
    expect(html).toMatch(/150/);
  });

  it("writes the next free time through the client island only when the server sent a valid time", () => {
    const iso = "2026-11-09T10:30:00.000Z";
    expect(renderToStaticMarkup(<DoctorListCard {...base} nextSlotIso={iso} />)).toContain(`<time dateTime="${iso}"`);
    expect(renderToStaticMarkup(<DoctorListCard {...base} nextSlotIso="not a date" />)).not.toContain("<time");
    expect(renderToStaticMarkup(<DoctorListCard {...base} />)).not.toContain("<time");
  });

  it("sends an allowed photo through the image optimizer and leaves a missing one out", () => {
    expect(renderToStaticMarkup(<DoctorListCard {...base} />)).not.toContain("<img");
    const html = renderToStaticMarkup(<DoctorListCard {...base} photoSrc="/images/doctors/x.jpg" />);
    expect(html).toContain("<img");
  });
});
