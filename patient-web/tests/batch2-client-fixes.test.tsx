import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const doctors = vi.hoisted(() => ({ entity: vi.fn() }));

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not-found"); }, redirect: vi.fn() }));
// the real messages of the requested locale through the real ICU translator
vi.mock("next-intl/server", async () => {
  const actual = await vi.importActual<typeof import("next-intl")>("next-intl");
  const { messagesFor } = await import("./helpers/intl");
  return {
    getTranslations: async (arg: { locale: string; namespace: string }) =>
      actual.createTranslator({ locale: arg.locale, messages: messagesFor(arg.locale) as never, namespace: arg.namespace as never, onError: (error) => { throw error; } }),
    setRequestLocale: vi.fn(),
  };
});
vi.mock("@/lib/api/doctors-server", () => ({ getPublicDoctorEntity: doctors.entity }));

import { generateMetadata } from "@/app/[locale]/doctor/[slug]/page";
import { getPublicDoctorEntity } from "@/lib/api/doctors-server";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const entity = (extra: Record<string, unknown> = {}) => new Response(JSON.stringify({ entity: { name_ar: "د. سارة", name_en: "Dr. Sara", specialty: "cardiology", ...extra } }), { status: 200 });

describe("/doctor/[slug] metadata", () => {
  beforeEach(() => doctors.entity.mockReset());

  it("writes the description from the page language's messages, not from English in code", async () => {
    doctors.entity.mockImplementation(async () => entity());
    const en = await generateMetadata({ params: Promise.resolve({ locale: "en", slug: "dr-sara" }) });
    expect(en.description).toBe("Dr. Sara - Cardiology. Book an online or clinic consultation on Nabd Plus.");
    const ur = await generateMetadata({ params: Promise.resolve({ locale: "ur", slug: "dr-sara" }) });
    expect(String(ur.description)).not.toMatch(/Book|consultation/);
    expect(String(ur.description)).toContain("Dr. Sara");
    const withCity = await generateMetadata({ params: Promise.resolve({ locale: "en", slug: "dr-sara", city: "riyadh" }) });
    expect(withCity.description).toContain("in riyadh");
  });

  it("falls back to the translated word, never to English in code, when the specialty is not a known one", async () => {
    doctors.entity.mockImplementation(async () => entity({ specialty: "" }));
    const ar = await generateMetadata({ params: Promise.resolve({ locale: "ar", slug: "dr-sara" }) });
    expect(String(ar.title)).toBe("د. سارة | طبيب");
  });

  it("reads the doctor through the shared upstream helper and has no English literals or NEXT_PUBLIC_API_URL left in the page", async () => {
    doctors.entity.mockImplementation(async () => entity());
    await generateMetadata({ params: Promise.resolve({ locale: "en", slug: "dr-sara" }) });
    expect(doctors.entity).toHaveBeenCalledWith("dr-sara");
    const page = read("app/[locale]/doctor/[slug]/page.tsx");
    expect(page).not.toMatch(/NEXT_PUBLIC_API_URL/);
    expect(page).not.toMatch(/Book appointment|"Doctor"/);
    // public ISR page: no request-scoped reads
    expect(page).not.toMatch(/\b(cookies|headers)\(/);
  });

  it("does not index a doctor the backend does not know", async () => {
    doctors.entity.mockResolvedValue(new Response("{}", { status: 404 }));
    expect(await generateMetadata({ params: Promise.resolve({ locale: "en", slug: "nobody" }) })).toEqual({ robots: { index: false, follow: false } });
  });
});

describe("the doctor entity read (F82)", () => {
  const original = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
  });
  afterEach(() => {
    globalThis.fetch = original;
  });

  it("goes through the Next data cache for an hour with no credential", async () => {
    const real = await vi.importActual<typeof import("@/lib/api/doctors-server")>("@/lib/api/doctors-server");
    await real.getPublicDoctorEntity("dr sara");
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toMatch(/\/entity-graph\/related\/doctor\/dr%20sara$/);
    expect(init.next).toEqual({ revalidate: 3600 });
    expect(init.cache).toBeUndefined();
    expect(init.headers).toEqual({ Accept: "application/json" });
    expect(getPublicDoctorEntity).toBe(doctors.entity);
  });
});

describe("the video visit launcher", () => {
  it("links to the video-call page of the appointment once the visit is ready (both pages that show it)", () => {
    const launcher = read("components-next/call-token-launcher.tsx");
    expect(launcher).toMatch(/<ButtonLink href=\{joinHref\} label=\{labels\.open\}/);
    for (const page of ["app/[locale]/appointments/[appointmentId]/page.tsx", "app/[locale]/consultations/virtual-waiting-room/page.tsx"]) {
      expect(read(page)).toMatch(/joinHref=\{`\/\$\{locale\}\/consultations\/video-call\?appointmentId=\$\{/);
    }
  });
});
