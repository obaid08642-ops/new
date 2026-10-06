import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { LoginForm } from "../components-next/login-form";

describe("LoginForm", () => {
  it("renders accessible credential controls without embedding sandbox credentials", () => {
    const html = renderToStaticMarkup(<LoginForm locale="en" />);
    expect(html).toContain('autoComplete="username"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain('type="password"');
    expect(html).toContain("submit</button>");
    expect(html).not.toContain("Sandbox@123");
    expect(html).not.toContain("patient.sandbox@nabd.plus");
  });

  it("does not expose internal Sandbox guidance on the production sign-in page", () => {
    const page = readFileSync(resolve(process.cwd(), "app/[locale]/login/page.tsx"), "utf8");

    expect(page).not.toContain('t("sandboxNote")');
    expect(page).not.toContain("Sandbox@");
  });
});
