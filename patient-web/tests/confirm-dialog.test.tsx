// 17.2: the one confirm dialog for an action the patient cannot take back. Closed it draws nothing; open it is an
// alert dialog named by its title, with the cancel button first and the confirm answer labelled by the caller.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

const { ConfirmDialog } = await import("@/components-next/confirm/confirm-dialog");

const handlers = { onConfirm: () => undefined, onCancel: () => undefined };

describe("ConfirmDialog", () => {
  it("draws nothing while closed", () => {
    const html = renderToStaticMarkup(<ConfirmDialog open={false} title="Cancel?" confirmLabel="Yes" cancelLabel="No" {...handlers} />);
    expect(html).toBe("");
  });

  it("opens as an alert dialog named by its title, with the body linked when there is one", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog open title="Cancel the order?" body="It cannot be undone." confirmLabel="Yes" cancelLabel="Keep" {...handlers} />,
    );
    expect(html).toContain('role="alertdialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toMatch(/aria-labelledby="([^"]+)"/);
    expect(html).toContain("Cancel the order?");
    expect(html).toContain('aria-describedby="');
    expect(html).toContain("It cannot be undone.");
  });

  it("puts cancel before confirm, and a destructive confirm uses the danger variant", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog open title="Delete?" confirmLabel="Delete" cancelLabel="Keep" destructive {...handlers} />,
    );
    expect(html.indexOf(">Keep<")).toBeLessThan(html.indexOf(">Delete<"));
    expect(html).toContain('data-variant="danger"');
  });

  it("leaves out the description link when there is no body", () => {
    const html = renderToStaticMarkup(<ConfirmDialog open title="Sure?" confirmLabel="Yes" cancelLabel="No" {...handlers} />);
    expect(html).not.toContain("aria-describedby");
  });
});
