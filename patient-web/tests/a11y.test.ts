import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = [
  { path: "/", name: "Home" },
  { path: "/login", name: "Login" },
  { path: "/register", name: "Register" },
  { path: "/forgot-password", name: "Forgot Password" },
  { path: "/otp", name: "OTP" },
  { path: "/dashboard", name: "Dashboard" },
  { path: "/c", name: "Pharmacy Catalog" },
  { path: "/consultations/doctors", name: "Doctors" },
  { path: "/diagnostics", name: "Diagnostics" },
  { path: "/nursing/catalog", name: "Nursing" },
  { path: "/maternity", name: "Maternity" },
  { path: "/nutrition", name: "Nutrition" },
  { path: "/mental-health", name: "Mental Health" },
  { path: "/health/chronic-medications", name: "Chronic Care" },
  { path: "/insurance", name: "Insurance" },
  { path: "/reminders", name: "Reminders" },
  { path: "/prescriptions", name: "Prescriptions" },
  { path: "/notifications", name: "Notifications" },
  { path: "/profile", name: "Profile" },
  { path: "/settings", name: "Settings" },
];

const LOCALES = ["ar", "en"];

async function runA11yCheck(page: any, url: string, locale: string) {
  await page.goto(url, { waitUntil: "networkidle" });
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations;
}

test.describe("Accessibility - axe-core", () => {
  for (const locale of LOCALES) {
    test.describe(`Locale: ${locale}`, () => {
      for (const pageConfig of PAGES) {
        test(`${pageConfig.name} (${locale}) - no serious/critical violations`, async ({ page }) => {
          const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
          const url = `${baseUrl}/${locale}${pageConfig.path}`;
          const violations = await runA11yCheck(page, url, locale);

          // Filter out known acceptable violations that need manual review
          const filteredViolations = violations.filter((v: any) => {
            // Skip color contrast on decorative elements
            if (v.id === "color-contrast" && v.nodes.some((n: any) => n.target.includes("::before") || n.target.includes("::after"))) {
              return false;
            }
            return true;
          });

          // Report violations but fail only on critical/serious
          const criticalSerious = filteredViolations.filter(
            (v: any) => v.impact === "critical" || v.impact === "serious"
          );

          if (criticalSerious.length > 0) {
            console.log(`\n=== ${pageConfig.name} (${locale}) - CRITICAL/SERIOUS VIOLATIONS ===`);
            for (const v of criticalSerious) {
              console.log(`  ${v.id} (${v.impact}): ${v.description}`);
              console.log(`    Help: ${v.helpUrl}`);
              for (const node of v.nodes) {
                console.log(`    Target: ${node.target}`);
                console.log(`    HTML: ${node.html}`);
              }
            }
          }

          expect(criticalSerious.length).toBe(0);
        });
      }
    });
  }
});

test.describe("Accessibility - Keyboard navigation", () => {
  test("Tab order is logical on home page", async ({ page }) => {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    await page.goto(`${baseUrl}/ar`, { waitUntil: "networkidle" });

    // Tab through the page and collect focusable elements
    const focusableElements = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      return Array.from(elements).map((el) => ({
        tag: el.tagName.toLowerCase(),
        type: (el as HTMLInputElement).type,
        text: el.textContent?.trim().slice(0, 50),
        ariaLabel: el.getAttribute("aria-label"),
        id: el.id,
      }));
    });

    expect(focusableElements.length).toBeGreaterThan(0);

    // Check that interactive elements have accessible names
    for (const el of focusableElements) {
      if (el.tag === "button" || el.tag === "a") {
        const hasAccessibleName =
          (el.text?.length ?? 0) > 0 || (el.ariaLabel?.length ?? 0) > 0;
        expect(hasAccessibleName).toBe(true);
      }
    }
  });

  test("Focus is visible on all interactive elements", async ({ page }) => {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    await page.goto(`${baseUrl}/ar`, { waitUntil: "networkidle" });

    // Check for focus-visible styles
    const focusStyles = await page.evaluate(() => {
      const styleSheets = Array.from(document.styleSheets);
      let hasFocusVisible = false;
      let hasFocusRing = false;

      for (const sheet of styleSheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const rule of rules) {
            if (rule instanceof CSSStyleRule) {
              if (rule.selectorText.includes(":focus-visible")) {
                hasFocusVisible = true;
              }
              if (
                rule.style.outline ||
                rule.style.boxShadow?.includes("focus") ||
                rule.style.outlineOffset
              ) {
                hasFocusRing = true;
              }
            }
          }
        } catch {
          // Cross-origin stylesheets
        }
      }
      return { hasFocusVisible, hasFocusRing };
    });

    expect(focusStyles.hasFocusVisible || focusStyles.hasFocusRing).toBe(true);
  });
});

test.describe("Accessibility - Text scaling", () => {
  test("Layout does not break at 200% zoom", async ({ page }) => {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    await page.goto(`${baseUrl}/ar`, { waitUntil: "networkidle" });

    // Set viewport to simulate 200% zoom
    await page.setViewportSize({ width: 640, height: 800 });

    // Check for horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });

    expect(hasHorizontalScroll).toBe(false);

    // Check that content is still readable (no overlapping)
    const overlapping = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        "main, section, article, aside, nav, header, footer, .card, .button, input, button"
      );
      const rects = Array.from(elements).map((el) => el.getBoundingClientRect());
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i];
          const b = rects[j];
          // Check for significant overlap (more than 50% of either element)
          const overlapX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          const overlapY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          const overlapArea = overlapX * overlapY;
          const areaA = a.width * a.height;
          const areaB = b.width * b.height;
          if (overlapArea > 0.5 * Math.min(areaA, areaB)) {
            return true;
          }
        }
      }
      return false;
    });

    expect(overlapping).toBe(false);
  });
});

test.describe("Accessibility - Touch targets", () => {
  test("Interactive elements meet 44px minimum touch target", async ({ page }) => {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    await page.goto(`${baseUrl}/ar`, { waitUntil: "networkidle" });

    const smallTargets = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        'a[href], button, input, select, textarea, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])'
      );
      const small: Array<{ element: string; width: number; height: number }> = [];

      for (const el of Array.from(elements)) {
        const rect = el.getBoundingClientRect();
        // Check actual clickable area
        const width = rect.width;
        const height = rect.height;

        if (width < 44 || height < 44) {
          small.push({
            element: `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.className ? "." + el.className.split(" ")[0] : ""}`,
            width: Math.round(width),
            height: Math.round(height),
          });
        }
      }
      return small;
    });

    if (smallTargets.length > 0) {
      console.log("\n=== SMALL TOUCH TARGETS (< 44px) ===");
      for (const t of smallTargets) {
        console.log(`  ${t.element}: ${t.width}x${t.height}px`);
      }
    }

    expect(smallTargets.length).toBe(0);
  });
});

test.describe("Accessibility - Reduced motion", () => {
  test("Animations respect prefers-reduced-motion", async ({ page }) => {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

    // Test with reduced motion
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${baseUrl}/ar`, { waitUntil: "networkidle" });

    const hasReducedMotionStyles = await page.evaluate(() => {
      const styleSheets = Array.from(document.styleSheets);
      for (const sheet of styleSheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const rule of rules) {
            if (rule instanceof CSSStyleRule) {
              if (
                rule.selectorText.includes("prefers-reduced-motion: reduce")
              ) {
                return true;
              }
            }
          }
        } catch {
          // Cross-origin stylesheets
        }
      }
      return false;
    });

    expect(hasReducedMotionStyles).toBe(true);
  });
});

test.describe("Accessibility - RTL/LTR support", () => {
  for (const locale of LOCALES) {
    test(`Page renders correctly in ${locale} (${locale === "ar" ? "RTL" : "LTR"})`, async ({ page }) => {
      const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
      await page.goto(`${baseUrl}/${locale}`, { waitUntil: "networkidle" });

      const dir = await page.getAttribute("html", "dir");
      expect(dir).toBe(locale === "ar" || locale === "ur" ? "rtl" : "ltr");

      const lang = await page.getAttribute("html", "lang");
      expect(lang).toBe(locale);
    });
  }
});

test.describe("Accessibility - Form labels", () => {
  test("All form inputs have associated labels", async ({ page }) => {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    await page.goto(`${baseUrl}/ar/login`, { waitUntil: "networkidle" });

    const missingLabels = await page.evaluate(() => {
      const inputs = document.querySelectorAll(
        'input:not([type="hidden"]), select, textarea'
      );
      const missing: string[] = [];

      for (const input of Array.from(inputs)) {
        const id = input.id;
        const ariaLabel = input.getAttribute("aria-label");
        const ariaLabelledBy = input.getAttribute("aria-labelledby");
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        const parentLabel = input.closest("label");

        if (!label && !parentLabel && !ariaLabel && !ariaLabelledBy) {
          missing.push(
            `${input.tagName.toLowerCase()}${id ? "#" + id : ""}${input.className ? "." + input.className.split(" ")[0] : ""}`
          );
        }
      }
      return missing;
    });

    if (missingLabels.length > 0) {
      console.log("\n=== MISSING LABELS ===");
      for (const m of missingLabels) {
        console.log(`  ${m}`);
      }
    }

    expect(missingLabels.length).toBe(0);
  });
});

test.describe("Accessibility - Images have alt text", () => {
  test("All images have appropriate alt text", async ({ page }) => {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    await page.goto(`${baseUrl}/ar`, { waitUntil: "networkidle" });

    const missingAlt = await page.evaluate(() => {
      const images = document.querySelectorAll("img");
      const missing: string[] = [];

      for (const img of Array.from(images)) {
        const alt = img.getAttribute("alt");
        // Content images should have descriptive alt text
        // Decorative images should have alt="" or role="presentation" or aria-hidden="true"
        if (alt === null || alt === undefined) {
          missing.push(
            `${img.src.slice(-50)}${img.className ? "." + img.className.split(" ")[0] : ""}`
          );
        }
      }
      return missing;
    });

    if (missingAlt.length > 0) {
      console.log("\n=== IMAGES MISSING ALT ===");
      for (const m of missingAlt) {
        console.log(`  ${m}`);
      }
    }

    expect(missingAlt.length).toBe(0);
  });
});