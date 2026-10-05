import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  signedIn: false,
  doctors: vi.fn(),
  config: vi.fn(),
  content: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (state.signedIn && name === "nabd_access" ? { value: "token" } : undefined) }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }), usePathname: () => "/en" }));
vi.mock("next-intl", async () => (await import("@/tests/helpers/intl")).nextIntlMock("en"));
vi.mock("next-intl/server", async () => {
  const helpers = await import("@/tests/helpers/intl");
  return {
    getTranslations: async (options: { locale?: string; namespace?: string } | string) => helpers.createTranslator("en", typeof options === "string" ? options : options.namespace),
    setRequestLocale: vi.fn(),
  };
});
vi.mock("@/lib/api/doctors-server", () => ({ getPublicDoctors: state.doctors }));
vi.mock("@/lib/api/public-config-server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/public-config-server")>()),
  readPublicConfig: state.config,
  readHomeContent: state.content,
}));

import LandingPage from "./page";
import { HomeShell } from "@/components-next/home/home-shell";

async function render(locale = "en") {
  const element = (await LandingPage({ params: Promise.resolve({ locale }) })) as { props: Parameters<typeof HomeShell>[0] };
  return renderToStaticMarkup(await HomeShell(element.props));
}

// toPublicDoctor's card model of GET /care/doctors (backend care.service.ts)
const careDoctor = {
  id: "d1", slug: "dr-noor", name_ar: "د. نور القحطاني", name_en: "Dr. Noor Alqahtani", specialty: "gynecology", sub_specialties: [], title: null,
  academic_degree: "Consultant", years_experience: 12, consultation_modes: ["clinic", "video"], price_clinic: 160, price_online: 120, price_home: null,
  hospital: "Nabd Clinic", facility_id: "f1", city: "Riyadh", district: null, rating: 4.9, reviews_count: 421, bio: null, languages: ["ar"],
  accepts_insurance: true, accepted_insurance: [], clinicPhotos: [], next_available_at: "2099-01-01T09:00:00.000Z",
};
const okJson = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe("Home", () => {
  beforeEach(() => {
    state.signedIn = false;
    state.doctors.mockReset().mockResolvedValue(okJson({ items: [careDoctor], total: 1 }));
    state.config.mockReset().mockResolvedValue({ data: {}, failed: false });
    state.content.mockReset().mockResolvedValue({ data: { sections: [] }, failed: false });
  });

  it("shows real doctor cards: name by locale, specialty by name, hospital, price from price_clinic and the next slot", async () => {
    const html = await render("en");
    expect(html).toContain("Dr. Noor Alqahtani");
    expect(html).toContain("Gynecology &amp; Obstetrics");
    expect(html).not.toContain("gynecology");
    expect(html).toContain("Nabd Clinic");
    expect(html).toContain(">160<");
    expect(html).toContain("SAR");
    expect(html).toContain("Consultant");
    expect(html).toMatch(/nabd-doctor-card__slot[^>]*>(?:(?!<\/span>)[\s\S])*Jan 1/);
  });

  it("uses the Arabic name on the Arabic page and falls back to the other language's name only for a missing one", async () => {
    state.doctors.mockResolvedValue(okJson({ items: [{ ...careDoctor, name_en: null }], total: 1 }));
    expect(await render("en")).toContain("د. نور القحطاني");
  });

  it("hides the specialty line for a slug it has no name for", async () => {
    state.doctors.mockResolvedValue(okJson({ items: [{ ...careDoctor, specialty: "general_medicine" }], total: 1 }));
    const html = await render("en");
    expect(html).not.toContain("general_medicine");
    expect(html).not.toContain("nabd-doctor-card__specialty");
  });

  it("renders the page without the doctors section when the service answers with none (not an error)", async () => {
    state.doctors.mockResolvedValue(okJson({ items: [], total: 0 }));
    const html = await render("en");
    expect(html).not.toContain("home-doctors-title");
    expect(html).toContain('id="home-title"');
    expect(html).not.toContain("We can't load this page right now");
  });

  it.each([[500], [502], [503]])("shows the error state with a retry, inside the shell, when the doctors call answers %s", async (status) => {
    state.doctors.mockResolvedValue(new Response("{}", { status }));
    const html = await render("en");
    expect(html).toContain("nabd-home-shell");
    expect(html).toContain("We can&#x27;t load this page right now");
    expect(html).toContain("Check your connection and try again.");
    expect(html).toContain("Try again");
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('id="home-title"');
  });

  it("shows the error state when the doctors call does not answer, or the public config fails", async () => {
    state.doctors.mockResolvedValue(null);
    expect(await render("en")).toContain("We can&#x27;t load this page right now");
    state.doctors.mockResolvedValue(okJson({ items: [careDoctor] }));
    state.config.mockResolvedValue({ data: null, failed: true });
    expect(await render("en")).toContain("We can&#x27;t load this page right now");
  });

  it("only hides the curated sections when their call fails (an optional part)", async () => {
    state.content.mockResolvedValue({ data: null, failed: true });
    const html = await render("en");
    expect(html).toContain('id="home-title"');
    expect(html).not.toContain("We can&#x27;t load this page right now");
  });

  it("keeps working for an anonymous visitor: the sign-in link and no sign-out", async () => {
    const html = await render("en");
    expect(html).toContain('href="/en/login"');
    expect(html).not.toContain('aria-label="Sign out"');
  });

  it("shows the translated maintenance copy, and the admin's message only in its own language", async () => {
    state.config.mockResolvedValue({ data: { app_versions: { apps: { web: { maintenance: true, message_ar: "رسالة", message_en: "Back at noon" } } } }, failed: false });
    const en = await render("en");
    expect(en).toContain("Scheduled maintenance");
    expect(en).toContain("Back at noon");
    expect(en).not.toContain("رسالة");
    const ur = await render("ur");
    expect(ur).not.toContain("Back at noon");
    expect(ur).not.toContain("رسالة");
    state.config.mockResolvedValue({ data: { app_versions: { apps: { web: { maintenance: true } } } }, failed: false });
    expect(await render("en")).toContain("We are improving the service. Please try again later.");
  });

  it("renders a curated card without a link or image when the admin's link or image is not usable, and links a usable one", async () => {
    state.content.mockResolvedValue({ data: { sections: [{ id: "s", title_en: "Offers", enabled: true, position: 0, items: [
      { id: "a", title_en: "Good", deep_link: "/pharmacy/offers", image_url: "https://cdn.nabd.plus/a.webp" },
      { id: "b", title_en: "Bad link", deep_link: "javascript:alert(1)", image_url: "https://evil.test/a.jpg" },
      { id: "c", title_en: "App only", deep_link: "/tracking/lab/1" },
    ] }] }, failed: false });
    const html = await render("en");
    expect(html).toContain('href="/en/pharmacy/offers"');
    expect(html).toContain("Good");
    expect(html).toContain("Bad link");
    expect(html).toContain("App only");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("evil.test");
    expect(html).not.toContain("/tracking/lab");
  });
});
