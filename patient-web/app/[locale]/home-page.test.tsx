import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  doctors: vi.fn(),
  config: vi.fn(),
  content: vi.fn(),
}));

// F82-3: the public Home is static/ISR, so it must not read the request at all: any read of cookies() or headers() throws here.
vi.mock("next/headers", () => ({
  cookies: async () => { throw new Error("the public Home must not read cookies()"); },
  headers: async () => { throw new Error("the public Home must not read headers()"); },
}));
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

import LandingPage, { generateStaticParams, revalidate } from "./page";
import { PublicDataUnavailableError } from "@/lib/api/public-unavailable";
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

  // F82-3: the page is cached, so a failure must not become a page: it throws, Next keeps the last good copy (stale-if-error,
  // #302), and with no copy the nonce server answers with the unavailable page (tests/nonce-server-fallback.test.ts).
  it.each([[500], [502], [503]])("throws, instead of rendering a page to cache, when the doctors call answers %s", async (status) => {
    state.doctors.mockResolvedValue(new Response("{}", { status }));
    await expect(render("en")).rejects.toBeInstanceOf(PublicDataUnavailableError);
  });

  it("throws when the doctors call does not answer, or the public config fails", async () => {
    state.doctors.mockResolvedValue(null);
    await expect(render("en")).rejects.toBeInstanceOf(PublicDataUnavailableError);
    state.doctors.mockResolvedValue(okJson({ items: [careDoctor] }));
    state.config.mockResolvedValue({ data: null, failed: true });
    await expect(render("en")).rejects.toBeInstanceOf(PublicDataUnavailableError);
  });

  it("only hides the curated sections when their call fails (an optional part)", async () => {
    state.content.mockResolvedValue({ data: null, failed: true });
    const html = await render("en");
    expect(html).toContain('id="home-title"');
    expect(html).not.toContain("We can&#x27;t load this page right now");
  });

  it("is static/ISR: a literal revalidate window, no build-time render, and no cookie or header read", async () => {
    expect(revalidate).toBe(60);
    expect(generateStaticParams()).toEqual([]);
    // render() above would have thrown on any cookies()/headers() read (the mock at the top).
    expect(await render("en")).toContain('id="home-title"');
  });

  it("holds nothing that depends on who is looking: no sign-in, account, dashboard or sign-out target in the HTML", async () => {
    const html = await render("en");
    expect(html).not.toContain('href="/en/login"');
    expect(html).not.toContain('href="/en/profile"');
    expect(html).not.toContain('href="/en/dashboard"');
    expect(html).not.toContain('href="/en/notifications"');
    expect(html).not.toContain('aria-label="Sign out"');
    // the neutral stand-in holds the size of the sign-in button, hidden and out of the accessibility tree
    expect(html).toMatch(/<span class="[^"]*identityPending[^"]*" aria-hidden="true">Sign in<\/span>/);
    // the Home link of the nav is the public Home for everyone until the browser knows better
    expect(html).toContain('href="/en"');
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
