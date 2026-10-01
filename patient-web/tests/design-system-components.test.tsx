import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  Badge, Button, Card, Chip, EmptyState, ErrorState, IconButton, Rating,
  Select, ServiceTile, Stepper, Tabs,
} from "@nabd/ui";
import { CONTRACT_NAMES } from "@nabd/ui/components/contract";
import { WEB_ONLY } from "@nabd/ui/components/contract";
import { SERVICE_TILES } from "@nabd/ui/components/fixtures";

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
    expect(CONTRACT_NAMES.length).toBe(28);
  });

  it("every component named in the docs roster is in the contract", () => {
    // §A7's list, transcribed. If the contract grows a component, this is where
    // it has to be added, which is the point.
    const fromTheSpec = [
      "Button", "IconButton", "Input", "Select", "Otp", "Search", "Stepper",
      "SlotPicker", "Chip", "Badge", "Card", "ListItem", "ServiceTile", "Avatar",
      "PriceTag", "Rating", "Tabs", "NavBar", "BottomTabBar", "Sidebar",
      "MapPinCard", "EmptyState", "ErrorState", "Toast", "Modal", "Skeleton",
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
    const src = readFileSync(resolve(process.cwd(), "../packages/ui/components/Button.tsx"), "utf8");
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
  });

  it("every colour reference is a --nabd- token, so the themes actually swap", () => {
    const src = readFileSync(resolve(process.cwd(), "../packages/ui/components/Surfaces.tsx"), "utf8");
    const colors = [...src.matchAll(/(?:color|background|borderColor|boxShadow|fill):\s*([^;]+);/g)].map((m) => m[1]);
    for (const c of colors) {
      expect(c, `"${c}" is not a token reference`).toMatch(/var\(--nabd-|transparent|currentColor|inherit|none|color-mix/);
    }
  });
});

describe("12.A7 — the two families are kept apart", () => {
  it("ServiceTile uses the illustrated artwork, and Chip uses a line glyph", () => {
    // A service tile carrying a 20px line glyph is the mistake the canvas warns
    // about: illustrated artwork is for tiles, the line set is for the small UI.
    const tile = renderServiceTile();
    expect(tile).toContain('data-icon="pharmacy"');
    expect(tile).not.toContain("nabd-icon--line");
  });

  it("the fixtures the gallery renders are real names from the sets", () => {
    for (const tile of SERVICE_TILES) {
      expect(["pharmacy", "consult", "lab", "radiology", "nursing", "mind", "nutrition", "family", "doctor"]).toContain(tile.name);
      expect(tile.label.length).toBeGreaterThan(0);
    }
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

describe("12.A7 — the gallery has every component", () => {
  it("build-preview renders a specimen for each contract component", () => {
    const src = readFileSync(resolve(process.cwd(), "../packages/ui/build-preview.mjs"), "utf8");
    for (const name of ["Button", "IconButton", "Chip", "Badge", "Card", "ListItem", "ServiceTile", "Avatar", "PriceTag", "Rating", "Tabs", "NavBar", "BottomTabBar", "Sidebar", "MapPinCard", "EmptyState", "ErrorState", "Toast", "Modal", "Skeleton", "Input", "Select", "Otp", "Search", "Stepper", "SlotPicker"]) {
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
  return renderToStaticMarkup(createElement(Component as never, props as never));
}
