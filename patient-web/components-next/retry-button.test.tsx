import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: state.refresh }) }));
vi.mock("next-intl", () => ({ useTranslations: () => () => "retry" }));

import { RetryButton } from "./retry-button";

describe("RetryButton", () => {
  it("renders a localized, non-submit recovery control", () => {
    const html = renderToStaticMarkup(<RetryButton />);

    expect(html).toContain('type="button"');
    expect(html).toContain(">retry<");
    expect(html).not.toContain("token");
  });
});
