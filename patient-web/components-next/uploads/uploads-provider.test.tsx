// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { UploadsGate, UploadsProvider, useUploadsEnabled } from "./uploads-provider";

const messages = { Shared: { uploadsUnavailable: "Uploads are off" } };
const wrap = (enabled: boolean | undefined) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {enabled === undefined ? <UploadsGate><button>pick a file</button></UploadsGate> : <UploadsProvider enabled={enabled}><UploadsGate><button>pick a file</button></UploadsGate></UploadsProvider>}
    </NextIntlClientProvider>,
  );

describe("uploads gate", () => {
  it("shows the upload control while uploads are on", () => {
    wrap(true);
    expect(screen.getByText("pick a file")).toBeTruthy();
  });
  it("shows the notice instead of the control when the backend says uploads are off", () => {
    wrap(false);
    expect(screen.queryByText("pick a file")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("Uploads are off");
  });
  it("fails open without a provider", () => {
    wrap(undefined);
    expect(screen.getByText("pick a file")).toBeTruthy();
    expect(typeof useUploadsEnabled).toBe("function");
  });
});
