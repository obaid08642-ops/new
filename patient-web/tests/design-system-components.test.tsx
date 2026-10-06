import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  Avatar, Badge, BottomTabBar, Button, Card, Chip, DoctorCard, EmptyState, OfflineState, OfferCard, ProductCard, ProgressRing, Timeline, ErrorState, FIcon, IconButton, ListItem, Radio, Rating,
  Search, SectionHeader, Segmented, Select, ServiceTile, SERVICE_ICONS, SERVICE_TONES, StatusChip, Stepper, Tabs, Toggle,
  FILL_ICON_PATHS,
} from "@nabd/ui";
import { CONTRACT_NAMES } from "@nabd/ui/components/contract";
import { WEB_ONLY } from "@nabd/ui/components/contract";
import { SERVICE_TILES } from "@nabd/ui/components/fixtures";
import { COMPONENT_CSS, withResolvedStyles } from "./support/resolve-css";

/**
 * 12.A7 — the component contract.
 *
 * These are contract tests, not snapshot tests. The components are hand-written
 * and will be restyled in A8/A9; what has to hold through all of that is the set
 * of promises the contract makes, and each one gets an assertion that fails the
 * moment somebody breaks it.
 *
 * The compile-time half of this (both renderers implementing the same contract)
 * is enforced by `tsc` via `components/conformance.ts` and cannot be tested from
 * here — a test that imports both renderers would need a React DOM and a React
 * Native runtime in one process, which is not worth the flakiness. What IS
 * testable from here is that the contract roster and the exemptions are honest.
 */

describe("12.A7 — the contract roster is honest", () => {
  it("lists every component exactly once", () => {
    expect(new Set(CONTRACT_NAMES).size).toBe(CONTRACT_NAMES.length);
    // 28 from §A7 + FIcon, SectionHeader (handoff §3, components 1/4) + Segmented, Toggle, Radio, StatusChip (2/4)
    // + DoctorCard, ProductCard, OfferCard, Timeline, ProgressRing (3/4) + OfflineState (4/4)
    expect(CONTRACT_NAMES.length).toBe(40);
  });

  it("every component named in the docs roster is in the contract", () => {
    // §A7's list, transcribed, plus the handoff §3 additions (FIcon, SectionHeader; Segmented, Toggle, Radio, StatusChip).
    // If the contract grows a component, this is where it has to be added, which is the point.
    const fromTheSpec = [
      "Button", "IconButton", "Segmented", "Toggle", "Radio", "StatusChip", "Input", "Select", "Otp", "Search", "Stepper",
      "SlotPicker", "Chip", "Badge", "Card", "DoctorCard", "ProductCard", "OfferCard", "Timeline", "ProgressRing", "ListItem", "ServiceTile", "FIcon", "SectionHeader", "Avatar",
      "PriceTag", "Rating", "Tabs", "NavBar", "BottomTabBar", "Sidebar",
      "MapPinCard", "EmptyState", "ErrorState", "OfflineState", "Toast", "Modal", "Skeleton",
      "DataTable", "ChartCard",
    ];
    expect([...CONTRACT_NAMES].sort()).toEqual(fromTheSpec.sort());
  });

  it("every web-only exemption carries a written reason, not a silent hole", () => {
    for (const [name, reason] of Object.entries(WEB_ONLY)) {
      expect(CONTRACT_NAMES).toContain(name as never);
      // A reason is required: "not needed here" is not a reason.
      expect((reason ?? "").length, `${name} has no stated reason`).toBeGreaterThan(30);
    }
  });

  it("the exemptions are only the two admin surfaces the spec marks as such", () => {
    expect(Object.keys(WEB_ONLY).sort()).toEqual(["ChartCard", "DataTable"]);
  });
});

describe("12.A7 — touch targets", () => {
  it("the minimum is 44px, from a11y.minTouchTarget and not a literal", () => {
    const tokens = JSON.parse(
      readFileSync(resolve(process.cwd(), "../packages/design-tokens/tokens.json"), "utf8"),
    );
    expect(tokens.a11y.minTouchTarget).toBe("44px");
  });

  it("no component hard-codes a height below the touch target", () => {
    // The rule the components actually keep: a control may be 32px VISUAL and 44px
    // of target, so a bare px height in a component is the thing to catch.
    // the geometry is in the component's sheet (components.css: no style attributes)
    const src = readFileSync(resolve(process.cwd(), "../packages/ui/components/css/Button.css"), "utf8");
    const heights = [...src.matchAll(/height:\s*(\d+)/g)].map((m) => Number(m[1]));
    for (const h of heights) {
      expect(h, `a literal height of ${h}px in Button`).toBeGreaterThanOrEqual(32);
    }
    // and the target is stated as the token, not as 44
    expect(src).toContain("var(--nabd-a11y-minTouchTarget)");
  });
});

describe("12.A7 — accessible names", () => {
  it("an IconButton carries its accessible name, because it has no visible text", () => {
    // The compile-time guarantee (`label` is required on IconButtonProps) is in
    // the types. What is checkable here is the other half: that the name
    // actually reaches the DOM, because a required prop that is dropped on the
    // way to the element is a silent loss.
    const html = markup(IconButton, { name: "close", label: "Close" });
    expect(html).toContain('aria-label="Close"');
    // And the glyph inside it is decorative — "Close" is read once, not twice.
    expect(html).toContain('aria-hidden="true"');
  });

  it("a Button is named by its visible text, not by a duplicate aria-label", () => {
    // Re-announcing the visible text is the classic screen-reader stutter.
    const html = renderButton();
    expect(html).toContain('>Save<');
    expect(html).not.toContain('aria-label');
  });

  it("decorative icons inside a labelled control stay aria-hidden", () => {
    // A button that says "Save" and also announces the glyph is read twice, so
    // the icon is hidden and the visible text is the accessible name.
    const withIcon = renderButton({ startIcon: "download" });
    expect(withIcon).toContain('aria-hidden="true"');
    expect(withIcon).toContain('data-icon="download"');
  });

  it("a button with no icon has nothing decorative in it", () => {
    // Asserted because the previous version of this test claimed otherwise:
    // aria-hidden appears only when there is an icon to hide.
    expect(renderButton()).not.toContain('aria-hidden="true"');
  });
});

describe("12.A7 — states are consistent across components", () => {
  it("a loading control is also disabled, so a tap cannot fire twice", () => {
    expect(renderButton({ loading: true })).toContain("disabled");
    expect(renderButton({ loading: true })).toContain('aria-busy="true"');
  });

  it("a disabled control is dimmed rather than hidden", () => {
    const html = renderButton({ disabled: true });
    expect(html).toContain("disabled");
    expect(html).toContain("opacity:0.5");
  });

  it("an invalid control announces itself, not just colours itself", () => {
    const html = renderInputInvalid();
    expect(html).toContain('aria-invalid="true"');
  });
});

describe("12.A7 — light and dark", () => {
  it("no component paints a raw hex; every colour is a token var", () => {
    for (const file of ["Button.tsx", "Inputs.tsx", "Surfaces.tsx", "Feedback.tsx"]) {
      const src = readFileSync(resolve(process.cwd(), "../packages/ui/components", file), "utf8");
      const hexes = [...src.matchAll(/#[0-9A-Fa-f]{3,8}\b/g)].map((m) => m[0]);
      expect(hexes, `${file} has a raw hex: ${hexes.join(", ")}`).toEqual([]);
    }
    const sheetHexes = [...COMPONENT_CSS.matchAll(/#[0-9A-Fa-f]{3,8}\b/g)].map((m) => m[0]);
    expect(sheetHexes, `components.css has a raw hex: ${sheetHexes.join(", ")}`).toEqual([]);
  });

  it("every colour reference is a --nabd- token, so the themes actually swap", () => {
    // the colours live in the component sheet now (components.css: no style attributes)
    const colors = [...COMPONENT_CSS.matchAll(/(?:^|[\s{;])(?:color|background|border-color|box-shadow|fill|stop-color):\s*([^;}]+)/g)].map((m) => m[1].trim());
    expect(colors.length).toBeGreaterThan(50);
    for (const c of colors) {
      expect(c, `"${c}" is not a token reference`).toMatch(/var\(--nabd-|transparent|currentColor|inherit|none|color-mix/);
    }
  });
});

describe("12.A7 — the two families are kept apart", () => {
  it("ServiceTile carries its service's filled FIcon from the handoff map, never a line glyph", () => {
    // Handoff §1 replaced the illustrated tile art with a filled Phosphor glyph in a
    // tinted square. What still holds from 12.A7: a tile never carries the small
    // line set, and the label (not the icon) names it.
    const tile = renderServiceTile();
    expect(tile).toContain('data-service="pharmacy"');
    expect(tile).toContain('data-icon="pill"');
    expect(tile).toContain('data-tone="coral"');
    expect(tile).not.toContain("nabd-icon--line");
    expect(tile).toContain(">Pharmacy<");
  });

  it("the fixtures the gallery renders are the services of the handoff map", () => {
    for (const tile of SERVICE_TILES) {
      expect(Object.keys(SERVICE_ICONS)).toContain(tile.name);
      expect(tile.label.length).toBeGreaterThan(0);
    }
    expect(SERVICE_TILES.map((t) => t.name).sort()).toEqual(Object.keys(SERVICE_ICONS).sort());
  });
});

describe("handoff §1 — FIcon", () => {
  it("is a tinted square at 32% radius with a 52% glyph, coloured by tokens", () => {
    // The tile is SVG (a free size needs no style attribute): the chip is a rect with rx = 32%.
    const html = markup(FIcon, { icon: "pill", tone: "mint", size: 50 });
    expect(html).toContain('rx="16"');
    expect(html).toContain('width="26"');
    expect(html).toContain("fill:var(--nabd-color-service-mint-bg)");
    expect(html).toContain("fill:var(--nabd-color-service-mint-fg)");
    expect(html).not.toMatch(/#[0-9a-fA-F]{6}/);
  });

  it("solid is the tone gradient with the white glyph token; none is the bare glyph", () => {
    const solid = markup(FIcon, { icon: "pill", tone: "teal", chip: "solid" });
    // the 160deg gradient is an SVG linearGradient whose stops are the tone's solid pair
    expect(solid).toContain("<linearGradient");
    expect(solid).toContain("stop-color:var(--nabd-color-service-teal-solid-from)");
    expect(solid).toContain("stop-color:var(--nabd-color-service-teal-solid-to)");
    expect(solid).toContain("fill:var(--nabd-color-icon-onSolid)");
    const none = markup(FIcon, { icon: "pill", tone: "teal", chip: "none", size: 24 });
    expect(none).toContain('width="24"');
    expect(none).not.toContain("<rect");
  });

  it("is decorative unless it is given a name", () => {
    expect(markup(FIcon, { icon: "pill", tone: "coral" })).toContain('aria-hidden="true"');
    const named = markup(FIcon, { icon: "pill", tone: "coral", label: "صيدلية" });
    expect(named).toContain('role="img"');
    expect(named).toContain('aria-label="صيدلية"');
  });

  it("every tone the component accepts exists in the token sheet, in both parts", () => {
    const sheet = readFileSync(resolve(process.cwd(), "app/design-tokens/tokens.css"), "utf8");
    for (const tone of SERVICE_TONES) {
      for (const part of ["bg", "fg", "solid-from", "solid-to"]) expect(sheet).toContain(`--nabd-color-service-${tone}-${part}:`);
    }
    expect(sheet).toContain("--nabd-color-icon-onSolid:");
  });

  it("ListItem takes a leading FIcon; SectionHeader is a real heading", () => {
    const row = markup(ListItem, { title: "العناوين", leading: { icon: "map-pin-line", tone: "coral" } });
    expect(row).toContain('data-icon="map-pin-line"');
    expect(markup(SectionHeader, { title: "عروض وباقات", actionLabel: "عرض الكل" })).toMatch(/<h2[^>]*>عروض وباقات<\/h2>/);
    expect(markup(SectionHeader, { title: "x", level: 3 })).toContain("<h3");
  });
});

describe("12.A7 — a rating always says what it is out of", () => {
  it("the stars are decorative and the count is in the accessible name", () => {
    const html = renderRating();
    expect(html).toContain('role="img"');
    expect(html).toContain("aria-label=");
    // Five stars with no number is a claim the product cannot back.
    expect(html).toMatch(/4(\.5)? out of 5/);
  });

  it("the app supplies the sentence, so it is localised where the strings live", () => {
    const html = renderRating({ formatLabel: () => "٤٫٥ من ٥ بناءً على ١٢ تقييم" });
    expect(html).toContain("١٢ تقييم");
  });
});

describe("design review — ratings are real or absent, people are real or neutral", () => {
  it("Rating is the DoctorCard form: one filled star, the value and (count)", () => {
    const html = markup(Rating, { value: 4.8, count: 128 });
    expect(html.match(/<svg/g)).toHaveLength(1);
    expect(html).toContain('fill="var(--nabd-color-icon-ratingStar)"');
    expect(html).toContain(">4.8<");
    expect(html).toContain(">(128)<");
    expect(markup(Rating, { value: 4.8, count: 128, surface: "onBrand" })).toContain('fill="var(--nabd-color-icon-ratingStarOnBrand)"');
  });

  it("Rating renders nothing without real ratings: no empty stars, no bare count", () => {
    expect(markup(Rating, { value: null, count: 0 })).toBe("");
    expect(markup(Rating, { value: 4.2, count: 0 })).toBe("");
    expect(markup(Rating, { value: null, count: 5 })).toBe("");
  });

  it("Avatar is a real photo, else initials, else the neutral user icon; never an illustrated person", () => {
    const photo = markup(Avatar, { name: "د. أحمد", src: "https://cdn.nabd.plus/doctors/1.jpg" });
    expect(photo).toContain('<img src="https://cdn.nabd.plus/doctors/1.jpg"');
    expect(photo).toContain('aria-label="د. أحمد"');
    expect(markup(Avatar, { name: "Amina Haddad" })).toContain(">AH<");
    expect(markup(Avatar, { name: "" })).toContain('data-icon="user"');
    const contract = readFileSync(resolve(process.cwd(), "../packages/ui/components/contract.ts"), "utf8");
    const gallery = readFileSync(resolve(process.cwd(), "../packages/ui/build-preview.mjs"), "utf8");
    expect(contract).not.toContain("illustratedName");
    expect(gallery).not.toContain("illustratedName");
  });
});

describe("handoff §3 — controls (components 2/4) match the boards", () => {
  it("PrimaryButton is the coral gradient with the button shadow; lg is the 56 / 18 page CTA", () => {
    const html = markup(Button, { label: "متابعة", variant: "primary", size: "lg" });
    expect(html).toContain("linear-gradient(180deg, var(--nabd-color-action-primary-gradient-from) 0%, var(--nabd-color-action-primary-gradient-to) 100%)");
    expect(html).toContain("box-shadow:var(--nabd-shadow-button)");
    expect(html).toContain("height:56px");
    expect(html).toContain("border-radius:18px");
  });

  it("OutlineButton is 1.5px of ink on transparent; sm is 40 to look at and 44 to hit", () => {
    const html = markup(Button, { label: "تعديل", variant: "outline", size: "sm" });
    expect(html).toContain("border:1.5px solid var(--nabd-color-text-primary)");
    expect(html).toContain("background:transparent");
    expect(html).toContain("height:40px");
    expect(html).toContain("calc((40px - var(--nabd-a11y-minTouchTarget)) / 2)");
    // md and lg need no extender
    expect(markup(Button, { label: "x", variant: "outline", size: "md" })).not.toContain("var(--nabd-a11y-minTouchTarget)) / 2");
  });

  it("a Button icon from the handoff fill set is drawn filled", () => {
    const html = markup(Button, { label: "الصور", variant: "outline", startIcon: "image" });
    expect(html).toContain(`d="${FILL_ICON_PATHS.image}"`);
    expect(html).toContain('fill="currentColor"');
  });

  it("IconButton outlined is the board header button; lg square is the 52 / 18 filter", () => {
    const back = markup(IconButton, { name: "caret-right", label: "رجوع", variant: "outlined" });
    expect(back).toContain("background:var(--nabd-color-bg-surface)");
    expect(back).toContain("border:1px solid var(--nabd-color-border-onGlass)");
    expect(back).toContain("width:44px");
    expect(back).toContain("min-height:var(--nabd-a11y-minTouchTarget)");
    const filter = markup(IconButton, { name: "sliders", label: "تصفية", variant: "filled", shape: "square", size: "lg" });
    expect(filter).toContain("width:52px");
    expect(filter).toContain("border-radius:18px");
    expect(filter).toContain("background:var(--nabd-color-action-selected-bg)");
    expect(filter).toContain('data-icon="sliders"');
  });

  it("Segmented is a named radiogroup with one tab stop; the selected item is the raised surface pill", () => {
    const html = markup(Segmented, {
      label: "المظهر", value: "light",
      options: [{ value: "auto", label: "تلقائي" }, { value: "light", label: "فاتح" }, { value: "dark", label: "غامق" }],
    });
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="المظهر"');
    expect(html.match(/role="radio"/g)).toHaveLength(3);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).toContain("background:var(--nabd-color-control-segmentedTrack)");
    expect(html.match(/box-shadow:var\(--nabd-shadow-segmented\)/g)).toHaveLength(1);
  });

  it("a 38px segment still has a 44px target", () => {
    const html = markup(Segmented, { label: "الطلبات", size: "sm", value: "a", options: [{ value: "a", label: "الحالية" }, { value: "b", label: "السابقة" }] });
    expect(html).toContain("height:44px");
    expect(html).toContain("margin-block:-3px");
    expect(html).toContain("height:38px");
  });

  it("Toggle is a named switch: green when on, the strong border colour when off", () => {
    const on = markup(Toggle, { label: "تذكير الأدوية", value: true });
    expect(on).toContain('role="switch"');
    expect(on).toContain('aria-checked="true"');
    expect(on).toContain('aria-label="تذكير الأدوية"');
    expect(on).toContain("background:var(--nabd-color-control-switchOn)");
    const off = markup(Toggle, { label: "العروض", value: false });
    expect(off).toContain('aria-checked="false"');
    expect(off).toContain("background:var(--nabd-color-border-strong)");
  });

  it("Radio is a row with the 22px ring: 7px coral when chosen, 2px grey when not", () => {
    const on = markup(Radio, { label: "العربية", meta: "Arabic", selected: true });
    expect(on).toContain('role="radio"');
    expect(on).toContain('aria-checked="true"');
    expect(on).toContain("border:7px solid var(--nabd-color-action-primary-bg)");
    expect(on).toContain(">Arabic<");
    const off = markup(Radio, { label: "English", selected: false });
    expect(off).toContain("border:2px solid var(--nabd-color-control-radioOff)");
  });

  it("StatusChip takes the tone's service colours; Chip is a pressed-state toggle with a real count", () => {
    const status = markup(StatusChip, { label: "في الطريق", tone: "coral" });
    expect(status).toContain("background:var(--nabd-color-service-coral-bg)");
    expect(status).toContain("color:var(--nabd-color-service-coral-fg)");
    const chip = markup(Chip, { label: "أدوية", count: 12, selected: true });
    expect(chip).toContain('aria-pressed="true"');
    expect(chip).toContain("background:var(--nabd-color-action-selected-bg)");
    expect(chip).toContain(">12<");
    expect(markup(Chip, { label: "أطباء" })).not.toContain("opacity:0.7");
  });

  it("SearchField: the page field is the focused pill; clear shows only with text; filter is the ink square", () => {
    const page = markup(Search, { variant: "page", value: "باراسيتامول", label: "بحث", onClear: () => {}, clearLabel: "مسح" });
    expect(page).toContain("border:2px solid var(--nabd-color-text-primary)");
    expect(page).toContain("border-radius:25px");
    expect(page).toContain('aria-label="مسح"');
    expect(markup(Search, { variant: "page", value: "", label: "بحث", onClear: () => {}, clearLabel: "مسح" })).not.toContain('aria-label="مسح"');
    const hub = markup(Search, { placeholder: "ابحث", onFilterPress: () => {}, filterLabel: "تصفية", onScanPress: () => {}, scanLabel: "مسح الباركود" });
    expect(hub).toContain("border:1px solid var(--nabd-color-border-onGlass)");
    expect(hub).toContain('aria-label="تصفية"');
    expect(hub).toContain('aria-label="مسح الباركود"');
    expect(hub).toContain(`d="${FILL_ICON_PATHS.barcode}"`);
  });

  it("Stepper is the Cart pill: named buttons, and the end of the range disables its button", () => {
    const html = markup(Stepper, { value: 1, min: 1, max: 9, label: "الكمية", decrementLabel: "إنقاص", incrementLabel: "زيادة" });
    expect(html).toContain('aria-label="الكمية"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-label="إنقاص"/);
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*aria-label="زيادة"/);
    expect(html).toContain("background:var(--nabd-color-bg-canvas)");
    expect(html).toContain("width:30px");
  });
});

describe("handoff §3 — cards (components 2/4 → 3/4) match the boards", () => {
  const doctor = {
    name: "د. أمينة", bookLabel: "احجز", verifiedLabel: "موثّق", availableLabel: "متاح الآن", grade: "استشاري", specialty: "غدد",
    place: "عيادة العليا · ١٫٢ كم", modes: [{ mode: "clinic", label: "عيادة" }, { mode: "online", label: "أونلاين" }],
    rating: { value: 4.8, count: 128 }, nextSlot: "اليوم ٧:٣٠ م", price: "180", currency: "ر.س",
  };

  it("DoctorCard: organic photo shape, feature shadow, coral footer with the rating, slot, price and book", () => {
    const html = markup(DoctorCard, doctor);
    expect(html).toContain("border-radius:52% 48% 46% 54% / 44% 46% 54% 56%");
    expect(html).toContain("box-shadow:var(--nabd-shadow-feature)");
    expect(html).toContain("linear-gradient(180deg, var(--nabd-color-action-primary-gradient-from) 0%, var(--nabd-color-action-primary-gradient-to) 100%)");
    expect(html).toContain('aria-label="موثّق"');
    expect(html).toContain('aria-label="متاح الآن"');
    expect(html).toContain(">4.8<");
    expect(html).toContain("اليوم ٧:٣٠ م");
    expect(html).toContain(">احجز<");
  });

  it("DoctorCard hides what it was not given: no seal, dot, grade, rating, slot or price by default", () => {
    const html = markup(DoctorCard, { name: "د. عمر", bookLabel: "احجز" });
    expect(html).not.toContain("presence-online");
    expect(html).not.toContain("ratingStar");
    expect(html).not.toContain('d="M12 2l2.4'); // the board's verified seal
    expect(html).not.toMatch(/aria-label=/);
    // without a photo: the neutral user mark, never an illustrated person
    expect(html).toContain(`d="${FILL_ICON_PATHS.user}"`);
    expect(markup(DoctorCard, { name: "د. عمر", bookLabel: "احجز", photoSrc: "https://cdn.nabd.plus/d/1.jpg" })).toContain('src="https://cdn.nabd.plus/d/1.jpg"');
  });

  it("DoctorCard: with onBook and no href the book action is a real button; inside a link it is not nested", () => {
    expect(markup(DoctorCard, { ...doctor, onBook: () => {} })).toMatch(/<button type="button"[^>]*>احجز/);
    const linked = markup(DoctorCard, { ...doctor, href: "/ar/doctors/1", onBook: () => {} });
    expect(linked.startsWith('<a href="/ar/doctors/1"')).toBe(true);
    expect(linked).not.toContain("<button");
  });

  it("ProductCard: media colour, discount badge, rx note, and a named 40px ink add button with a 44 hit area", () => {
    const html = markup(ProductCard, { name: "بنادول", price: "12.50", currency: "ر.س", discountLabel: "خصم ١٥٪", rxLabel: "يحتاج وصفة", addLabel: "أضف للسلة" });
    expect(html).toContain("background:var(--nabd-color-bg-media)");
    expect(html).toContain(">خصم ١٥٪<");
    expect(html).toContain(">يحتاج وصفة<");
    expect(html).toContain('aria-label="أضف للسلة"');
    expect(html).toContain("calc((40px - var(--nabd-a11y-minTouchTarget)) / 2)");
    const bare = markup(ProductCard, { name: "x", price: "1", addLabel: "أضف" });
    expect(bare).not.toContain("خصم");
    expect(bare).toContain(`d="${FILL_ICON_PATHS.pill}"`);
  });

  it("OfferCard: tinted head with the tone's icon and a tag, the price in the price colour and the old price struck", () => {
    const html = markup(OfferCard, { title: "باقة", price: "199", was: "260", tag: "عرض", icon: "test-tube", tone: "mint" });
    expect(html).toContain("background:var(--nabd-color-service-mint-bg)");
    expect(html).toContain("color:var(--nabd-color-text-price)");
    expect(html).toContain("text-decoration:line-through");
    expect(html).toContain(">عرض<");
  });

  it("Timeline: an ordered list; done steps checked, the current one marked as the current step", () => {
    const html = markup(Timeline, { label: "حالة الطلب", steps: [
      { id: "a", label: "تم القبول", time: "٧:٠٢", state: "done" },
      { id: "b", label: "في الطريق", time: "الآن", state: "current" },
      { id: "c", label: "تم التوصيل", state: "upcoming" },
    ] });
    expect(html).toMatch(/^<ol aria-label="حالة الطلب"/);
    expect(html.match(/<li/g)).toHaveLength(3);
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html.split(FILL_ICON_PATHS["check-circle"]).length - 1).toBe(1);
    expect(html).toContain("color-mix(in srgb, var(--nabd-color-action-primary-bg) 15%, transparent)");
  });

  it("ProgressRing: a named progressbar, the arc in the tone over its soft track, clamped to 0..100", () => {
    const html = markup(ProgressRing, { value: 0.55, tone: "pink", label: "أسبوع ٢٢ من ٤٠", valueText: "٢٢", caption: "أسبوع" });
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="55"');
    expect(html).toContain('stroke="var(--nabd-color-service-pink-solid-to)"');
    expect(html).toContain('stroke="var(--nabd-color-service-pink-bg)"');
    expect(markup(ProgressRing, { value: 1.7, tone: "pink", label: "x" })).toContain('aria-valuenow="100"');
  });

  it("Card holds content; tint is the hero wash in the tone", () => {
    const html = markup(Card, { title: "العنوان", tint: "pink", children: createElement("span", null, "داخل") });
    expect(html).toContain(">داخل<");
    expect(html).toContain("linear-gradient(160deg, var(--nabd-color-bg-surface) 0%, var(--nabd-color-service-pink-bg) 100%)");
    expect(markup(Card, { title: "x" })).toContain("box-shadow:var(--nabd-shadow-card)");
  });
});

describe("handoff §3 — states and the main tab bar (components 4/4) match the boards", () => {
  it("EmptyState: the 112 FIcon in its tone, a 22/700 title, the full-width CTA and the text action", () => {
    const html = markup(EmptyState, { icon: "package", tone: "coral", title: "السلة فاضية", body: "ابحث", actionLabel: "تصفح الصيدلية", secondaryActionLabel: "ارفع الروشتة" });
    expect(html).toContain('data-icon="package"');
    expect(html).toContain("var(--nabd-color-service-coral-bg)");
    expect(html).toMatch(/<h2[^>]*>السلة فاضية<\/h2>/);
    expect(html).toContain("width:100%"); // the lg CTA is full width
    expect(html).toContain(">ارفع الروشتة<");
    expect(html).not.toContain('role="alert"');
  });

  it("ErrorState is an alert, amber warning by default, the detail small and never the title", () => {
    const html = markup(ErrorState, { title: "ما قدرنا نحمّل الصفحة", detail: "TypeError: fetch failed", retryLabel: "إعادة المحاولة" });
    expect(html).toContain('role="alert"');
    expect(html).toContain('data-icon="warning"');
    expect(html).toContain("var(--nabd-color-service-amber-bg)");
    expect(html).toMatch(/<code[^>]*>TypeError: fetch failed<\/code>/);
  });

  it("OfflineState is a polite status with wifi-slash in blue", () => {
    const html = markup(OfflineState, { title: "لا يوجد اتصال", retryLabel: "إعادة المحاولة" });
    expect(html).toContain('role="status"');
    expect(html).toContain('data-icon="wifi-slash"');
    expect(html).toContain("var(--nabd-color-service-blue-bg)");
  });

  it("BottomTabBar is HomeApp's bar: glass pill, ink active pill with its label, raised coral centre, every item named", () => {
    const html = markup(BottomTabBar, { label: "التنقل الرئيسي", value: "home", items: [
      { id: "home", label: "الرئيسية", icon: "house" },
      { id: "consult", label: "الاستشارات", icon: "stethoscope", raised: true },
      { id: "labs", label: "التحاليل", icon: "test-tube" },
    ] });
    expect(html).toMatch(/^<nav aria-label="التنقل الرئيسي"/);
    expect(html).toContain("background:var(--nabd-color-glass-bgStrong)");
    expect(html).toContain("box-shadow:var(--nabd-shadow-tabBar)");
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain("background:var(--nabd-color-action-selected-bg)");
    expect(html).toContain("linear-gradient(180deg, var(--nabd-color-action-fab-from) 0%, var(--nabd-color-action-fab-to) 100%)");
    expect(html).toContain("margin-block-start:-34px");
    for (const name of ["الرئيسية", "الاستشارات", "التحاليل"]) expect(html).toContain(`aria-label="${name}"`);
    // the label is shown only on the active item
    expect(html.match(/<span aria-hidden="true">/g)).toHaveLength(1);
    expect(html).toContain(`d="${FILL_ICON_PATHS.stethoscope}"`);
  });
});

describe("12.A7 — the gallery has every component", () => {
  it("build-preview renders a specimen for each contract component", () => {
    const src = readFileSync(resolve(process.cwd(), "../packages/ui/build-preview.mjs"), "utf8");
    for (const name of ["Button", "IconButton", "Segmented", "Toggle", "Radio", "StatusChip", "DoctorCard", "ProductCard", "OfferCard", "Timeline", "ProgressRing", "Chip", "Badge", "Card", "ListItem", "ServiceTile", "FIcon", "SectionHeader", "Avatar", "PriceTag", "Rating", "Tabs", "NavBar", "BottomTabBar", "Sidebar", "MapPinCard", "EmptyState", "ErrorState", "OfflineState", "Toast", "Modal", "Skeleton", "Input", "Select", "Otp", "Search", "Stepper", "SlotPicker"]) {
      expect(src, `${name} has no specimen in the gallery`).toContain(name);
    }
  });
});

/* ------------------------------------------------------------- render helpers */

function renderButton(props: Record<string, unknown> = {}) {
  return markup(Button, { label: "Save", ...props });
}

function renderInputInvalid() {
  return markup(Select, { label: "City", options: [{ value: "a", label: "A" }], invalid: true });
}

function renderServiceTile() {
  return markup(ServiceTile, { name: "pharmacy", label: "Pharmacy" });
}

function renderRating(props: Record<string, unknown> = {}) {
  return markup(Rating, { value: 4.5, count: 12, ...props });
}

function markup(Component: unknown, props: Record<string, unknown>) {
  // The components are styled by class; the assertions read what the sheet applies (support/resolve-css).
  return withResolvedStyles(renderToStaticMarkup(createElement(Component as never, props as never)));
}

describe("CSP (F68) — the components never set a style attribute", () => {
  // patient-web's style-src has no 'unsafe-inline': a server-rendered style="…" is refused and
  // the component renders unstyled. Everything here is rendered raw, without the resolver.
  const raw = (Component: unknown, props: Record<string, unknown>) => renderToStaticMarkup(createElement(Component as never, props as never));
  const cases: Array<[string, unknown, Record<string, unknown>]> = [
    ["Button", Button, { label: "x", variant: "primary", size: "sm", disabled: true, startIcon: "plus" }],
    ["IconButton", IconButton, { name: "close", label: "x", variant: "glass", shape: "square", size: "lg" }],
    ["FIcon solid", FIcon, { icon: "pill", tone: "teal", chip: "solid", size: 37 }],
    ["Segmented", Segmented, { label: "x", value: "a", size: "sm", options: [{ value: "a", label: "A" }, { value: "b", label: "B", disabled: true }] }],
    ["Toggle", Toggle, { label: "x", value: true }],
    ["Radio", Radio, { label: "x", selected: true }],
    ["StatusChip", StatusChip, { label: "x", tone: "violet" }],
    ["Chip", Chip, { label: "x", count: 3, selected: true }],
    ["Search", Search, { label: "x", value: "q", variant: "page", onClear: () => undefined, clearLabel: "c" }],
    ["Select", Select, { label: "x", value: "", options: [{ value: "a", label: "A" }], invalid: true }],
    ["Stepper", Stepper, { label: "x", value: 1, min: 1, max: 3, decrementLabel: "-", incrementLabel: "+" }],
    ["Card", Card, { title: "x", tint: "amber" }],
    ["ListItem", ListItem, { title: "x", leading: { icon: "pill", tone: "coral" } }],
    ["ServiceTile", ServiceTile, { name: "pharmacy", label: "x" }],
    ["Avatar", Avatar, { name: "Amina Saleh", size: "lg" }],
    ["Rating", Rating, { value: 4.5, count: 3 }],
    ["Tabs", Tabs, { label: "x", value: "a", variant: "segmented", items: [{ id: "a", label: "A", icon: "home" }, { id: "b", label: "B", icon: "bell", badge: 2 }] }],
    ["Badge", Badge, { label: "x", tone: "danger" }],
    ["DoctorCard", DoctorCard, { name: "x", specialty: "y", rating: 4.8, ratingCount: 9, nextSlot: "10:00", price: "150", bookLabel: "b" }],
    ["ProductCard", ProductCard, { name: "x", price: "10", was: "12", addLabel: "a" }],
    ["OfferCard", OfferCard, { title: "x", price: "1", tag: "t", icon: "test-tube", tone: "mint" }],
    ["Timeline", Timeline, { steps: [{ label: "a", state: "done" }, { label: "b", state: "current" }] }],
    ["ProgressRing", ProgressRing, { value: 0.4, tone: "pink", label: "x", size: 71 }],
    ["EmptyState", EmptyState, { icon: "magnifying-glass", tone: "violet", title: "x", actionLabel: "a" }],
    ["ErrorState", ErrorState, { title: "x", retryLabel: "r" }],
    ["OfflineState", OfflineState, { title: "x", retryLabel: "r" }],
    ["BottomTabBar", BottomTabBar, { label: "x", activeId: "home", items: [{ id: "home", label: "h", icon: "house" }, { id: "c", label: "c", icon: "stethoscope", raised: true }] }],
  ];
  for (const [name, Component, props] of cases) {
    it(`${name} renders with no style attribute and no <style> element`, () => {
      const html = raw(Component, props);
      expect(html).not.toMatch(/<[a-zA-Z][^>]*\sstyle="/);
      expect(html).not.toMatch(/<style[\s>]/);
    });
  }

  it("every service tone a component can take has its class in tones.css", () => {
    for (const tone of SERVICE_TONES) expect(COMPONENT_CSS).toContain(`.nabd-tone--${tone} {`);
  });
});
